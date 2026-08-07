import { mmToPx, pxToMm } from "@card-studio/scene-schema";

/** Resolution the canvas is drawn at on screen — deliberately far below
 * PRINT_DPI. Final high-res output is produced by the render service
 * from the same (DPI-independent) scene JSON, not by scaling this canvas. */
export const EDITOR_DPI = 150;

export const mmToStagePx = (mm: number) => mmToPx(mm, EDITOR_DPI);
export const stagePxToMm = (px: number) => pxToMm(px, EDITOR_DPI);
