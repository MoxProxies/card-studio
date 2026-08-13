import { useCallback, useRef, useState } from "react";
import type Konva from "konva";
import { CanvasStage } from "./components/CanvasStage";
import { Toolbar } from "./components/Toolbar";
import { LayerPanel } from "./components/LayerPanel";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { ResizeHandle } from "./components/ResizeHandle";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useFullscreenLightbox } from "./hooks/useFullscreenLightbox";

// Above anything a host page could plausibly stack above it — this is a
// deliberate lightbox, meant to sit on top of the entire page regardless of
// whatever z-indexes the embedding site's own nav/modals use.
const FULLSCREEN_Z_INDEX = 2147483647;

const PANEL_MIN_WIDTH = 180;
const PANEL_MAX_WIDTH = 520;
// The card/working area is flex:1 (takes whatever's left), so only the two
// side panels need explicit widths. Properties panel defaults wider than
// layers — its two-column numeric fields are what overflowed before
// cs-input had width:100%; keeping the default roomy avoids reintroducing
// that by accident on a narrower browser window. Layer panel widened from
// 220 for grouping (LayerPanel.tsx): a group header row's drag handle +
// folder icon + name + visible/lock/ungroup/delete buttons is
// meaningfully wider than a plain layer row ever was — 220 truncated
// almost every label down to a couple of characters.
const DEFAULT_LAYER_PANEL_WIDTH = 260;
const DEFAULT_PROPERTIES_PANEL_WIDTH = 300;

const clamp = (value: number) => Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, value));

export function App() {
  const stageRef = useRef<Konva.Stage>(null);
  const [layerPanelWidth, setLayerPanelWidth] = useState(DEFAULT_LAYER_PANEL_WIDTH);
  const [propertiesPanelWidth, setPropertiesPanelWidth] = useState(DEFAULT_PROPERTIES_PANEL_WIDTH);
  const [isFullscreen, setIsFullscreen] = useState(false);
  useKeyboardShortcuts();
  useFullscreenLightbox(
    isFullscreen,
    useCallback(() => setIsFullscreen(false), [])
  );

  return (
    <div
      className="cs-root"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "system-ui, sans-serif",
        // position:fixed escapes whatever height/width the host page's own
        // layout constrains the embed to (see embed.ts) — a shadow root
        // doesn't create a new containing block for fixed positioning, so
        // this covers the real viewport regardless of how the custom
        // element itself is sized on the page.
        ...(isFullscreen ? { position: "fixed" as const, inset: 0, zIndex: FULLSCREEN_Z_INDEX } : {}),
      }}
    >
      <Toolbar stageRef={stageRef} isFullscreen={isFullscreen} onToggleFullscreen={() => setIsFullscreen((v) => !v)} />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <CanvasStage stageRef={stageRef} />
        </div>

        {/* Each handle owns the panel to its right: dragging right shrinks
            that panel (and grows whatever's to the left); dragging left
            grows it. The canvas area (flex:1) absorbs the difference. */}
        <ResizeHandle onDrag={(dx) => setLayerPanelWidth((w) => clamp(w - dx))} />
        <LayerPanel width={layerPanelWidth} />

        <ResizeHandle onDrag={(dx) => setPropertiesPanelWidth((w) => clamp(w - dx))} />
        <PropertiesPanel width={propertiesPanelWidth} />
      </div>
    </div>
  );
}
