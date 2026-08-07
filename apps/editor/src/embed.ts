import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Design, createEmptyDesign, STANDARD_CARD_MM, DEFAULT_BLEED_MM } from "@card-studio/scene-schema";
import { DesignProvider } from "./store/DesignProvider";
import { createDesignStore, type DesignStore } from "./store/designStore";
import { App } from "./App";

/**
 * <card-studio-editor> — the integration surface for moxproxies-website.
 *
 * Usage from the host page:
 *   <script type="module" src="https://studio.moxproxies.com/embed/card-studio-embed.js"></script>
 *   <card-studio-editor initial-design='{...}'></card-studio-editor>
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
 */
export class CardStudioEditorElement extends HTMLElement {
  #root: Root | null = null;
  #store: DesignStore | null = null;

  connectedCallback() {
    if (this.#root) return; // already mounted

    const shadow = this.shadowRoot ?? this.attachShadow({ mode: "open" });
    const container = document.createElement("div");
    container.style.width = "100%";
    container.style.height = this.getAttribute("height") ?? "600px";
    shadow.appendChild(container);

    const initialDesign = this.#readInitialDesign();
    this.#store = createDesignStore(initialDesign);
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

  #readInitialDesign(): Design {
    const raw = this.getAttribute("initial-design");
    if (raw) {
      try {
        return Design.parse(JSON.parse(raw));
      } catch (err) {
        console.error("[card-studio] invalid initial-design attribute, starting blank.", err);
      }
    }
    return createEmptyDesign(crypto.randomUUID(), { ...STANDARD_CARD_MM, bleedMm: DEFAULT_BLEED_MM });
  }
}

if (!customElements.get("card-studio-editor")) {
  customElements.define("card-studio-editor", CardStudioEditorElement);
}
