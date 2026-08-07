export interface ObjectFitResult {
  drawWidth: number;
  drawHeight: number;
  offsetX: number;
  offsetY: number;
  /** True when the scaled image overflows the box on at least one axis
   * (only possible for "cover") and so needs to be clipped to the box. */
  clip: boolean;
}

/**
 * CSS object-fit-style placement math for an image inside a box, shared
 * between the editor's Konva rendering and the render service's canvas
 * drawing so an ImageLayer's `fit` actually behaves the same in both —
 * previously both sides silently stretched every image to fill its box
 * regardless of the `fit` field, which distorts anything that isn't
 * already the box's exact aspect ratio (e.g. a square rarity symbol
 * dropped into a non-square box).
 */
export function computeObjectFit(
  fit: "cover" | "contain" | "fill",
  boxWidth: number,
  boxHeight: number,
  sourceWidth: number,
  sourceHeight: number
): ObjectFitResult {
  if (fit === "fill" || sourceWidth <= 0 || sourceHeight <= 0) {
    return { drawWidth: boxWidth, drawHeight: boxHeight, offsetX: 0, offsetY: 0, clip: false };
  }

  const scale = fit === "contain" ? Math.min(boxWidth / sourceWidth, boxHeight / sourceHeight) : Math.max(boxWidth / sourceWidth, boxHeight / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;

  return {
    drawWidth,
    drawHeight,
    offsetX: (boxWidth - drawWidth) / 2,
    offsetY: (boxHeight - drawHeight) / 2,
    clip: fit === "cover",
  };
}
