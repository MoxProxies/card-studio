export interface TextRun {
  kind: "text" | "symbol";
  /** For "text": the literal characters to draw. For "symbol": the raw
   * {token} content (no braces) — e.g. "W" or "2" — resolved by the caller
   * at draw time against its own symbol asset catalog. */
  text: string;
}

export interface PositionedRun {
  run: TextRun;
  /** Offset in px from the line's own left edge (before alignment). */
  x: number;
  width: number;
}

export interface LineLayout {
  runs: PositionedRun[];
  width: number;
}

export interface TextFitResult {
  fontSizePx: number;
  lines: LineLayout[];
}

const SYMBOL_TOKEN_RE = /\{([^}]*)\}/g;

/** Splits one space-delimited word into text/symbol runs — e.g. "{T}:" (a
 * tap symbol directly followed by punctuation, as MTG rules text commonly
 * writes it) becomes [symbol "T", text ":"], kept together as one
 * non-breaking "word" for wrapping purposes. A token resolveSymbol rejects
 * (unknown to the caller's asset catalog) falls back to its literal
 * "{token}" text instead of being dropped. */
function tokenizeWord(word: string, resolveSymbol?: (token: string) => boolean): TextRun[] {
  if (!resolveSymbol) return [{ kind: "text", text: word }];
  const runs: TextRun[] = [];
  let last = 0;
  for (const m of word.matchAll(SYMBOL_TOKEN_RE)) {
    const index = m.index ?? 0;
    if (index > last) runs.push({ kind: "text", text: word.slice(last, index) });
    const token = m[1] ?? "";
    runs.push(resolveSymbol(token) ? { kind: "symbol", text: token } : { kind: "text", text: `{${token}}` });
    last = index + m[0].length;
  }
  if (last < word.length) runs.push({ kind: "text", text: word.slice(last) });
  if (runs.length === 0) runs.push({ kind: "text", text: word });
  return runs;
}

/**
 * Word-wraps `content` to `maxWidthPx`, shrinking `startFontSizePx` in 1px
 * steps (down to a 4px floor) until the wrapped lines fit `maxHeightPx` —
 * the "shrink to fit" behavior for a text box. Kept generic over how width
 * is measured and how font size is applied (via `measureWidth`/
 * `setFontSizePx` callbacks) so the exact same algorithm drives both the
 * editor's live canvas (DOM CanvasRenderingContext2D) and the print export
 * (@napi-rs/canvas's SKRSContext2D) — the two engines have incompatible
 * context types but an identical enough 2D canvas text API that neither
 * needs its own copy of the wrap/shrink logic.
 *
 * `resolveSymbol`/`symbolWidth` add inline {token} support (mana symbols,
 * {T}, etc. — see symbol-library/) on top of that: a recognized token
 * becomes a fixed-width atomic run instead of literal characters, wrapped
 * as a unit like any other word. Omit both to treat "{...}" as plain text,
 * unchanged from before inline symbols existed.
 *
 * `startFontSizePx` doubles as the search ceiling: pass fontSizePt's px
 * equivalent for the original shrink-only-from-here behavior, or a
 * separate, larger maxFontSizePt's px equivalent to let the search grow
 * into that headroom for short content instead of just sitting at
 * fontSizePt — the loop always searches downward from whatever ceiling
 * it's given, so "shrink from a big starting point" and "fit within a
 * range" are the same algorithm. `minFontSizePx` is that search's floor
 * (default 4, matching the original hardcoded value).
 */
export function shrinkTextToFit(params: {
  content: string;
  startFontSizePx: number;
  minFontSizePx?: number;
  maxWidthPx: number;
  maxHeightPx: number;
  lineHeightRatio: number;
  shrink: boolean;
  setFontSizePx: (px: number) => void;
  measureWidth: (text: string) => number;
  resolveSymbol?: (token: string) => boolean;
  symbolWidth?: (fontSizePx: number) => number;
}): TextFitResult {
  const {
    content,
    startFontSizePx,
    minFontSizePx = 4,
    maxWidthPx,
    maxHeightPx,
    lineHeightRatio,
    shrink,
    setFontSizePx,
    measureWidth,
    resolveSymbol,
    symbolWidth,
  } = params;

  const layoutLines = (fontSizePx: number): LineLayout[] => {
    const lines: LineLayout[] = [];
    const spaceWidth = measureWidth(" ");
    const symW = resolveSymbol && symbolWidth ? symbolWidth(fontSizePx) : 0;
    const runWidth = (run: TextRun) => (run.kind === "symbol" ? symW : measureWidth(run.text));

    for (const paragraph of content.split("\n")) {
      const words = paragraph.split(" ").map((word) => tokenizeWord(word, resolveSymbol));
      let currentWords: TextRun[][] = [];
      let currentWidth = 0;

      const flush = () => {
        let x = 0;
        const runs: PositionedRun[] = [];
        currentWords.forEach((wordRuns, wi) => {
          if (wi > 0) x += spaceWidth;
          for (const run of wordRuns) {
            const w = runWidth(run);
            runs.push({ run, x, width: w });
            x += w;
          }
        });
        lines.push({ runs, width: x });
        currentWords = [];
        currentWidth = 0;
      };

      for (const wordRuns of words) {
        const wordWidth = wordRuns.reduce((sum, run) => sum + runWidth(run), 0);
        const additional = (currentWords.length > 0 ? spaceWidth : 0) + wordWidth;
        if (currentWidth + additional > maxWidthPx && currentWords.length > 0) {
          flush();
          currentWords = [wordRuns];
          currentWidth = wordWidth;
        } else {
          currentWords.push(wordRuns);
          currentWidth += additional;
        }
      }
      flush();
    }
    return lines;
  };

  let fontSizePx = startFontSizePx;
  setFontSizePx(fontSizePx);
  let lines = layoutLines(fontSizePx);

  if (shrink) {
    while (lines.length * (fontSizePx * lineHeightRatio) > maxHeightPx && fontSizePx > minFontSizePx) {
      fontSizePx -= 1;
      setFontSizePx(fontSizePx);
      lines = layoutLines(fontSizePx);
    }
  }

  return { fontSizePx, lines };
}
