import { useRef } from "react";
import type Konva from "konva";
import { CanvasStage } from "./components/CanvasStage";
import { Toolbar } from "./components/Toolbar";
import { LayerPanel } from "./components/LayerPanel";

export function App() {
  const stageRef = useRef<Konva.Stage>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "system-ui, sans-serif" }}>
      <Toolbar stageRef={stageRef} />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", overflow: "auto" }}>
          <CanvasStage stageRef={stageRef} />
        </div>
        <LayerPanel />
      </div>
    </div>
  );
}
