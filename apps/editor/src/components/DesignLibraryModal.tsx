import { useEffect, useState, type MouseEvent } from "react";
import { X, Save, FilePlus, FolderOpen, Trash2 } from "lucide-react";
import type { Design } from "@card-studio/scene-schema";
import { designStorage, type DesignSummary } from "../designStorage";

interface DesignLibraryModalProps {
  design: Design;
  onRename: (name: string) => void;
  onSave: () => void;
  onNew: () => void;
  onLoad: (design: Design) => void;
  onClose: () => void;
}

/**
 * Save/load UI over designStorage — currently localStorage-backed (see
 * that module's doc comment for how this becomes database-backed later
 * without this component changing). Deliberately name-and-list, not a
 * grid with thumbnails: generating a preview image per save is real extra
 * work (a canvas snapshot at save time, kept in sync with edits) that
 * isn't needed for the underlying feature to work.
 */
export function DesignLibraryModal({ design, onRename, onSave, onNew, onLoad, onClose }: DesignLibraryModalProps) {
  const [summaries, setSummaries] = useState<DesignSummary[]>(() => designStorage.list());

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const refresh = () => setSummaries(designStorage.list());

  const handleSave = () => {
    onSave();
    refresh();
  };

  const handleLoad = (id: string) => {
    if (id === design.id) return;
    if (!window.confirm("Load this design? Any unsaved changes to the current one will be lost.")) return;
    const loaded = designStorage.load(id);
    if (loaded) onLoad(loaded);
  };

  const handleDelete = (id: string, name: string, e: MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return;
    designStorage.remove(id);
    refresh();
  };

  const handleNew = () => {
    if (!window.confirm("Start a new blank design? Any unsaved changes to the current one will be lost.")) return;
    onNew();
  };

  return (
    <div
      className="cs-root"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ position: "fixed", inset: 0, background: "var(--cs-backdrop)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
    >
      <div
        style={{
          background: "var(--cs-surface)",
          borderRadius: 12,
          width: "min(480px, 92vw)",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 50px var(--cs-shadow)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--cs-border)" }}>
          <h2 className="cs-heading" style={{ fontSize: 16, fontWeight: 600, margin: 0, flex: 1 }}>Save / load design</h2>
          <button className="cs-icon-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderBottom: "1px solid var(--cs-border)" }}>
          <input
            className="cs-input"
            value={design.name}
            onChange={(e) => onRename(e.target.value)}
            placeholder="Design name"
            style={{ flex: 1 }}
          />
          <button className="cs-btn" onClick={handleSave} title="Save this design">
            <Save size={14} /> Save
          </button>
          <button className="cs-btn" onClick={handleNew} title="Start a new blank design">
            <FilePlus size={14} /> New
          </button>
        </div>

        <div style={{ padding: 8, overflowY: "auto", flex: 1 }}>
          {summaries.length === 0 ? (
            <p style={{ color: "var(--cs-text-muted)", fontSize: 13, padding: "6px 8px" }}>No saved designs yet — click Save above.</p>
          ) : (
            summaries.map((s) => {
              const isCurrent = s.id === design.id;
              return (
                <div
                  key={s.id}
                  data-testid="saved-design-row"
                  onClick={() => handleLoad(s.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 8px",
                    borderRadius: 6,
                    cursor: isCurrent ? "default" : "pointer",
                    background: isCurrent ? "var(--cs-accent-soft)" : "transparent",
                    marginBottom: 2,
                  }}
                >
                  <FolderOpen size={15} color="var(--cs-text-muted)" style={{ flex: "none" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.name}
                      {isCurrent && <span style={{ color: "var(--cs-text-muted)" }}> (current)</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--cs-text-muted)" }}>{new Date(s.updatedAt).toLocaleString()}</div>
                  </div>
                  <button className="cs-icon-btn" title="Delete" onClick={(e) => handleDelete(s.id, s.name, e)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
