const MM_PER_INCH = 25.4;

/** Convert a physical size in millimeters to a pixel count at a given DPI. */
export function mmToPx(mm: number, dpi: number): number {
  return (mm / MM_PER_INCH) * dpi;
}

/** Convert a pixel count at a given DPI back to millimeters. */
export function pxToMm(px: number, dpi: number): number {
  return (px / dpi) * MM_PER_INCH;
}

/** Standard trading-card size (e.g. Magic: The Gathering), no bleed. */
export const STANDARD_CARD_MM = { widthMm: 63, heightMm: 88 } as const;

/** Recommended bleed for print fulfillment; trimmed after cutting. */
export const DEFAULT_BLEED_MM = 3;

/** Default export resolution for print-quality output. */
export const PRINT_DPI = 800;

/** Lower-resolution DPI used for on-screen previews/thumbnails. */
export const PREVIEW_DPI = 150;
