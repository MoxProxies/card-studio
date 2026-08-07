import type Konva from "konva";
import type { CardSize } from "@card-studio/scene-schema";
import { EDITOR_DPI, mmToStagePx, WORKSPACE_PADDING_PX } from "./geometry";

/**
 * Client-side export, good enough for previews/proofing. Print-quality
 * (PRINT_DPI, correct font hinting/color management) goes through the
 * render service instead of scaling this canvas up — see services/render.
 *
 * Crops to just the card: the Stage is padded with WORKSPACE_PADDING_PX of
 * surrounding workspace (see CanvasStage) so oversized layers and transform
 * handles have room to render, and that margin must not end up in the export.
 */
export function exportStageToPngDataUrl(stage: Konva.Stage, size: CardSize, targetDpi: number): string {
  const pixelRatio = targetDpi / EDITOR_DPI;
  return stage.toDataURL({
    x: WORKSPACE_PADDING_PX,
    y: WORKSPACE_PADDING_PX,
    width: mmToStagePx(size.widthMm),
    height: mmToStagePx(size.heightMm),
    pixelRatio,
    mimeType: "image/png",
  });
}
