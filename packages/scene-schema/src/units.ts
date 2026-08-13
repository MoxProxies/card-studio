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
 * Standard trading-card size (e.g. Magic: The Gathering): 63 x 88mm trim,
 * exactly. Full-bleed and safe-area margins still come from an actual
 * print vendor's spec (kept as *absolute* margins, not a percentage of
 * the trim size — that's how a vendor actually specifies bleed/safety
 * requirements: a fixed physical buffer for cutting tolerance, the same
 * regardless of the card's own trim dimensions):
 *   full bleed   69.096 x  94.096mm — art/frame art must extend to here;
 *                this is the exported/printed file's size. 3.048mm
 *                (0.12in) bleed margin, symmetric on both axes.
 *   cut / trim   63.000 x  88.000mm — the actual card after cutting.
 *                Centered within the full-bleed size.
 *   safe area    57.920 x  83.174mm — nothing critical should sit
 *                outside this. Centered within the cut size. Margin is
 *                symmetric on each axis individually but differs
 *                between axes (2.54mm horizontal, 2.413mm vertical) —
 *                that asymmetry is in the source spec, not a mistake.
 * All three share the same center point.
 */
export const STANDARD_CARD_SIZE_MM = {
  widthMm: 69.096,
  heightMm: 94.096,
  cutWidthMm: 63,
  cutHeightMm: 88,
  safeWidthMm: 57.92,
  safeHeightMm: 83.174,
} as const;

/** Default export resolution for print-quality output. */
export const PRINT_DPI = 800;

/** Lower-resolution DPI used for on-screen previews/thumbnails. */
export const PREVIEW_DPI = 150;
