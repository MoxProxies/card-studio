import { layoutText, shrinkTextToFit, type Design, type TextLayer } from "@card-studio/scene-schema";
import { EDITOR_DPI, mmToStagePx, stagePxToMm } from "./geometry";
import { getSymbolAssetUrl, isGenericManaToken } from "./symbolAssets";
import type { TextFieldTemplate } from "./textTemplates";

const ptToPx = (pt: number) => (pt / 72) * EDITOR_DPI;
const pxToPt = (px: number) => (px / EDITOR_DPI) * 72;

// Never attached to the DOM — exists only to measure text via the same 2D
// canvas text API @napi-rs/canvas uses server-side, same reasoning as
// LayerNode.tsx's own copy (see shrinkTextToFit's doc comment). A separate
// instance from LayerNode's: this one is only ever touched from this
// module, and sharing one across files buys nothing since neither holds
// onto state between calls.
let measureCtx: CanvasRenderingContext2D | null = null;
function getMeasureCtx(): CanvasRenderingContext2D {
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d")!;
  return measureCtx;
}

const resolveSymbol = (token: string) => Boolean(getSymbolAssetUrl(token)) || isGenericManaToken(token);
const symbolWidth = (px: number) => px;

function fontStyleOf(layer: TextLayer): { style: string; weight: string } {
  return {
    style: layer.italic ? "italic" : "normal",
    weight: layer.fontWeight === "bold" ? "bold" : String(layer.fontWeight ?? "normal"),
  };
}

function findByFieldId(design: Design, fieldId: string): TextLayer | undefined {
  return design.layers.find((l): l is TextLayer => l.type === "text" && l.fieldId === fieldId);
}

/** A single text field alone in the boundary box — just the ordinary
 * single-box shrink-to-fit, same algorithm LayerNode.tsx's live canvas
 * uses, run here ahead of time so the *stored* height/fontSizePt already
 * reflect the fit instead of leaving it to each render. */
function shrinkSolo(layer: TextLayer, maxWidthPx: number, maxHeightPx: number) {
  const ctx = getMeasureCtx();
  const { style, weight } = fontStyleOf(layer);
  const startFontSizePx = ptToPx(layer.maxFontSizePt ?? layer.fontSizePt);
  const minFontSizePx = layer.minFontSizePt !== undefined ? ptToPx(layer.minFontSizePt) : undefined;
  return shrinkTextToFit({
    content: layer.content,
    startFontSizePx,
    minFontSizePx,
    maxWidthPx,
    maxHeightPx,
    lineHeightRatio: layer.lineHeight,
    shrink: true,
    setFontSizePx: (px) => {
      ctx.font = `${style} ${weight} ${px}px ${layer.fontFamily}`;
    },
    measureWidth: (text) => ctx.measureText(text).width,
    resolveSymbol,
    symbolWidth,
  });
}

/** Rules and flavor together as one shrink-to-fit unit: both word-wrapped
 * at the same candidate font size (each with its own style — flavor is
 * normally italic, rules normally isn't), a small gap between them, and
 * the whole pair shrinking together until rules-height + gap + flavor-
 * height fits maxHeightPx. `layoutText` (textFit.ts) is measure-only at a
 * fixed size — the shrink search loop here plays the role
 * shrinkTextToFit's own internal loop does for a single field. */
function shrinkCombined(rulesLayer: TextLayer, flavorLayer: TextLayer, maxWidthPx: number, maxHeightPx: number, gapLines: number) {
  const ctx = getMeasureCtx();
  const rulesStyle = fontStyleOf(rulesLayer);
  const flavorStyle = fontStyleOf(flavorLayer);
  // Shared line-height ratio for the combined block — rules' own, since
  // it's always present when both fields are (this function is only ever
  // called when both exist).
  const lineHeightRatio = rulesLayer.lineHeight;

  const measurerAt = (px: number, style: string, weight: string, family: string) => {
    ctx.font = `${style} ${weight} ${px}px ${family}`;
    return (text: string) => ctx.measureText(text).width;
  };

  const layoutAt = (fontSizePx: number) => {
    const rulesLines = layoutText({
      content: rulesLayer.content,
      fontSizePx,
      maxWidthPx,
      measureWidth: measurerAt(fontSizePx, rulesStyle.style, rulesStyle.weight, rulesLayer.fontFamily),
      resolveSymbol,
      symbolWidth,
    });
    const flavorLines = layoutText({
      content: flavorLayer.content,
      fontSizePx,
      maxWidthPx,
      measureWidth: measurerAt(fontSizePx, flavorStyle.style, flavorStyle.weight, flavorLayer.fontFamily),
      resolveSymbol,
      symbolWidth,
    });
    const lineHeightPx = fontSizePx * lineHeightRatio;
    const gapPx = gapLines * lineHeightPx;
    const rulesHeightPx = rulesLines.length * lineHeightPx;
    const flavorHeightPx = flavorLines.length * lineHeightPx;
    return { rulesHeightPx, flavorHeightPx, gapPx, totalHeightPx: rulesHeightPx + gapPx + flavorHeightPx };
  };

  const startFontSizePx = ptToPx(Math.max(rulesLayer.maxFontSizePt ?? rulesLayer.fontSizePt, flavorLayer.maxFontSizePt ?? flavorLayer.fontSizePt));
  const minFontSizePx = ptToPx(Math.min(rulesLayer.minFontSizePt ?? 5, flavorLayer.minFontSizePt ?? 5));

  let fontSizePx = startFontSizePx;
  let result = layoutAt(fontSizePx);
  while (result.totalHeightPx > maxHeightPx && fontSizePx > minFontSizePx) {
    fontSizePx -= 1;
    result = layoutAt(fontSizePx);
  }

  return { fontSizePx, ...result };
}

/**
 * Computes the rules/flavor boundary box — from the typeline field's
 * bottom edge to whichever of edition/artist/signature sits topmost
 * (raised further if needed to clear the power/toughness field entirely,
 * rather than wrapping text around it) — and, within it, the shared font
 * size and positions that make rules and flavor (whichever are present)
 * fit as one unit. Returns patches ready for commitLayerChanges/
 * updateLayerLive, or null when there's nothing to do: neither field
 * present, or not enough of the surrounding layout (typeline, a legal-row
 * field) exists yet to define a box against.
 *
 * Read-only — never mutates `design`. Callers are expected to fold the
 * result into whatever they're about to commit (see Toolbar.tsx's
 * addAllTextFields/addTextField/importFromScryfall and
 * PropertiesPanel.tsx's content textarea) rather than issuing a second,
 * separate commit — keeps "add/edit rules or flavor" a single undo step
 * instead of two.
 */
export function computeRulesFlavorPatch(
  design: Design,
  textTemplates: TextFieldTemplate[]
): Array<{ id: string; patch: Partial<TextLayer> }> | null {
  const rulesLayer = findByFieldId(design, "rules");
  const flavorLayer = findByFieldId(design, "flavor");
  if (!rulesLayer && !flavorLayer) return null;

  const typelineLayer = findByFieldId(design, "typeline");
  const legalLayer = ["edition", "artist", "signature"]
    .map((id) => findByFieldId(design, id))
    .filter((l): l is TextLayer => Boolean(l))
    .sort((a, b) => a.y - b.y)[0];
  if (!typelineLayer || !legalLayer) return null;

  const rulesTemplate = textTemplates.find((t) => t.id === "rules");
  const gapAboveTypelineMm = rulesTemplate?.gapAboveTypelineMm ?? 2;
  const gapAboveLegalMm = rulesTemplate?.gapAboveLegalMm ?? 2;
  const flavorGapLines = rulesTemplate?.flavorGapLines ?? 2;

  const anchor = rulesLayer ?? flavorLayer!;
  const boxXMm = anchor.x;
  const boxWidthMm = anchor.width;
  const boxTopMm = typelineLayer.y + typelineLayer.height + gapAboveTypelineMm;

  // Rather than reflowing text around power/toughness (an L-shaped
  // exclusion, needing per-line width variation), the box's bottom edge
  // is simply raised to sit entirely above it when it's present and
  // horizontally overlaps the box — guarantees no overlap with a lot
  // less complexity, at the cost of a little potential height in the
  // rare case content is long enough to want it.
  const powerToughnessLayer = findByFieldId(design, "powerToughness");
  const ptClampMm =
    powerToughnessLayer && powerToughnessLayer.x < boxXMm + boxWidthMm
      ? powerToughnessLayer.y - gapAboveLegalMm
      : Number.POSITIVE_INFINITY;
  const boxBottomMm = Math.min(legalLayer.y - gapAboveLegalMm, ptClampMm);
  const boxHeightMm = boxBottomMm - boxTopMm;
  if (boxHeightMm <= 0) return null;

  const boxWidthPx = mmToStagePx(boxWidthMm);
  const boxHeightPx = mmToStagePx(boxHeightMm);

  if (rulesLayer && flavorLayer) {
    const { fontSizePx, rulesHeightPx, flavorHeightPx, gapPx } = shrinkCombined(rulesLayer, flavorLayer, boxWidthPx, boxHeightPx, flavorGapLines);
    const fontSizePt = pxToPt(fontSizePx);
    const rulesHeightMm = Math.max(0.1, stagePxToMm(rulesHeightPx));
    const flavorYMm = boxTopMm + stagePxToMm(rulesHeightPx + gapPx);
    const flavorHeightMm = Math.max(0.1, stagePxToMm(flavorHeightPx));
    return [
      { id: rulesLayer.id, patch: { x: boxXMm, y: boxTopMm, width: boxWidthMm, height: rulesHeightMm, fontSizePt } },
      { id: flavorLayer.id, patch: { x: boxXMm, y: flavorYMm, width: boxWidthMm, height: flavorHeightMm, fontSizePt } },
    ];
  }

  const solo = rulesLayer ?? flavorLayer!;
  const { fontSizePx, lines } = shrinkSolo(solo, boxWidthPx, boxHeightPx);
  const fontSizePt = pxToPt(fontSizePx);
  const heightMm = Math.max(0.1, stagePxToMm(lines.length * fontSizePx * solo.lineHeight));
  return [{ id: solo.id, patch: { x: boxXMm, y: boxTopMm, width: boxWidthMm, height: heightMm, fontSizePt } }];
}
