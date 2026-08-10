/**
 * Where the rarity-symbol image layer is placed/sized when first added —
 * mm relative to the CUT/trim corner, the same convention textTemplates.ts
 * uses. Real MTG cards sit the symbol at the right end of the type line;
 * hand-tune this if a frame's type line sits somewhere else.
 */
export const RARITY_SYMBOL_BOX = { x: 52.5, y: 50.4, width: 5.5, height: 5.5 };

/** Fixed, well-known id for the single rarity-symbol layer a design can
 * have — lets the toolbar dropdown find-or-create/update it directly by
 * id instead of tracking "which layer is the rarity symbol" separately. */
export const RARITY_LAYER_ID = "rarity-symbol";

/** Display order for the rarity dropdown — rarity-library/'s catalog is
 * alphabetical (like every other asset library here), which isn't a
 * meaningful rarity order, so sort by this instead. Any catalog id not
 * listed here (a rarity added to rarity-library/ without updating this)
 * falls in afterward, alphabetically, rather than being hidden. */
export const RARITY_DISPLAY_ORDER = ["common", "uncommon", "rare", "mythic"];

/** The rarity/set-symbol layer defaults to both locked (nobody drags it
 * by accident) and contentLocked (changing *which* rarity is shown
 * requires the canEditLockedContent entitlement) — same "official symbol
 * that shouldn't move or change casually" treatment as the artist/
 * signature text fields default to in text-template-library/. The two
 * are independent (see schema.ts's LayerBase doc comments); both true
 * here just reflects that this one layer is meant to be doubly
 * protected by default. */
export const RARITY_DEFAULT_LOCKED = true;
export const RARITY_DEFAULT_CONTENT_LOCKED = true;
