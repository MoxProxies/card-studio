import type { Design } from "@card-studio/scene-schema";

/** Fractions of the full-bleed canvas (0 = the bleed edge, 1 = the
 * opposite bleed edge) — same coordinate space image layers already use
 * (x/y/width/height directly in full-bleed mm, top-left origin at the
 * bleed corner; see addImage/importFromScryfall in Toolbar.tsx), just
 * expressed as fractions so it scales with whatever `design.size` is
 * rather than a fixed mm box. */
export interface ArtWindow {
  xFrac: number;
  yFrac: number;
  widthFrac: number;
  heightFrac: number;
}

/** Measured directly from frame-library/classic/*.png's alpha channel —
 * every classic variant (black/white/green/etc.) shares the exact same
 * transparent illustration window, only the border color differs. */
const CLASSIC_ART_WINDOW: ArtWindow = { xFrac: 0.1014, yFrac: 0.1404, widthFrac: 0.7972, heightFrac: 0.549 };

/** Per-category art window, for frame categories whose illustration
 * window doesn't match `classic`'s. Add an entry here (measure the new
 * category's own transparent bbox the same way) whenever a frame with a
 * meaningfully different window ships — see [Adding
 * frames](README.md#adding-frames). */
const ART_WINDOW_BY_CATEGORY: Record<string, ArtWindow> = {
  classic: CLASSIC_ART_WINDOW,
};

/** Falls back to `classic`'s window for any category with no dedicated
 * entry above (including "no frame added yet") — a reasonable default
 * for a typical MTG-proxy layout until that category's own window gets
 * measured and added. */
const DEFAULT_ART_WINDOW = CLASSIC_ART_WINDOW;

/** Resolves a frame category's illustration window to an actual mm box
 * (x/y/width/height, full-bleed-canvas coordinates) for the given design
 * size — used to place imported art so it fills just the illustration
 * area instead of the entire full-bleed card (which would force a
 * landscape-shaped Scryfall art crop through a much taller/narrower box,
 * cropping far more of it away than necessary; see [Scryfall
 * import](README.md#scryfall-import)). */
export function resolveArtWindowMm(category: string | undefined, size: Design["size"]) {
  const window = (category && ART_WINDOW_BY_CATEGORY[category]) || DEFAULT_ART_WINDOW;
  return {
    x: window.xFrac * size.widthMm,
    y: window.yFrac * size.heightMm,
    width: window.widthFrac * size.widthMm,
    height: window.heightFrac * size.heightMm,
  };
}
