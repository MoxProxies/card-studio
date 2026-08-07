import { useEffect, useRef, useState } from "react";
import { LayoutTemplate, ChevronDown } from "lucide-react";
import { MTG_TEXT_TEMPLATES, type TextFieldTemplate } from "../textTemplates";

interface TextTemplateMenuProps {
  onAdd: (template: TextFieldTemplate) => void;
  onAddAll: () => void;
}

/** Toolbar dropdown for inserting the standard MTG text fields (title,
 * mana cost, typeline, ...) at their pre-set positions — either one at a
 * time or all at once. */
export function TextTemplateMenu({ onAdd, onAddAll }: TextTemplateMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button className="cs-btn" onClick={() => setOpen((o) => !o)}>
        <LayoutTemplate size={16} /> Text Fields <ChevronDown size={14} />
      </button>

      {open && (
        <div
          className="cs-root"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            background: "var(--cs-surface)",
            border: "1px solid var(--cs-border)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            minWidth: 190,
            zIndex: 1000,
            padding: 4,
          }}
        >
          <button
            className="cs-btn"
            style={{ width: "100%", justifyContent: "flex-start", border: "none", fontWeight: 600 }}
            onClick={() => {
              onAddAll();
              setOpen(false);
            }}
          >
            Add all fields
          </button>
          <div style={{ height: 1, background: "var(--cs-border)", margin: "4px 0" }} />
          {MTG_TEXT_TEMPLATES.map((template) => (
            <button
              key={template.id}
              className="cs-btn"
              style={{ width: "100%", justifyContent: "flex-start", border: "none" }}
              onClick={() => {
                onAdd(template);
                setOpen(false);
              }}
            >
              {template.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
