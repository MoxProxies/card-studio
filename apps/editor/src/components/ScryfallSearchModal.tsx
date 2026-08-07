import { useEffect, useRef, useState } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { autocompleteCardNames, fetchCardByName, type ScryfallCard } from "../scryfall";

interface ScryfallSearchModalProps {
  onSelect: (card: ScryfallCard) => void;
  onClose: () => void;
}

const DEBOUNCE_MS = 250;

/** Search-as-you-type against Scryfall's public card API: a debounced
 * autocomplete call lists matching names as you type, picking one fetches
 * the full card and hands it to onSelect (Toolbar.tsx's
 * importFromScryfall) — no API key, CORS-enabled for direct browser use. */
export function ScryfallSearchModal({ onSelect, onClose }: ScryfallSearchModalProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingName, setLoadingName] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSuggestions([]);
      setError(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const names = await autocompleteCardNames(query);
        setSuggestions(names);
        setError(null);
      } catch {
        setSuggestions([]);
        setError("Couldn't reach Scryfall — check your connection and try again.");
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const pick = async (name: string) => {
    setLoadingName(name);
    setError(null);
    try {
      const card = await fetchCardByName(name);
      onSelect(card);
    } catch {
      setError(`Couldn't load "${name}" — check your connection and try again.`);
    } finally {
      setLoadingName(null);
    }
  };

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
          width: "min(480px, 92vw)",
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--cs-border)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, flex: 1 }}>Import from Scryfall</h2>
          <button className="cs-icon-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--cs-border)" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--cs-text-muted)" }} />
            <input
              className="cs-input"
              placeholder="Card name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: "100%", paddingLeft: 28 }}
              autoFocus
            />
          </div>
        </div>

        <div style={{ padding: 8, overflowY: "auto", flex: 1 }}>
          {error && (
            <p style={{ color: "#b91c1c", fontSize: 13, padding: "6px 8px" }}>{error}</p>
          )}
          {!error && query.trim() && suggestions.length === 0 && (
            <p style={{ color: "var(--cs-text-muted)", fontSize: 13, padding: "6px 8px" }}>No matches yet…</p>
          )}
          {suggestions.map((name) => (
            <button
              key={name}
              className="cs-btn"
              disabled={loadingName !== null}
              onClick={() => pick(name)}
              style={{ width: "100%", justifyContent: "space-between", border: "none", marginBottom: 2 }}
            >
              {name}
              {loadingName === name && <Loader2 size={14} className="cs-spin" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
