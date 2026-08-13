import { useEffect } from "react";

/**
 * While active: locks the host page's own scroll (position:fixed covering
 * the viewport doesn't stop scroll-chaining to whatever's behind it on its
 * own) and closes on Escape. `document` here is always the *host* page's
 * document, embedded or not — shadow roots don't get their own; that's
 * exactly why this needs to reach out to `document.body` at all, and why
 * it's safe to: a top-level Escape/scroll-lock while in an intentionally
 * fullscreen editor is expected host-page interaction, not a network call
 * or anything persisted (see embed.ts's own doc comment on scope).
 */
export function useFullscreenLightbox(active: boolean, onExit: () => void) {
  useEffect(() => {
    if (!active) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [active, onExit]);
}
