import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Design, createEmptyDesign, STANDARD_CARD_SIZE_MM } from "@card-studio/scene-schema";
import { DesignProvider } from "./store/DesignProvider";
import { createDesignStore, type DesignStore } from "./store/designStore";
import { DEFAULT_ENTITLEMENTS, type Entitlements } from "./entitlements";
import { App } from "./App";
// Imported as raw strings (not injected into document.head) because this
// element renders into a shadow root — a global <style> tag can't cross the
// shadow boundary, so the CSS has to be inlined inside it directly. This
// applies to @font-face too: a shadow root's own stylesheet can declare
// fonts and use them for text inside that shadow tree.
import styles from "./styles.css?inline";
import fontFaces from "./fonts.generated.css?inline";
import { preloadEmbeddedFonts } from "./loadEmbeddedFonts";

/**
 * <card-studio-editor> — the integration surface for moxproxies-website.
 *
 * Usage from the host page:
 *   <script type="module" src="https://studio.moxproxies.com/embed/card-studio-embed.js"></script>
 *   <card-studio-editor initial-design='{...}' can-edit-locked-content hide-local-design-library></card-studio-editor>
 *
 * The element dispatches a bubbling, composed "design-change" CustomEvent
 * (detail: the current Design JSON) on every edit, so the host page can
 * autosave or enable a "Save design" button without polling. It also
 * exposes `.getDesign()` for imperative reads (e.g. right before checkout).
 *
 * Auth/ownership are intentionally out of scope here: this element only
 * edits scene JSON in memory. Persisting a design against a logged-in
 * moxproxies-website user, uploading art, and requesting a print-quality
 * render are the host page's job, calling the render/API service with
 * whatever session token it already has.
 *
 * The one exception is `Entitlements.canEditLockedContent` (the "premium"
 * gate for contentLocked fields — artist/signature/the rarity symbol by
 * default; see schema.ts's LayerBase doc comments and README's "Field
 * locking" section) — this element takes it as a plain boolean, either
 * up front via the `can-edit-locked-content` boolean attribute (present =
 * true, read once at mount) or live via `.setEntitlements()`, for a host
 * that only knows the answer after an async auth/subscription check
 * resolves. Computing that boolean from an actual moxproxies-website
 * session/subscription is entirely the host page's job; this element
 * never sees a token or makes an auth call of its own.
 *
 * `hide-local-design-library` (boolean attribute, read once at mount,
 * present = true): hides the toolbar's own "Designs" button —
 * designStorage.ts's localStorage-backed save/load, which predates this
 * embed and has nothing to do with the host's own persistence. Set this
 * whenever the host page provides its own save UI (as moxproxies-website
 * now does), so there's exactly one "Save" a user can find, not two that
 * quietly do different things (one to the host's backend, one to just
 * that browser's localStorage).
 */
export class CardStudioEditorElement extends HTMLElement {
  #root: Root | null = null;
  #store: DesignStore | null = null;

  connectedCallback() {
    if (this.#root) return; // already mounted

    const shadow = this.shadowRoot ?? this.attachShadow({ mode: "open" });
    const styleEl = document.createElement("style");
    styleEl.textContent = `${styles}\n${fontFaces}`;
    shadow.appendChild(styleEl);
    // @font-face registration is document-global even when declared inside
    // a shadow root's stylesheet — safe to preload once the <style> above
    // is actually in the DOM.
    preloadEmbeddedFonts();

    const container = document.createElement("div");
    container.style.width = "100%";
    container.style.height = this.getAttribute("height") ?? "600px";
    shadow.appendChild(container);

    const initialDesign = this.#readInitialDesign();
    const initialEntitlements = this.#readInitialEntitlements();
    this.#store = createDesignStore(initialDesign, initialEntitlements, this.hasAttribute("hide-local-design-library"));
    this.#store.subscribe((state) => {
      this.dispatchEvent(
        new CustomEvent("design-change", { detail: state.design, bubbles: true, composed: true })
      );
    });

    this.#root = createRoot(container);
    this.#root.render(createElement(DesignProvider, { store: this.#store, children: createElement(App) }));
  }

  disconnectedCallback() {
    this.#root?.unmount();
    this.#root = null;
    this.#store = null;
  }

  /** Current design JSON, e.g. to persist right before checkout. */
  getDesign(): Design | null {
    return this.#store?.getState().design ?? null;
  }

  /** Updates what the current user is allowed to do with contentLocked
   * layers — call this any time after mount, e.g. once an async auth/
   * subscription check resolves (the `can-edit-locked-content` attribute
   * only covers what's known synchronously at mount). Takes effect
   * immediately: any contentLocked field's content input re-enables (or
   * disables) on the next render. */
  setEntitlements(entitlements: Entitlements): void {
    this.#store?.getState().setEntitlements(entitlements);
  }

  #readInitialDesign(): Design {
    const raw = this.getAttribute("initial-design");
    if (raw) {
      try {
        return Design.parse(JSON.parse(raw));
      } catch (err) {
        console.error("[card-studio] invalid initial-design attribute, starting blank.", err);
      }
    }
    return createEmptyDesign(crypto.randomUUID(), STANDARD_CARD_SIZE_MM);
  }

  #readInitialEntitlements(): Entitlements {
    return { ...DEFAULT_ENTITLEMENTS, canEditLockedContent: this.hasAttribute("can-edit-locked-content") };
  }
}

if (!customElements.get("card-studio-editor")) {
  customElements.define("card-studio-editor", CardStudioEditorElement);
}
