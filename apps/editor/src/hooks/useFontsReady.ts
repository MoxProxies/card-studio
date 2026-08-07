import { useEffect, useState } from "react";

/**
 * Bumps on every change to the browser's font-loading state. A component
 * that measures text with a scratch canvas 2D context (shrink-to-fit
 * layout, for instance) gets fallback-font metrics until the real
 * embedded font has actually loaded — unlike glyph painting, that's a
 * one-shot calculation during render, not something a later
 * `stage.batchDraw()` alone will recompute, so callers need their own
 * signal to re-render once loading catches up.
 */
export function useFontsReady(): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    document.fonts.ready.then(bump);
    document.fonts.addEventListener("loadingdone", bump);
    return () => document.fonts.removeEventListener("loadingdone", bump);
  }, []);
}
