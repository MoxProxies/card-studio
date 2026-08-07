/** Turns a hyphen/underscore file or folder slug into a display label,
 * e.g. "classic-white" -> "Classic White". Shared by every sync-*-library
 * script so a frame, font, rarity symbol, or text-template config all get
 * the same "no separate metadata file" naming convention. */
export function humanize(slug) {
  return slug
    .replace(/[-_]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
