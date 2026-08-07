import { mmToPx, pxToMm } from "@card-studio/scene-schema";

/** Resolution the canvas is drawn at on screen — deliberately far below
 * PRINT_DPI. Final high-res output is produced by the render service
 * from the same (DPI-independent) scene JSON, not by scaling this canvas. */
export const EDITOR_DPI = 150;

export const mmToStagePx = (mm: number) => mmToPx(mm, EDITOR_DPI);
export const stagePxToMm = (px: number) => pxToMm(px, EDITOR_DPI);

/** Margin of empty workspace rendered around the card on every side. Without
 * this, the Stage's pixel dimensions exactly match the card, so a layer
 * larger than the card (or a Transformer handle sitting right at the card's
 * edge) has nowhere to draw — canvas content outside the canvas's own
 * width/height simply isn't rendered, and the handle becomes unreachable. */
export const WORKSPACE_PADDING_PX = 120;
