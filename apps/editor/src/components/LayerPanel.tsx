import { Frame, Type, Shapes, Image as ImageIcon, ChevronUp, ChevronDown, Trash2, Eye, EyeOff, Lock, Unlock } from "lucide-react";
import type { Layer } from "@card-studio/scene-schema";
import { useDesignStore } from "../store/DesignProvider";

const TYPE_ICONS: Record<Layer["type"], typeof Frame> = {
  frame: Frame,
  text: Type,
  shape: Shapes,
  image: ImageIcon,
};

export function LayerPanel() {
  const layers = useDesignStore((s) => s.design.layers);
  const selectedLayerIds = useDesignStore((s) => s.selectedLayerIds);
  const selectOnly = useDesignStore((s) => s.selectOnly);
  const toggleSelect = useDesignStore((s) => s.toggleSelect);
  const removeLayers = useDesignStore((s) => s.removeLayers);
  const moveLayer = useDesignStore((s) => s.moveLayer);
  const commitLayerChange = useDesignStore((s) => s.commitLayerChange);

  return (
    <div className="cs-root" style={{ width: 240, borderLeft: "1px solid var(--cs-border)", padding: 8, overflowY: "auto" }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, margin: "4px 0 8px" }}>Layers</h3>
      {[...layers].reverse().map((layer) => {
        const isSelected = selectedLayerIds.includes(layer.id);
        const TypeIcon = TYPE_ICONS[layer.type];
        return (
          <div
            key={layer.id}
            data-testid="layer-row"
            data-layer-id={layer.id}
            onClick={(e) => (e.shiftKey ? toggleSelect(layer.id) : selectOnly(layer.id))}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "5px 6px",
              borderRadius: 6,
              marginBottom: 2,
              cursor: "pointer",
              background: isSelected ? "var(--cs-accent-soft)" : "transparent",
              fontSize: 13,
            }}
          >
            <TypeIcon size={14} color="var(--cs-text-muted)" style={{ flex: "none" }} />
            <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {layer.name}
            </span>
            <button
              className="cs-icon-btn"
              style={{ width: 22, height: 22 }}
              title={layer.visible ? "Hide" : "Show"}
              onClick={(e) => {
                e.stopPropagation();
                commitLayerChange(layer.id, { visible: !layer.visible });
              }}
            >
              {layer.visible ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
            <button
              className="cs-icon-btn"
              style={{ width: 22, height: 22 }}
              title={layer.locked ? "Unlock" : "Lock"}
              onClick={(e) => {
                e.stopPropagation();
                commitLayerChange(layer.id, { locked: !layer.locked });
              }}
            >
              {layer.locked ? <Lock size={13} /> : <Unlock size={13} />}
            </button>
            <button
              className="cs-icon-btn"
              style={{ width: 22, height: 22 }}
              title="Move up"
              onClick={(e) => {
                e.stopPropagation();
                moveLayer(layer.id, "up");
              }}
            >
              <ChevronUp size={14} />
            </button>
            <button
              className="cs-icon-btn"
              style={{ width: 22, height: 22 }}
              title="Move down"
              onClick={(e) => {
                e.stopPropagation();
                moveLayer(layer.id, "down");
              }}
            >
              <ChevronDown size={14} />
            </button>
            <button
              className="cs-icon-btn"
              style={{ width: 22, height: 22 }}
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();
                removeLayers([layer.id]);
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        );
      })}
      {layers.length === 0 && <p style={{ color: "var(--cs-text-muted)", fontSize: 12 }}>No layers yet.</p>}
    </div>
  );
}
