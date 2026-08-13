import { useRef } from "react";
import { Group, Image as KonvaImage, Rect, Ellipse, Circle, Text } from "react-konva";
import type Konva from "konva";
import { computeObjectFit, shrinkTextToFit, type Layer } from "@card-studio/scene-schema";
import { EDITOR_DPI, mmToStagePx } from "../geometry";
import { useHtmlImage } from "../hooks/useHtmlImage";
import { useHtmlImages } from "../hooks/useHtmlImages";
import { useFontsReady } from "../hooks/useFontsReady";
import { useAlphaHitCache } from "../hooks/useAlphaHitCache";
import { getFrameAssetUrl } from "../frameAssets";
import { getRarityAssetUrl } from "../rarityAssets";
import { getSymbolAssetUrl, isGenericManaToken } from "../symbolAssets";

interface LayerNodeProps {
  layer: Layer;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  registerRef: (node: Konva.Node | null) => void;
  onDragStart: () => void;
  onDragMove: (node: Konva.Node) => void;
  onDragEnd: (node: Konva.Node) => void;
  /** True while space-to-pan is active: layers must not be draggable, or a
   * space+drag on top of one would fight with Konva's own node dragging. */
  panModeActive: boolean;
}

// Reused across renders/layers rather than allocated per-node — this
// canvas is never attached to the DOM, it only exists to measure text via
// the same 2D canvas text API @napi-rs/canvas uses server-side (see
// shrinkTextToFit's doc comment for why the algorithm is shared).
let measureCtx: CanvasRenderingContext2D | null = null;
function getMeasureCtx(): CanvasRenderingContext2D {
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d")!;
  return measureCtx;
}

/** Renders one scene layer as Konva node(s). Position/transform math and
 * history commits live in CanvasStage — this component only forwards
 * gesture events for the node it owns. */
export function LayerNode({ layer, onSelect, registerRef, onDragStart, onDragMove, onDragEnd, panModeActive }: LayerNodeProps) {
  // Hooks must run unconditionally on every render of this instance.
  useFontsReady();
  const rarityAssetUrl = layer.type === "image" && layer.assetId ? getRarityAssetUrl(layer.assetId) : undefined;
  const image = useHtmlImage(layer.type === "image" ? (rarityAssetUrl ?? layer.src) : undefined);
  const frameAssetUrl = layer.type === "frame" ? getFrameAssetUrl(layer.assetId) : undefined;
  const frameImage = useHtmlImage(frameAssetUrl);

  // Clicking a transparent part of a frame (its art window, most notably)
  // or an image layer shouldn't select that layer — it should fall through
  // to whatever's underneath, the same as if the transparent layer weren't
  // there. Konva's default hit region for an Image is its whole rectangle
  // regardless of alpha, so both need an explicit alpha-aware hit cache;
  // see useAlphaHitCache's doc comment. drawHitFromCache is a Shape-only
  // method (Group/Container doesn't have it, since it draws nothing of its
  // own) — for the image layer, that means caching the inner <KonvaImage>
  // shape itself, not the wrapping Group the drag/select/transform handlers
  // live on; that's fine, since a hit on a listening descendant still
  // bubbles up to fire the Group's onClick like any other Konva event.
  // Re-run whenever the loaded image or the layer's own box changes — the
  // cache is a rasterized snapshot, not live.
  const frameNodeRef = useRef<Konva.Image | null>(null);
  useAlphaHitCache(frameNodeRef, [frameImage, mmToStagePx(layer.width), mmToStagePx(layer.height)]);
  const imageShapeRef = useRef<Konva.Image | null>(null);
  useAlphaHitCache(imageShapeRef, [
    image,
    mmToStagePx(layer.width),
    mmToStagePx(layer.height),
    layer.type === "image" ? layer.fit : undefined,
  ]);

  const common = {
    id: layer.id,
    x: mmToStagePx(layer.x),
    y: mmToStagePx(layer.y),
    width: mmToStagePx(layer.width),
    height: mmToStagePx(layer.height),
    rotation: layer.rotationDeg,
    opacity: layer.opacity,
    draggable: !layer.locked && !panModeActive,
    visible: layer.visible,
    onClick: onSelect,
    onTap: onSelect,
    ref: registerRef,
    onDragStart,
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => onDragMove(e.target),
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => onDragEnd(e.target),
  };

  // Text layout (word-wrap [+ shrink-to-fit for "shrink" mode] + inline
  // {token} symbols) is computed unconditionally-in-shape (but
  // conditionally in content) for every text layer, not just "shrink" —
  // "clip" and "visible" resolve {token}s too now (the render service
  // already did this for all three modes; see README's "Inline symbols in
  // text"), they just never search for a smaller font size. "clip" keeps
  // its pre-existing no-wrap, single-line-per-"\n" behavior (previously
  // Konva's own wrap="none") by passing an unbounded maxWidthPx — only an
  // explicit newline starts a new line. This also means the
  // useHtmlImages call below — which must run every render, same as any
  // other hook — always has a real (possibly empty) src list to work from.
  let textLayout: ReturnType<typeof shrinkTextToFit> | null = null;
  let textFontStyle = "normal";
  // Applied to every drawn leaf of a text layer (glyph runs, symbol images,
  // and the generic-mana circle — but not that circle's own inner digit, to
  // avoid two overlapping shadows on one small icon) when shadowColor is
  // set; {} (no shadow props) otherwise. pt -> px at EDITOR_DPI, same
  // conversion fontSizePt uses, so the shadow's offset/blur read as the
  // same physical size on screen as in the print export.
  let textShadowProps: { shadowColor?: string; shadowOffsetX?: number; shadowOffsetY?: number; shadowBlur?: number; shadowOpacity?: number } = {};
  if (layer.type === "text") {
    const weight = layer.fontWeight === "bold" ? "bold" : "normal";
    const style = layer.italic ? "italic" : "normal";
    textFontStyle = [style === "italic" ? "italic" : "", weight === "bold" ? "bold" : ""].filter(Boolean).join(" ") || "normal";
    const ctx = getMeasureCtx();
    // pt -> px at the same DPI the layer's box was converted at (EDITOR_DPI),
    // not a fixed 96 — otherwise font size and box size scale differently
    // on screen than they will in the print export. Used as the fixed size
    // for "clip"/"visible"; "shrink" instead searches maxFontSizePx down to
    // minFontSizePx below.
    const nominalFontSizePx = (layer.fontSizePt / 72) * EDITOR_DPI;
    // maxFontSizePt (when set) is the search ceiling, not fontSizePt — lets
    // short content grow into that headroom instead of sitting fixed at
    // fontSizePt. Both are optional, template-defined "boundaries" (see
    // TextFieldTemplate), converted at EDITOR_DPI so they read the same
    // physical size on screen as they will in the print export.
    const maxFontSizePx = ((layer.maxFontSizePt ?? layer.fontSizePt) / 72) * EDITOR_DPI;
    const minFontSizePx = layer.minFontSizePt !== undefined ? (layer.minFontSizePt / 72) * EDITOR_DPI : undefined;
    textLayout = shrinkTextToFit({
      content: layer.content,
      startFontSizePx: layer.overflow === "shrink" ? maxFontSizePx : nominalFontSizePx,
      minFontSizePx: layer.overflow === "shrink" ? minFontSizePx : undefined,
      maxWidthPx: layer.overflow === "clip" ? Number.POSITIVE_INFINITY : mmToStagePx(layer.width),
      maxHeightPx: mmToStagePx(layer.height),
      lineHeightRatio: layer.lineHeight,
      shrink: layer.overflow === "shrink",
      setFontSizePx: (px) => {
        ctx.font = `${style} ${weight} ${px}px ${layer.fontFamily}`;
      },
      measureWidth: (text) => ctx.measureText(text).width,
      resolveSymbol: (token) => Boolean(getSymbolAssetUrl(token)) || isGenericManaToken(token),
      // Inline symbols render at fontSizePx by default; layer.symbolScale
      // (set only via TextFieldTemplate.symbolScale, e.g. for mana cost)
      // scales them relative to it. layoutText uses this same width for
      // wrapping, so the drawn size below (which reads each run's own
      // `width`) never disagrees with where lines actually broke.
      symbolWidth: (px) => px * (layer.symbolScale ?? 1),
      // Set only by the rules/flavor coupling (rulesFlavorFit.ts) to cut a
      // notch for power/toughness out of this layer's bottom-right — see
      // TextLayer's avoidFromYMm/avoidWidthMm doc comment. Unset for every
      // other field, same plain-rectangle wrap as before.
      avoidBelowYPx: layer.avoidFromYMm !== undefined ? mmToStagePx(layer.avoidFromYMm) : undefined,
      avoidWidthPx: layer.avoidWidthMm !== undefined ? mmToStagePx(layer.avoidWidthMm) : undefined,
    });
    if (layer.shadowColor) {
      const ptToPxEditor = (pt: number) => (pt / 72) * EDITOR_DPI;
      textShadowProps = {
        shadowColor: layer.shadowColor,
        shadowOffsetX: ptToPxEditor(layer.shadowOffsetXPt),
        shadowOffsetY: ptToPxEditor(layer.shadowOffsetYPt),
        shadowBlur: ptToPxEditor(layer.shadowBlurPt),
        shadowOpacity: layer.shadowOpacity,
      };
    }
  }
  const symbolUrls: string[] = [];
  if (textLayout) {
    for (const line of textLayout.lines) {
      for (const { run } of line.runs) {
        if (run.kind === "symbol" && !isGenericManaToken(run.text)) {
          const url = getSymbolAssetUrl(run.text);
          if (url) symbolUrls.push(url);
        }
      }
    }
  }
  const symbolImages = useHtmlImages(Array.from(new Set(symbolUrls)));

  if (layer.type === "frame") {
    if (frameAssetUrl && frameImage) {
      return (
        <KonvaImage
          {...common}
          image={frameImage}
          ref={(node) => {
            frameNodeRef.current = node;
            registerRef(node);
          }}
        />
      );
    }
    // Unresolved asset id (unknown/legacy) or still loading: flat-tint placeholder.
    return (
      <Group {...common}>
        <Rect
          width={common.width}
          height={common.height}
          fill={layer.tint ?? "#e5e7eb"}
          stroke="#9ca3af"
          dash={[6, 4]}
          strokeWidth={1}
        />
        <Text
          text={`frame: ${layer.assetId}`}
          width={common.width}
          height={common.height}
          align="center"
          verticalAlign="middle"
          fontSize={12}
          fill="#6b7280"
          listening={false}
        />
      </Group>
    );
  }

  if (layer.type === "text") {
    // textLayout is always populated for text layers now (see above) — every
    // overflow mode draws through this same run-based path, so {token}
    // symbols resolve identically in "shrink", "clip", and "visible".
    const { fontSizePx, lines } = textLayout!;
    const lineHeightPx = fontSizePx * layer.lineHeight;
    return (
      <Group {...common}>
        {lines.map((line, li) => {
          const lineY = li * lineHeightPx;
          const alignOffset =
            layer.align === "left" ? 0 : layer.align === "right" ? common.width - line.width : (common.width - line.width) / 2;
          return line.runs.map(({ run, x, width: runWidth }, ri) => {
            const drawX = alignOffset + x;
            const key = `${li}-${ri}`;
            if (run.kind === "text") {
              return (
                <Text
                  key={key}
                  x={drawX}
                  y={lineY}
                  text={run.text}
                  fontFamily={layer.fontFamily}
                  fontSize={fontSizePx}
                  fontStyle={textFontStyle}
                  fill={layer.color}
                  listening={false}
                  {...textShadowProps}
                />
              );
            }
            if (isGenericManaToken(run.text)) {
              // runWidth already carries symbolScale (see symbolWidth
              // above) — reused for height too, not fontSizePx, so the
              // circle stays square instead of stretching when scaled.
              return (
                <Group key={key} x={drawX} y={lineY} listening={false}>
                  <Circle radius={runWidth / 2} x={runWidth / 2} y={runWidth / 2} fill="#cccccc" {...textShadowProps} />
                  <Text
                    text={run.text}
                    width={runWidth}
                    height={runWidth}
                    align="center"
                    verticalAlign="middle"
                    fontSize={Math.round(runWidth * 0.62)}
                    fontStyle="bold"
                    fontFamily={layer.fontFamily}
                    fill="#000000"
                  />
                </Group>
              );
            }
            const url = getSymbolAssetUrl(run.text);
            const img = url ? symbolImages[url] : undefined;
            if (!img) return null;
            return (
              <KonvaImage
                key={key}
                x={drawX}
                y={lineY}
                width={runWidth}
                height={runWidth}
                image={img}
                listening={false}
                {...textShadowProps}
              />
            );
          });
        })}
      </Group>
    );
  }

  if (layer.type === "image") {
    const fit = image
      ? computeObjectFit(layer.fit, common.width, common.height, image.width, image.height)
      : { drawWidth: common.width, drawHeight: common.height, offsetX: 0, offsetY: 0, clip: false };
    // "cover" fit (fit.clip) always scales the source up until it's at
    // least as big as the box in both dimensions, then relies on clipping
    // to hide whatever overhangs — that's fine for painting, but Konva's
    // Container.getClientRect() sums its *children's* unclipped rects with
    // no awareness of clipFunc/clip at all (see konva/lib/Container.js), so
    // a Group clipped down to the layer's box still reports a client rect
    // as big as the oversized, unclipped image. Anything that reads that
    // (most importantly CanvasStage's Transformer — the selection handles)
    // then balloons out to the image's full unclipped extent instead of
    // the layer's actual footprint, which for a source aspect ratio far
    // from the box's own (exactly what an imported Scryfall art crop
    // usually is, see frameArtWindow.ts) can extend well past the card's
    // edges. Cropping the *source* image via Konva.Image's own `crop` prop
    // instead sidesteps this: the element's on-stage width/height already
    // equal the box, so there's nothing left to clip and nothing oversized
    // for getClientRect to pick up.
    const scale = image && fit.drawWidth > 0 ? fit.drawWidth / image.width : 1;
    const crop =
      fit.clip && image && scale > 0
        ? { x: -fit.offsetX / scale, y: -fit.offsetY / scale, width: common.width / scale, height: common.height / scale }
        : undefined;
    return (
      <Group {...common} ref={registerRef}>
        {image && (
          <KonvaImage
            image={image}
            x={crop ? 0 : fit.offsetX}
            y={crop ? 0 : fit.offsetY}
            width={crop ? common.width : fit.drawWidth}
            height={crop ? common.height : fit.drawHeight}
            crop={crop}
            ref={(node) => {
              imageShapeRef.current = node;
            }}
          />
        )}
      </Group>
    );
  }

  // shape
  if (layer.shape === "ellipse") {
    return (
      <Ellipse
        {...common}
        radiusX={common.width / 2}
        radiusY={common.height / 2}
        offsetX={-common.width / 2}
        offsetY={-common.height / 2}
        fill={layer.fill}
        stroke={layer.stroke}
        strokeWidth={mmToStagePx(layer.strokeWidthMm)}
      />
    );
  }

  return (
    <Rect
      {...common}
      fill={layer.fill}
      stroke={layer.stroke}
      strokeWidth={mmToStagePx(layer.strokeWidthMm)}
      cornerRadius={mmToStagePx(layer.cornerRadiusMm)}
    />
  );
}
