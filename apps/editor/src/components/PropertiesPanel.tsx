import type { ChangeEvent, CSSProperties } from "react";
import type { Layer } from "@card-studio/scene-schema";
import { useDesignStore } from "../store/DesignProvider";

const FONT_OPTIONS = ["Inter", "Arial", "Georgia", "Times New Roman", "Courier New", "Trebuchet MS"];

const panelStyle: CSSProperties = {
  width: 260,
  borderLeft: "1px solid #e5e7eb",
  padding: 12,
  overflowY: "auto",
  fontSize: 13,
};
const headingStyle: CSSProperties = { fontSize: 13, fontWeight: 600, margin: "0 0 10px" };
const fieldRowStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 3, marginBottom: 8 };
const twoColStyle: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 };
const labelStyle: CSSProperties = { color: "#6b7280", fontSize: 11 };

export function PropertiesPanel() {
  const design = useDesignStore((s) => s.design);
  const selectedLayerIds = useDesignStore((s) => s.selectedLayerIds);
  const commitLayerChange = useDesignStore((s) => s.commitLayerChange);
  const commitLayerChanges = useDesignStore((s) => s.commitLayerChanges);
  const beginLiveEdit = useDesignStore((s) => s.beginLiveEdit);
  const updateLayerLive = useDesignStore((s) => s.updateLayerLive);
  const commitLiveEdit = useDesignStore((s) => s.commitLiveEdit);
  const removeLayers = useDesignStore((s) => s.removeLayers);
  const duplicateLayers = useDesignStore((s) => s.duplicateLayers);

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
      <div style={panelStyle} data-testid="properties-panel">
        <p style={{ color: "#9ca3af", fontSize: 12 }}>Select a layer to edit its properties.</p>
      </div>
    );
  }

  if (selectedLayers.length > 1) {
    return (
      <div style={panelStyle} data-testid="properties-panel">
        <h3 style={headingStyle} data-testid="multi-select-heading">{selectedLayers.length} layers selected</h3>
        <div style={fieldRowStyle}>
          <span style={labelStyle}>Align to card</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button title="Align left" onClick={() => alignTo("x", "start")}>⇤</button>
            <button title="Center horizontally" onClick={() => alignTo("x", "center")}>↔</button>
            <button title="Align right" onClick={() => alignTo("x", "end")}>⇥</button>
            <button title="Align top" onClick={() => alignTo("y", "start")}>⇡</button>
            <button title="Center vertically" onClick={() => alignTo("y", "center")}>↕</button>
            <button title="Align bottom" onClick={() => alignTo("y", "end")}>⇣</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <button onClick={() => duplicateLayers(selectedLayerIds)}>Duplicate</button>
          <button onClick={() => removeLayers(selectedLayerIds)}>Delete</button>
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
    <div style={panelStyle} data-testid="properties-panel">
      <h3 style={headingStyle}>{layer.name}</h3>

      <div style={fieldRowStyle}>
        <span style={labelStyle}>Name</span>
        <input {...liveText("name")} />
      </div>

      <div style={twoColStyle}>
        <div style={fieldRowStyle}>
          <span style={labelStyle}>X (mm)</span>
          <input {...liveNumber("x")} />
        </div>
        <div style={fieldRowStyle}>
          <span style={labelStyle}>Y (mm)</span>
          <input {...liveNumber("y")} />
        </div>
        <div style={fieldRowStyle}>
          <span style={labelStyle}>Width (mm)</span>
          <input {...liveNumber("width")} />
        </div>
        <div style={fieldRowStyle}>
          <span style={labelStyle}>Height (mm)</span>
          <input {...liveNumber("height")} />
        </div>
        <div style={fieldRowStyle}>
          <span style={labelStyle}>Rotation (°)</span>
          <input {...liveNumber("rotationDeg", 1)} />
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

      <div style={{ display: "flex", gap: 12, margin: "8px 0" }}>
        <label style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 12 }}>
          <input
            type="checkbox"
            checked={layer.visible}
            onChange={(e) => commitLayerChange(layer.id, { visible: e.target.checked })}
          />
          Visible
        </label>
        <label style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 12 }}>
          <input
            type="checkbox"
            checked={layer.locked}
            onChange={(e) => commitLayerChange(layer.id, { locked: e.target.checked })}
          />
          Locked
        </label>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "10px 0" }} />

      {layer.type === "frame" && (
        <>
          <div style={fieldRowStyle}>
            <span style={labelStyle}>Asset id (no library yet)</span>
            <input value={layer.assetId} disabled />
          </div>
          <div style={fieldRowStyle}>
            <span style={labelStyle}>Tint</span>
            <input {...liveColor("tint", layer.tint ?? "#e5e7eb")} />
          </div>
        </>
      )}

      {layer.type === "text" && (
        <>
          <div style={fieldRowStyle}>
            <span style={labelStyle}>Content</span>
            <textarea
              rows={3}
              value={layer.content}
              onFocus={beginLiveEdit}
              onChange={(e) => updateLayerLive(layer.id, { content: e.target.value })}
              onBlur={commitLiveEdit}
            />
          </div>
          <div style={fieldRowStyle}>
            <span style={labelStyle}>Font</span>
            <select value={layer.fontFamily} onChange={(e) => commitLayerChange(layer.id, { fontFamily: e.target.value })}>
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div style={twoColStyle}>
            <div style={fieldRowStyle}>
              <span style={labelStyle}>Size (pt)</span>
              <input
                type="number"
                min={4}
                value={layer.fontSizePt}
                onFocus={beginLiveEdit}
                onChange={(e) => updateLayerLive(layer.id, { fontSizePt: Number(e.target.value) })}
                onBlur={commitLiveEdit}
              />
            </div>
            <div style={fieldRowStyle}>
              <span style={labelStyle}>Weight</span>
              <select
                value={layer.fontWeight === "bold" ? "bold" : "normal"}
                onChange={(e) => commitLayerChange(layer.id, { fontWeight: e.target.value === "bold" ? "bold" : "normal" })}
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
              </select>
            </div>
          </div>
          <div style={twoColStyle}>
            <div style={fieldRowStyle}>
              <span style={labelStyle}>Line height</span>
              <input
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
              {(["left", "center", "right"] as const).map((align) => (
                <button
                  key={align}
                  onClick={() => commitLayerChange(layer.id, { align })}
                  style={{ fontWeight: layer.align === align ? 700 : 400 }}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>
          <div style={fieldRowStyle}>
            <span style={labelStyle}>Overflow</span>
            <select
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
    </div>
  );
}
