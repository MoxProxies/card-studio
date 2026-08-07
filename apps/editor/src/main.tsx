import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createEmptyDesign, STANDARD_CARD_MM, DEFAULT_BLEED_MM } from "@card-studio/scene-schema";
import { DesignProvider } from "./store/DesignProvider";
import { App } from "./App";

const design = createEmptyDesign(crypto.randomUUID(), {
  ...STANDARD_CARD_MM,
  bleedMm: DEFAULT_BLEED_MM,
});

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root element not found");

document.body.style.height = "100vh";
document.body.style.margin = "0";
rootEl.style.height = "100%";

createRoot(rootEl).render(
  <StrictMode>
    <DesignProvider initialDesign={design}>
      <App />
    </DesignProvider>
  </StrictMode>
);
