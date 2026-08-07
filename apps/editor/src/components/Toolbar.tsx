import { useState } from "react";
import type Konva from "konva";
import type { RefObject } from "react";
import type { Layer } from "@card-studio/scene-schema";
import { Frame, Type, Shapes, ImageUp, Undo2, Redo2, Copy, Trash2, Download, Ruler } from "lucide-react";
import { useDesignStore } from "../store/DesignProvider";
import { PRINT_DPI } from "@card-studio/scene-schema";
import { exportStageToPngDataUrl } from "../export";
import { FrameLibraryModal } from "./FrameLibraryModal";
import { TextTemplateMenu } from "./TextTemplateMenu";
import { MTG_TEXT_TEMPLATES, type TextFieldTemplate } from "../textTemplates";
import { DEFAULT_FONT_FAMILY } from "../config";

function newId(): string {
  return crypto.randomUUID();
}

const fmt = (mm: number) => Number(mm.toFixed(2)).toString();

async function getImageNaturalSize(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

export function Toolbar({ stageRef }: { stageRef: RefObject<Konva.Stage> }) {
  const design = useDesignStore((s) => s.design);
  const addLayer = useDesignStore((s) => s.addLayer);
  const addLayers = useDesignStore((s) => s.addLayers);
  const selectedLayerIds = useDesignStore((s) => s.selectedLayerIds);
  const duplicateLayers = useDesignStore((s) => s.duplicateLayers);
  const removeLayers = useDesignStore((s) => s.removeLayers);
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);
  const canUndo = useDesignStore((s) => s.past.length > 0);
  const canRedo = useDesignStore((s) => s.future.length > 0);
  const showSafeArea = useDesignStore((s) => s.showSafeArea);
  const toggleSafeArea = useDesignStore((s) => s.toggleSafeArea);
  const [showFrameLibrary, setShowFrameLibrary] = useState(false);

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

  const addFrame = (assetId: string) =>
    addLayer({
      id: newId(),
      name: "Frame",
      type: "frame",
      assetId,
      rotationDeg: 0,
      opacity: 1,
      visible: true,
      locked: false,
      // New frames size to the cut/trim dimensions — the actual card —
      // not the full-bleed canvas, centered the same way the cut-line
      // guide is.
      x: (design.size.widthMm - design.size.cutWidthMm) / 2,
      y: (design.size.heightMm - design.size.cutHeightMm) / 2,
      width: design.size.cutWidthMm,
      height: design.size.cutHeightMm,
    });

  const addText = () =>
    addLayer({
      id: newId(),
      name: "Text",
      type: "text",
      content: "New text",
      fontFamily: DEFAULT_FONT_FAMILY,
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

  // MTG_TEXT_TEMPLATES positions are relative to the cut/trim corner, not
  // the full-bleed canvas layers actually live in — offset by the same
  // margin the cut-line guide uses.
  const cutOffsetX = (design.size.widthMm - design.size.cutWidthMm) / 2;
  const cutOffsetY = (design.size.heightMm - design.size.cutHeightMm) / 2;

  const templateToLayer = (template: TextFieldTemplate): Layer => ({
    id: newId(),
    name: template.label,
    type: "text",
    content: template.defaultContent,
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSizePt: template.fontSizePt,
    fontWeight: template.fontWeight,
    color: "#111111",
    align: template.align,
    lineHeight: 1.15,
    overflow: "shrink",
    rotationDeg: 0,
    opacity: 1,
    visible: true,
    locked: false,
    x: cutOffsetX + template.x,
    y: cutOffsetY + template.y,
    width: template.width,
    height: template.height,
  });

  const addTextField = (template: TextFieldTemplate) => addLayer(templateToLayer(template));
  const addAllTextFields = () => addLayers(MTG_TEXT_TEMPLATES.map(templateToLayer));

  const addImage = async (file: File) => {
    const src = URL.createObjectURL(file);
    const { width: naturalWidth, height: naturalHeight } = await getImageNaturalSize(file);
    const imageAspect = naturalWidth / naturalHeight;

    // Default to the image's own aspect ratio, contained within the cut
    // area (centered) rather than a fixed box — a fixed box ignoring the
    // image's shape is what caused new images to render squished.
    const cutW = design.size.cutWidthMm;
    const cutH = design.size.cutHeightMm;
    const width = imageAspect > cutW / cutH ? cutW : cutH * imageAspect;
    const height = imageAspect > cutW / cutH ? cutW / imageAspect : cutH;

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
      x: (design.size.widthMm - width) / 2,
      y: (design.size.heightMm - height) / 2,
      width,
      height,
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
    const dataUrl = exportStageToPngDataUrl(stage, design.size, PRINT_DPI);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${design.name || "card"}.png`;
    link.click();
  };

  return (
    <div className="cs-root" style={{ display: "flex", alignItems: "center", gap: 6, padding: 8, borderBottom: "1px solid var(--cs-border)" }}>
      <button className="cs-btn" onClick={() => setShowFrameLibrary(true)}>
        <Frame size={16} /> Frame
      </button>
      <button className="cs-btn" onClick={addText}>
        <Type size={16} /> Text
      </button>
      <TextTemplateMenu onAdd={addTextField} onAddAll={addAllTextFields} />
      <button className="cs-btn" onClick={addShape}>
        <Shapes size={16} /> Shape
      </button>
      <label className="cs-btn" style={{ cursor: "pointer" }}>
        <ImageUp size={16} /> Image
        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void addImage(file);
            e.target.value = "";
          }}
        />
      </label>

      <div className="cs-divider" />

      <button className="cs-icon-btn" onClick={undo} disabled={!canUndo} title="Undo (Ctrl/Cmd+Z)">
        <Undo2 size={16} />
      </button>
      <button className="cs-icon-btn" onClick={redo} disabled={!canRedo} title="Redo (Ctrl/Cmd+Shift+Z)">
        <Redo2 size={16} />
      </button>
      <button
        className="cs-icon-btn"
        onClick={() => duplicateLayers(selectedLayerIds)}
        disabled={selectedLayerIds.length === 0}
        title="Duplicate (Ctrl/Cmd+D)"
      >
        <Copy size={16} />
      </button>
      <button
        className="cs-icon-btn"
        onClick={() => removeLayers(selectedLayerIds)}
        disabled={selectedLayerIds.length === 0}
        title="Delete (Del)"
      >
        <Trash2 size={16} />
      </button>

      <div style={{ flex: 1 }} />

      <button
        className={`cs-icon-btn${showSafeArea ? " cs-active" : ""}`}
        onClick={toggleSafeArea}
        title="Toggle safe-area guide — nothing critical should sit outside it"
      >
        <Ruler size={16} />
      </button>

      <span
        style={{ alignSelf: "center", color: "var(--cs-text-muted)", fontSize: 12, cursor: "help" }}
        title={
          `Cut (final card): ${fmt(design.size.cutWidthMm)}×${fmt(design.size.cutHeightMm)}mm\n` +
          `Full bleed (art must extend to here): ${fmt(design.size.widthMm)}×${fmt(design.size.heightMm)}mm\n` +
          `Safe area (toggle above): ${fmt(design.size.safeWidthMm)}×${fmt(design.size.safeHeightMm)}mm`
        }
      >
        Cut {fmt(design.size.cutWidthMm)}×{fmt(design.size.cutHeightMm)}mm · bleed to {fmt(design.size.widthMm)}×
        {fmt(design.size.heightMm)}mm
      </span>
      <button className="cs-btn" onClick={handleExport} title={`Export PNG at ${PRINT_DPI} DPI`}>
        <Download size={16} /> Export ({PRINT_DPI} DPI)
      </button>

      {showFrameLibrary && (
        <FrameLibraryModal
          onSelect={(assetId) => {
            addFrame(assetId);
            setShowFrameLibrary(false);
          }}
          onClose={() => setShowFrameLibrary(false)}
        />
      )}
    </div>
  );
}
