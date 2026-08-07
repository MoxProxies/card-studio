import { useState, type ChangeEvent, type CSSProperties } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  Copy,
  Trash2,
  ImageOff,
} from "lucide-react";
import type { Layer } from "@card-studio/scene-schema";
import { useDesignStore } from "../store/DesignProvider";
import { getFrameAsset } from "../frameAssets";
import { EMBEDDED_FONT_FAMILIES, SYSTEM_FONT_FALLBACKS } from "../fontAssets";
import { FrameLibraryModal } from "./FrameLibraryModal";

const getPanelStyle = (width: number): CSSProperties => ({
  width,
  flex: "none",
  minWidth: 0,
  borderLeft: "1px solid var(--cs-border)",
  padding: 12,
  overflowY: "auto",
  overflowX: "hidden",
  fontSize: 13,
});
const headingStyle: CSSProperties = { fontSize: 13, fontWeight: 600, margin: "0 0 10px" };
const fieldRowStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 3, marginBottom: 8, minWidth: 0 };
const twoColStyle: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, minWidth: 0 };
const labelStyle: CSSProperties = { color: "var(--cs-text-muted)", fontSize: 11 };

export function PropertiesPanel({ width }: { width: number }) {
  const design = useDesignStore((s) => s.design);
  const selectedLayerIds = useDesignStore((s) => s.selectedLayerIds);
  const commitLayerChange = useDesignStore((s) => s.commitLayerChange);
  const commitLayerChanges = useDesignStore((s) => s.commitLayerChanges);
  const beginLiveEdit = useDesignStore((s) => s.beginLiveEdit);
  const updateLayerLive = useDesignStore((s) => s.updateLayerLive);
  const commitLiveEdit = useDesignStore((s) => s.commitLiveEdit);
  const removeLayers = useDesignStore((s) => s.removeLayers);
  const duplicateLayers = useDesignStore((s) => s.duplicateLayers);
  const [showFrameLibrary, setShowFrameLibrary] = useState(false);

  const selectedLayers = design.layers.filter((l) => selectedLayerIds.includes(l.id));

  const alignTo = (axis: "x" | "y", mode: "start" | "center" | "end") => {
    const entries = selectedLayers.map((l) => {
      if (axis === "x") {
        const x =
          mode === "start" ? 0 : mode === "center" ? (design.size.widthMm - l.width) / 2 : design.size.widthMm - l.width;
        return { id: l.id, patch: { x } };
      }
      const y =
        mode === "start" ? 0 : mode === "center" ? (design.size.heightMm - l.height) / 2 : design.size.heightMm - l.height;
      return { id: l.id, patch: { y } };
    });
    commitLayerChanges(entries);
  };

  if (selectedLayers.length === 0) {
    return (
      <div className="cs-root" style={getPanelStyle(width)} data-testid="properties-panel">
        <p style={{ color: "var(--cs-text-muted)", fontSize: 12 }}>Select a layer to edit its properties.</p>
      </div>
    );
  }

  if (selectedLayers.length > 1) {
    return (
      <div className="cs-root" style={getPanelStyle(width)} data-testid="properties-panel">
        <h3 style={headingStyle} data-testid="multi-select-heading">{selectedLayers.length} layers selected</h3>
        <div style={fieldRowStyle}>
          <span style={labelStyle}>Align to card</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="cs-icon-btn" title="Align left" onClick={() => alignTo("x", "start")}>
              <AlignHorizontalJustifyStart size={15} />
            </button>
            <button className="cs-icon-btn" title="Center horizontally" onClick={() => alignTo("x", "center")}>
              <AlignHorizontalJustifyCenter size={15} />
            </button>
            <button className="cs-icon-btn" title="Align right" onClick={() => alignTo("x", "end")}>
              <AlignHorizontalJustifyEnd size={15} />
            </button>
            <button className="cs-icon-btn" title="Align top" onClick={() => alignTo("y", "start")}>
              <AlignVerticalJustifyStart size={15} />
            </button>
            <button className="cs-icon-btn" title="Center vertically" onClick={() => alignTo("y", "center")}>
              <AlignVerticalJustifyCenter size={15} />
            </button>
            <button className="cs-icon-btn" title="Align bottom" onClick={() => alignTo("y", "end")}>
              <AlignVerticalJustifyEnd size={15} />
            </button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <button className="cs-btn" onClick={() => duplicateLayers(selectedLayerIds)}>
            <Copy size={14} /> Duplicate
          </button>
          <button className="cs-btn" onClick={() => removeLayers(selectedLayerIds)}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
    );
  }

  const layer = selectedLayers[0]!;

  const liveText = (key: "name") => ({
    value: layer[key],
    onFocus: beginLiveEdit,
    onChange: (e: ChangeEvent<HTMLInputElement>) => updateLayerLive(layer.id, { [key]: e.target.value } as Partial<Layer>),
    onBlur: commitLiveEdit,
  });

  const liveNumber = (key: "x" | "y" | "width" | "height" | "rotationDeg", step = 0.1) => ({
    type: "number" as const,
    value: Number((layer[key] as number).toFixed(2)),
    step,
    onFocus: beginLiveEdit,
    onChange: (e: ChangeEvent<HTMLInputElement>) => updateLayerLive(layer.id, { [key]: Number(e.target.value) } as Partial<Layer>),
    onBlur: commitLiveEdit,
  });

  const liveColor = (key: string, value: string) => ({
    type: "color" as const,
    value,
    onFocus: beginLiveEdit,
    onChange: (e: ChangeEvent<HTMLInputElement>) => updateLayerLive(layer.id, { [key]: e.target.value } as Partial<Layer>),
    onBlur: commitLiveEdit,
  });

  return (
    <div className="cs-root" style={getPanelStyle(width)} data-testid="properties-panel">
      <h3 style={headingStyle}>{layer.name}</h3>

      <div style={fieldRowStyle}>
        <span style={labelStyle}>Name</span>
        <input className="cs-input" {...liveText("name")} />
      </div>

      <div style={twoColStyle}>
        <div style={fieldRowStyle}>
          <span style={labelStyle}>X (mm)</span>
          <input className="cs-input" {...liveNumber("x")} />
        </div>
        <div style={fieldRowStyle}>
          <span style={labelStyle}>Y (mm)</span>
          <input className="cs-input" {...liveNumber("y")} />
        </div>
        <div style={fieldRowStyle}>
          <span style={labelStyle}>Width (mm)</span>
          <input className="cs-input" {...liveNumber("width")} />
        </div>
        <div style={fieldRowStyle}>
          <span style={labelStyle}>Height (mm)</span>
          <input className="cs-input" {...liveNumber("height")} />
        </div>
        <div style={fieldRowStyle}>
          <span style={labelStyle}>Rotation (°)</span>
          <input className="cs-input" {...liveNumber("rotationDeg", 1)} />
        </div>
        <div style={fieldRowStyle}>
          <span style={labelStyle}>Opacity</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={layer.opacity}
            onFocus={beginLiveEdit}
            onChange={(e) => updateLayerLive(layer.id, { opacity: Number(e.target.value) })}
            onMouseUp={commitLiveEdit}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, margin: "8px 0" }}>
        <button
          className={`cs-icon-btn${layer.visible ? " cs-active" : ""}`}
          title={layer.visible ? "Visible (click to hide)" : "Hidden (click to show)"}
          onClick={() => commitLayerChange(layer.id, { visible: !layer.visible })}
        >
          {layer.visible ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
        <button
          className={`cs-icon-btn${layer.locked ? " cs-active" : ""}`}
          title={layer.locked ? "Locked (click to unlock)" : "Unlocked (click to lock)"}
          onClick={() => commitLayerChange(layer.id, { locked: !layer.locked })}
        >
          {layer.locked ? <Lock size={15} /> : <Unlock size={15} />}
        </button>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--cs-border)", margin: "10px 0" }} />

      {layer.type === "frame" && (
        <>
          <div style={fieldRowStyle}>
            <span style={labelStyle}>Frame</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 44, aspectRatio: "63 / 88", borderRadius: 6, overflow: "hidden", background: "#f3f4f6", flex: "none" }}>
                {(() => {
                  const asset = getFrameAsset(layer.assetId);
                  return asset ? (
                    <img
                      src={`/frames/${asset.category}/${asset.fileName}`}
                      alt={asset.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ImageOff size={16} color="var(--cs-text-muted)" />
                    </div>
                  );
                })()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {getFrameAsset(layer.assetId)?.name ?? layer.assetId}
                </div>
                <button className="cs-btn" style={{ marginTop: 4, fontSize: 12, padding: "4px 8px" }} onClick={() => setShowFrameLibrary(true)}>
                  Change frame…
                </button>
              </div>
            </div>
          </div>
          <div style={fieldRowStyle}>
            <span style={labelStyle}>Tint override</span>
            <input {...liveColor("tint", layer.tint ?? "#e5e7eb")} />
          </div>
        </>
      )}

      {layer.type === "text" && (
        <>
          <div style={fieldRowStyle}>
            <span style={labelStyle}>Content</span>
            <textarea
              className="cs-input"
              rows={3}
              value={layer.content}
              onFocus={beginLiveEdit}
              onChange={(e) => updateLayerLive(layer.id, { content: e.target.value })}
              onBlur={commitLiveEdit}
            />
          </div>
          <div style={fieldRowStyle}>
            <span style={labelStyle}>Font</span>
            <select
              className="cs-input"
              value={layer.fontFamily}
              onChange={(e) => commitLayerChange(layer.id, { fontFamily: e.target.value })}
            >
              <optgroup label="Embedded">
                {EMBEDDED_FONT_FAMILIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </optgroup>
              <optgroup label="System (may not print consistently)">
                {SYSTEM_FONT_FALLBACKS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          <div style={twoColStyle}>
            <div style={fieldRowStyle}>
              <span style={labelStyle}>Size (pt)</span>
              <input
                className="cs-input"
                type="number"
                min={4}
                value={layer.fontSizePt}
                onFocus={beginLiveEdit}
                onChange={(e) => updateLayerLive(layer.id, { fontSizePt: Number(e.target.value) })}
                onBlur={commitLiveEdit}
              />
            </div>
            <div style={fieldRowStyle}>
              <span style={labelStyle}>Style</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  className={`cs-icon-btn${layer.fontWeight === "bold" ? " cs-active" : ""}`}
                  title="Bold"
                  onClick={() => commitLayerChange(layer.id, { fontWeight: layer.fontWeight === "bold" ? "normal" : "bold" })}
                >
                  <Bold size={15} />
                </button>
                <button
                  className={`cs-icon-btn${layer.italic ? " cs-active" : ""}`}
                  title="Italic — uses the font's real italic file if the embedded family has one, otherwise a slanted (synthetic) italic"
                  onClick={() => commitLayerChange(layer.id, { italic: !layer.italic })}
                >
                  <Italic size={15} />
                </button>
              </div>
            </div>
          </div>
          <div style={twoColStyle}>
            <div style={fieldRowStyle}>
              <span style={labelStyle}>Line height</span>
              <input
                className="cs-input"
                type="number"
                min={0.8}
                step={0.1}
                value={layer.lineHeight}
                onFocus={beginLiveEdit}
                onChange={(e) => updateLayerLive(layer.id, { lineHeight: Number(e.target.value) })}
                onBlur={commitLiveEdit}
              />
            </div>
            <div style={fieldRowStyle}>
              <span style={labelStyle}>Color</span>
              <input {...liveColor("color", layer.color)} />
            </div>
          </div>
          <div style={fieldRowStyle}>
            <span style={labelStyle}>Align</span>
            <div style={{ display: "flex", gap: 4 }}>
              {(
                [
                  ["left", AlignLeft],
                  ["center", AlignCenter],
                  ["right", AlignRight],
                ] as const
              ).map(([align, Icon]) => (
                <button
                  key={align}
                  className={`cs-icon-btn${layer.align === align ? " cs-active" : ""}`}
                  title={`Align ${align}`}
                  onClick={() => commitLayerChange(layer.id, { align })}
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>
          <div style={fieldRowStyle}>
            <span style={labelStyle}>Overflow</span>
            <select
              className="cs-input"
              value={layer.overflow}
              onChange={(e) => commitLayerChange(layer.id, { overflow: e.target.value as "shrink" | "clip" | "visible" })}
            >
              <option value="shrink">Shrink to fit</option>
              <option value="clip">Clip</option>
              <option value="visible">Visible</option>
            </select>
          </div>
        </>
      )}

      {layer.type === "image" && (
        <div style={fieldRowStyle}>
          <span style={labelStyle}>Fit</span>
          <select
            className="cs-input"
            value={layer.fit}
            onChange={(e) => commitLayerChange(layer.id, { fit: e.target.value as "cover" | "contain" | "fill" })}
          >
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
            <option value="fill">Fill</option>
          </select>
        </div>
      )}

      {layer.type === "shape" && (
        <div style={twoColStyle}>
          <div style={fieldRowStyle}>
            <span style={labelStyle}>Fill</span>
            <input {...liveColor("fill", layer.fill ?? "#000000")} />
          </div>
          <div style={fieldRowStyle}>
            <span style={labelStyle}>Stroke</span>
            <input {...liveColor("stroke", layer.stroke ?? "#000000")} />
          </div>
        </div>
      )}

      {showFrameLibrary && layer.type === "frame" && (
        <FrameLibraryModal
          onSelect={(assetId) => {
            commitLayerChange(layer.id, { assetId });
            setShowFrameLibrary(false);
          }}
          onClose={() => setShowFrameLibrary(false)}
        />
      )}
    </div>
  );
}
