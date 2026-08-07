import { useEffect, useState } from "react";

/** Loads an HTMLImageElement for a given src, re-rendering once it's ready. */
export function useHtmlImage(src: string | undefined): HTMLImageElement | undefined {
  const [image, setImage] = useState<HTMLImageElement>();

  useEffect(() => {
    if (!src) {
      setImage(undefined);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    const handleLoad = () => setImage(img);
    img.addEventListener("load", handleLoad);
    return () => img.removeEventListener("load", handleLoad);
  }, [src]);

  return image;
}
