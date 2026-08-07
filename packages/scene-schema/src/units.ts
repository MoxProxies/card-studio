const MM_PER_INCH = 25.4;

/** Convert a physical size in millimeters to a pixel count at a given DPI. */
export function mmToPx(mm: number, dpi: number): number {
  return (mm / MM_PER_INCH) * dpi;
}

/** Convert a pixel count at a given DPI back to millimeters. */
export function pxToMm(px: number, dpi: number): number {
  return (px / dpi) * MM_PER_INCH;
}

/**
 * Standard trading-card print spec (e.g. Magic: The Gathering proxies),
 * per the print vendor's 300 DPI reference:
 *   full bleed  816 x 1110 px  (2.72 x 3.70 in) — art/frame art must extend
 *               to here; this is the exported/printed file's size.
 *   cut / trim  744 x 1038 px  (2.48 x 3.46 in) — the actual card after
 *               cutting. Centered within the full-bleed size.
 *   safe area   684 x  981 px  (2.28 x 3.27 in) — nothing critical should
 *               sit outside this. Centered within the cut size.
 * All three share the same center point. The bleed margin is symmetric on
 * both axes (36px / 3.048mm each side); the safe margin is symmetric on
 * each axis individually but differs between axes (2.54mm horizontal,
 * 2.413mm vertical) — that asymmetry is in the source spec, not a mistake.
 */
export const STANDARD_CARD_SIZE_MM = {
  widthMm: 69.088,
  heightMm: 93.98,
  cutWidthMm: 62.992,
  cutHeightMm: 87.884,
  safeWidthMm: 57.912,
  safeHeightMm: 83.058,
} as const;

/** Default export resolution for print-quality output. */
export const PRINT_DPI = 800;

/** Lower-resolution DPI used for on-screen previews/thumbnails. */
export const PREVIEW_DPI = 150;
