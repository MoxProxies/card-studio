import { FONT_CATALOG } from "./fontAssets";

/**
 * Explicitly triggers the browser to fetch every embedded font/weight via
 * the CSS Font Loading API. Declaring @font-face alone doesn't guarantee a
 * canvas fillText() call triggers the fetch before its first paint — Konva
 * (react-konva) has no idea a webfont is still loading, so without this the
 * very first text layer can render in a fallback font, then silently look
 * correct once you interact with the canvas again (later redraws happen
 * after the font has finished loading). Pair with CanvasStage's
 * document.fonts.ready/'loadingdone' redraw so an in-progress load still
 * gets picked up even if this preload call itself races something.
 */
export function preloadEmbeddedFonts(): void {
  for (const { family, weights } of FONT_CATALOG) {
    for (const { weight, style } of weights) {
      document.fonts.load(`${style} ${weight} 16px "${family}"`).catch(() => {});
    }
  }
}
