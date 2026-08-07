import type Konva from "konva";
import { EDITOR_DPI } from "./geometry";

/**
 * Client-side export, good enough for previews/proofing. Print-quality
 * (PRINT_DPI, correct font hinting/color management) goes through the
 * render service instead of scaling this canvas up — see services/render.
 */
export function exportStageToPngDataUrl(stage: Konva.Stage, targetDpi: number): string {
  const pixelRatio = targetDpi / EDITOR_DPI;
  return stage.toDataURL({ pixelRatio, mimeType: "image/png" });
}
