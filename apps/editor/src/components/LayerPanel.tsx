import { useDesignStore } from "../store/DesignProvider";

export function LayerPanel() {
  const layers = useDesignStore((s) => s.design.layers);
  const selectedLayerId = useDesignStore((s) => s.selectedLayerId);
  const selectLayer = useDesignStore((s) => s.selectLayer);
  const removeLayer = useDesignStore((s) => s.removeLayer);
  const moveLayer = useDesignStore((s) => s.moveLayer);

  return (
    <div style={{ width: 220, borderLeft: "1px solid #e5e7eb", padding: 8, overflowY: "auto" }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, margin: "4px 0 8px" }}>Layers</h3>
      {[...layers].reverse().map((layer) => (
        <div
          key={layer.id}
          onClick={() => selectLayer(layer.id)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 8px",
            borderRadius: 6,
            marginBottom: 4,
            cursor: "pointer",
            background: layer.id === selectedLayerId ? "#eef2ff" : "transparent",
            fontSize: 13,
          }}
        >
          <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {layer.name}
          </span>
          <button title="Move up" onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, "up"); }}>
            ↑
          </button>
          <button title="Move down" onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, "down"); }}>
            ↓
          </button>
          <button title="Delete" onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}>
            ✕
          </button>
        </div>
      ))}
      {layers.length === 0 && <p style={{ color: "#9ca3af", fontSize: 12 }}>No layers yet.</p>}
    </div>
  );
}
