export interface TextFitResult {
  fontSizePx: number;
  lines: string[];
}

/**
 * Word-wraps `content` to `maxWidthPx`, shrinking `startFontSizePx` in 1px
 * steps (down to a 4px floor) until the wrapped lines fit `maxHeightPx` —
 * the "shrink to fit" behavior for a text box. Kept generic over how
 * width is measured and how font size is applied (via `measureWidth`/
 * `setFontSizePx` callbacks) so the exact same algorithm drives both the
 * editor's live canvas (DOM CanvasRenderingContext2D) and the print export
 * (@napi-rs/canvas's SKRSContext2D) — the two engines have incompatible
 * context types but an identical enough 2D canvas text API that neither
 * needs its own copy of the wrap/shrink logic.
 */
export function shrinkTextToFit(params: {
  content: string;
  startFontSizePx: number;
  maxWidthPx: number;
  maxHeightPx: number;
  lineHeightRatio: number;
  shrink: boolean;
  setFontSizePx: (px: number) => void;
  measureWidth: (text: string) => number;
}): TextFitResult {
  const { content, startFontSizePx, maxWidthPx, maxHeightPx, lineHeightRatio, shrink, setFontSizePx, measureWidth } = params;

  const wrap = (): string[] => {
    const lines: string[] = [];
    for (const paragraph of content.split("\n")) {
      const words = paragraph.split(" ");
      let current = "";
      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (measureWidth(candidate) > maxWidthPx && current) {
          lines.push(current);
          current = word;
        } else {
          current = candidate;
        }
      }
      lines.push(current);
    }
    return lines;
  };

  let fontSizePx = startFontSizePx;
  setFontSizePx(fontSizePx);
  let lines = wrap();

  if (shrink) {
    while (lines.length * (fontSizePx * lineHeightRatio) > maxHeightPx && fontSizePx > 4) {
      fontSizePx -= 1;
      setFontSizePx(fontSizePx);
      lines = wrap();
    }
  }

  return { fontSizePx, lines };
}
