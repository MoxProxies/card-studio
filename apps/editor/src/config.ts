/**
 * Editor-wide defaults meant to be hand-tuned by whoever maintains this
 * deployment — not user-facing settings, not data that lives in a Design.
 */

/** Font family newly created text layers (including the MTG text-field
 * templates) start with. Must match a family name in the embedded font
 * catalog (see font-library/ + scripts/sync-font-library.mjs) or a font
 * available on visitors' systems — otherwise it silently falls back to
 * the browser default and print output won't match what font-library/
 * promises. */
export const DEFAULT_FONT_FAMILY = "Inter";
