import { Group, Image as KonvaImage, Rect, Ellipse, Circle, Text } from "react-konva";
import type Konva from "konva";
import { computeObjectFit, shrinkTextToFit, type Layer } from "@card-studio/scene-schema";
import { EDITOR_DPI, mmToStagePx } from "../geometry";
import { useHtmlImage } from "../hooks/useHtmlImage";
import { useHtmlImages } from "../hooks/useHtmlImages";
import { useFontsReady } from "../hooks/useFontsReady";
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

  // Text layout (word-wrap + shrink-to-fit + inline {token} symbols) is
  // computed unconditionally-in-shape (but conditionally in content) so the
  // useHtmlImages call below — which must run every render, same as any
  // other hook — always has a real (possibly empty) src list to work from.
  let textLayout: ReturnType<typeof shrinkTextToFit> | null = null;
  let textFontStyle = "normal";
  if (layer.type === "text" && layer.overflow === "shrink") {
    const weight = layer.fontWeight === "bold" ? "bold" : "normal";
    const style = layer.italic ? "italic" : "normal";
    textFontStyle = [style === "italic" ? "italic" : "", weight === "bold" ? "bold" : ""].filter(Boolean).join(" ") || "normal";
    const nominalFontSizePx = (layer.fontSizePt / 72) * EDITOR_DPI;
    const ctx = getMeasureCtx();
    textLayout = shrinkTextToFit({
      content: layer.content,
      startFontSizePx: nominalFontSizePx,
      maxWidthPx: mmToStagePx(layer.width),
      maxHeightPx: mmToStagePx(layer.height),
      lineHeightRatio: layer.lineHeight,
      shrink: true,
      setFontSizePx: (px) => {
        ctx.font = `${style} ${weight} ${px}px ${layer.fontFamily}`;
      },
      measureWidth: (text) => ctx.measureText(text).width,
      resolveSymbol: (token) => Boolean(getSymbolAssetUrl(token)) || isGenericManaToken(token),
      symbolWidth: (px) => px,
    });
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
      return <KonvaImage {...common} image={frameImage} />;
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
    const weight = layer.fontWeight === "bold" ? "bold" : "normal";
    const style = layer.italic ? "italic" : "normal";
    const fontStyle = [style === "italic" ? "italic" : "", weight === "bold" ? "bold" : ""].filter(Boolean).join(" ") || "normal";
    // pt -> px at the same DPI the layer's box was converted at (EDITOR_DPI),
    // not a fixed 96 — otherwise font size and box size scale differently
    // on screen and a "fits the box" shrink threshold would trip at the
    // wrong point relative to what actually prints.
    const nominalFontSizePx = (layer.fontSizePt / 72) * EDITOR_DPI;

    if (textLayout) {
      const { fontSizePx, lines } = textLayout;
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
                  />
                );
              }
              if (isGenericManaToken(run.text)) {
                return (
                  <Group key={key} x={drawX} y={lineY} listening={false}>
                    <Circle radius={runWidth / 2} x={runWidth / 2} y={fontSizePx / 2} fill="#cccccc" />
                    <Text
                      text={run.text}
                      width={runWidth}
                      height={fontSizePx}
                      align="center"
                      verticalAlign="middle"
                      fontSize={Math.round(runWidth * 0.62)}
                      fontStyle="bold"
                      fill="#000000"
                    />
                  </Group>
                );
              }
              const url = getSymbolAssetUrl(run.text);
              const img = url ? symbolImages[url] : undefined;
              if (!img) return null;
              return <KonvaImage key={key} x={drawX} y={lineY} width={runWidth} height={fontSizePx} image={img} listening={false} />;
            });
          })}
        </Group>
      );
    }

    return (
      <Text
        {...common}
        text={layer.content}
        fontFamily={layer.fontFamily}
        fontSize={nominalFontSizePx}
        fontStyle={fontStyle}
        fill={layer.color}
        align={layer.align}
        lineHeight={layer.lineHeight}
        wrap={layer.overflow === "clip" ? "none" : "word"}
      />
    );
  }

  if (layer.type === "image") {
    const fit = image
      ? computeObjectFit(layer.fit, common.width, common.height, image.width, image.height)
      : { drawWidth: common.width, drawHeight: common.height, offsetX: 0, offsetY: 0, clip: false };
    return (
      <Group
        {...common}
        clipFunc={
          fit.clip
            ? (ctx) => {
                ctx.rect(0, 0, common.width, common.height);
              }
            : undefined
        }
      >
        {image && (
          <KonvaImage image={image} x={fit.offsetX} y={fit.offsetY} width={fit.drawWidth} height={fit.drawHeight} listening={false} />
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
