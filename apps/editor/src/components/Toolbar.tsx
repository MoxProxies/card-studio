import type Konva from "konva";
import type { RefObject } from "react";
import { useDesignStore } from "../store/DesignProvider";
import { PRINT_DPI } from "@card-studio/scene-schema";
import { exportStageToPngDataUrl } from "../export";

function newId(): string {
  return crypto.randomUUID();
}

export function Toolbar({ stageRef }: { stageRef: RefObject<Konva.Stage> }) {
  const design = useDesignStore((s) => s.design);
  const addLayer = useDesignStore((s) => s.addLayer);
  const selectedLayerIds = useDesignStore((s) => s.selectedLayerIds);
  const duplicateLayers = useDesignStore((s) => s.duplicateLayers);
  const removeLayers = useDesignStore((s) => s.removeLayers);
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);
  const canUndo = useDesignStore((s) => s.past.length > 0);
  const canRedo = useDesignStore((s) => s.future.length > 0);

  const centerBox = () => {
    const w = design.size.widthMm * 0.6;
    const h = design.size.heightMm * 0.2;
    return {
      x: (design.size.widthMm - w) / 2,
      y: (design.size.heightMm - h) / 2,
      width: w,
      height: h,
    };
  };

  const addFrame = () =>
    addLayer({
      id: newId(),
      name: "Frame",
      type: "frame",
      assetId: "placeholder-frame",
      rotationDeg: 0,
      opacity: 1,
      visible: true,
      locked: false,
      x: 0,
      y: 0,
      width: design.size.widthMm,
      height: design.size.heightMm,
    });

  const addText = () =>
    addLayer({
      id: newId(),
      name: "Text",
      type: "text",
      content: "New text",
      fontFamily: "Inter",
      fontSizePt: 14,
      fontWeight: "normal",
      color: "#111111",
      align: "left",
      lineHeight: 1.2,
      overflow: "shrink",
      rotationDeg: 0,
      opacity: 1,
      visible: true,
      locked: false,
      ...centerBox(),
    });

  const addImage = (file: File) => {
    const src = URL.createObjectURL(file);
    addLayer({
      id: newId(),
      name: file.name,
      type: "image",
      src,
      fit: "cover",
      rotationDeg: 0,
      opacity: 1,
      visible: true,
      locked: false,
      ...centerBox(),
    });
  };

  const addShape = () =>
    addLayer({
      id: newId(),
      name: "Shape",
      type: "shape",
      shape: "rect",
      fill: "#93c5fd",
      strokeWidthMm: 0,
      cornerRadiusMm: 0,
      rotationDeg: 0,
      opacity: 1,
      visible: true,
      locked: false,
      ...centerBox(),
    });

  const handleExport = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const dataUrl = exportStageToPngDataUrl(stage, PRINT_DPI);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${design.name || "card"}.png`;
    link.click();
  };

  return (
    <div style={{ display: "flex", gap: 8, padding: 8, borderBottom: "1px solid #e5e7eb" }}>
      <button onClick={addFrame}>+ Frame</button>
      <button onClick={addText}>+ Text</button>
      <button onClick={addShape}>+ Shape</button>
      <label style={{ cursor: "pointer" }}>
        + Image
        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) addImage(file);
            e.target.value = "";
          }}
        />
      </label>

      <div style={{ width: 1, background: "#e5e7eb", margin: "0 4px" }} />

      <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl/Cmd+Z)">
        ↩ Undo
      </button>
      <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl/Cmd+Shift+Z)">
        ↪ Redo
      </button>
      <button onClick={() => duplicateLayers(selectedLayerIds)} disabled={selectedLayerIds.length === 0} title="Duplicate (Ctrl/Cmd+D)">
        Duplicate
      </button>
      <button onClick={() => removeLayers(selectedLayerIds)} disabled={selectedLayerIds.length === 0} title="Delete (Del)">
        Delete
      </button>

      <div style={{ flex: 1 }} />
      <span style={{ alignSelf: "center", color: "#6b7280", fontSize: 12 }}>
        {design.size.widthMm}×{design.size.heightMm}mm
      </span>
      <button onClick={handleExport}>Export PNG ({PRINT_DPI} DPI)</button>
    </div>
  );
}
