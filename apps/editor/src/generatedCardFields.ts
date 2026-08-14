/**
 * The plain-data shape a host page hands over to pre-populate a brand-new
 * design — moxproxies-website's AI card-generation wizard (Claude Haiku
 * clarifies a prompt into these fields server-side) is the first caller,
 * but the shape itself has nothing wizard-specific about it: it's the
 * same handful of fields importFromScryfall (Toolbar.tsx) already turns
 * into layers, just decoupled from Scryfall's own response shape so a
 * second caller doesn't have to pretend to be one. See embed.ts's
 * `generated-fields` attribute and Toolbar.tsx's `applyGeneratedFields`.
 */
export interface GeneratedCardFields {
  name: string;
  manaCost?: string;
  typeLine?: string;
  rulesText?: string;
  flavorText?: string;
  powerToughness?: string;
  artist?: string;
  /** One of rarityCatalog.generated.json's ids (common/uncommon/rare/mythic). */
  rarity?: string;
  /** A data: URI or any fetchable URL — becomes the art layer's `src` as-is. */
  imageSrc?: string;
}
