/**
 * Prefix for the runtime-constructed asset URLs frameAssets.ts/
 * rarityAssets.ts/symbolAssets.ts build ("/frames/...", "/rarity/...",
 * "/symbols/..."). Defaults to "/" (root-relative, today's exact
 * behavior unchanged) — correct as long as this app is served from its
 * own domain root, true for the standalone build (apps/editor/dist/app/)
 * and, originally, assumed true for the embed too.
 *
 * The embed build doesn't get to assume that anymore: moxproxies-website
 * serves card-studio-embed.js from its own public/vendor/card-studio/,
 * not the domain root, so a plain "/frames/..." 404s there — nothing
 * under moxproxies-website's own root serves that path. embed.ts calls
 * setAssetBase() once, at module load (before any asset URL gets
 * constructed), to the directory containing whichever URL the embed
 * script itself was actually loaded from (import.meta.url) — portable
 * regardless of what subpath a host page serves it from.
 *
 * fonts.generated.css needed the same fix but can't read this module-level
 * variable (it's plain generated CSS text, not JS) — embed.ts rewrites its
 * "/fonts/" references directly wherever it injects that CSS.
 */
export let ASSET_BASE = "/";

export function setAssetBase(base: string): void {
  ASSET_BASE = base;
}
