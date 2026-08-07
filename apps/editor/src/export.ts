import type Konva from "konva";
import type { CardSize } from "@card-studio/scene-schema";
import { EDITOR_DPI, mmToStagePx } from "./geometry";

/**
 * Client-side export, good enough for previews/proofing. Print-quality
 * (PRINT_DPI, correct font hinting/color management) goes through the
 * render service instead of scaling this canvas up — see services/render.
 *
 * The Stage is a pan/zoom viewport (see CanvasStage), not a 1:1 view of the
 * card, so the crop region has to track the card's *current on-screen*
 * position/size (panX/panY, widthPx*zoom/heightPx*zoom) rather than a fixed
 * offset — and the requested pixelRatio has to be divided by the current
 * zoom, or export resolution would silently depend on whatever zoom level
 * happened to be on screen (e.g. zoomed out 50% would halve the output
 * resolution otherwise, since Konva scales up from however many pixels are
 * actually on screen right now, not from the card's native size).
 */
export function exportStageToPngDataUrl(
  stage: Konva.Stage,
  size: CardSize,
  targetDpi: number,
  view: { panX: number; panY: number; zoom: number }
): string {
  const pixelRatio = targetDpi / EDITOR_DPI / view.zoom;
  return stage.toDataURL({
    x: view.panX,
    y: view.panY,
    width: mmToStagePx(size.widthMm) * view.zoom,
    height: mmToStagePx(size.heightMm) * view.zoom,
    pixelRatio,
    mimeType: "image/png",
  });
}
