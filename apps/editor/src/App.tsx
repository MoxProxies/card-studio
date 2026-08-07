import { useRef, useState } from "react";
import type Konva from "konva";
import { CanvasStage } from "./components/CanvasStage";
import { Toolbar } from "./components/Toolbar";
import { LayerPanel } from "./components/LayerPanel";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { ResizeHandle } from "./components/ResizeHandle";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

const PANEL_MIN_WIDTH = 180;
const PANEL_MAX_WIDTH = 520;
// The card/working area is flex:1 (takes whatever's left), so only the two
// side panels need explicit widths. Properties panel defaults wider than
// layers — its two-column numeric fields are what overflowed before
// cs-input had width:100%; keeping the default roomy avoids reintroducing
// that by accident on a narrower browser window.
const DEFAULT_LAYER_PANEL_WIDTH = 220;
const DEFAULT_PROPERTIES_PANEL_WIDTH = 300;

const clamp = (value: number) => Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, value));

export function App() {
  const stageRef = useRef<Konva.Stage>(null);
  const [layerPanelWidth, setLayerPanelWidth] = useState(DEFAULT_LAYER_PANEL_WIDTH);
  const [propertiesPanelWidth, setPropertiesPanelWidth] = useState(DEFAULT_PROPERTIES_PANEL_WIDTH);
  useKeyboardShortcuts();

  return (
    <div className="cs-root" style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "system-ui, sans-serif" }}>
      <Toolbar stageRef={stageRef} />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", overflow: "auto" }}>
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
