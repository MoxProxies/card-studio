import { useEffect, useState } from "react";

/** Loads a dynamic set of images by src, keyed by src, re-rendering as each
 * one finishes loading. Unlike useHtmlImage (a single, fixed src), this is
 * for a variable list determined at render time — e.g. every distinct
 * inline symbol a text layer's content actually references. */
export function useHtmlImages(srcs: string[]): Record<string, HTMLImageElement> {
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({});
  const key = srcs.join("|");

  useEffect(() => {
    let cancelled = false;
    for (const src of srcs) {
      if (images[src]) continue;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = src;
      img.addEventListener("load", () => {
        if (cancelled) return;
        setImages((prev) => (prev[src] ? prev : { ...prev, [src]: img }));
      });
    }
    return () => {
      cancelled = true;
    };
    // Re-run only when the distinct set of srcs changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return images;
}
