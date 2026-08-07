import { useEffect, useMemo, useState } from "react";
import { X, Search } from "lucide-react";
import { FRAME_ASSETS, FRAME_CATEGORIES } from "../frameAssets";

interface FrameLibraryModalProps {
  onSelect: (assetId: string) => void;
  onClose: () => void;
}

/** Full browser for the frame catalog: a category dropdown and a search box
 * that filter concurrently, over a directory of frames synced from
 * frame-library/ (see scripts/sync-frame-library.mjs). */
export function FrameLibraryModal({ onSelect, onClose }: FrameLibraryModalProps) {
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return FRAME_ASSETS.filter((asset) => {
      if (category && asset.category !== category) return false;
      if (query && !asset.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [category, search]);

  return (
    <div
      className="cs-root"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "var(--cs-surface)",
          borderRadius: 12,
          width: "min(720px, 92vw)",
          maxHeight: "84vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--cs-border)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, flex: 1 }}>Frame library</h2>
          <button className="cs-icon-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderBottom: "1px solid var(--cs-border)" }}>
          <select className="cs-input" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: 160 }}>
            <option value="">All folders</option>
            {FRAME_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {FRAME_ASSETS.find((a) => a.category === c)?.categoryLabel ?? c}
              </option>
            ))}
          </select>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={14} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--cs-text-muted)" }} />
            <input
              className="cs-input"
              placeholder="Search frames…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", paddingLeft: 28 }}
              autoFocus
            />
          </div>
        </div>

        <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
          {filtered.length === 0 ? (
            <p style={{ color: "var(--cs-text-muted)", fontSize: 13 }}>No frames match.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 12 }}>
              {filtered.map((asset) => (
                <button
                  key={asset.id}
                  className="cs-swatch"
                  onClick={() => onSelect(asset.id)}
                  title={`${asset.categoryLabel} / ${asset.name}`}
                  style={{ display: "flex", flexDirection: "column", gap: 4, padding: 6 }}
                >
                  <div style={{ aspectRatio: "63 / 88", overflow: "hidden", borderRadius: 4, background: "#f3f4f6" }}>
                    <img
                      src={`/frames/${asset.category}/${asset.fileName}`}
                      alt={asset.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </div>
                  <span style={{ fontSize: 11, color: "var(--cs-text)", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {asset.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
