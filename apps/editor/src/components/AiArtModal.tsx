import { useEffect, useRef, useState } from "react";
import { X, Loader2, Sparkles } from "lucide-react";
import { requestAiArt } from "../aiArtBridge";

interface AiArtModalProps {
  onGenerated: (src: string) => void;
  onClose: () => void;
}

const MAX_PROMPT_LENGTH = 600;

/**
 * Prompt box for Card Studio's Premium AI art generation. Submitting
 * dispatches an "ai-art-request" CustomEvent (aiArtBridge.ts) from this
 * modal's own root node — the host page's JS listens for it, calls its
 * backend (which injects framing/style/aspect-ratio instructions
 * automatically, see moxproxies-website's card-art.blade.php), and hands
 * the resulting image back via `.completeAiArtRequest()` (embed.ts). This
 * package never calls an image-generation API or holds a credential
 * itself — see Toolbar.tsx for the entitlement gate that decides whether
 * this modal can even be opened.
 */
export function AiArtModal({ onGenerated, onClose }: AiArtModalProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, loading]);

  const generate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || !rootRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const src = await requestAiArt(rootRef.current, trimmed);
      onGenerated(src);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image generation failed — please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className="cs-root"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--cs-backdrop)",
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
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 50px var(--cs-shadow)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--cs-border)" }}>
          <h2 className="cs-heading" style={{ fontSize: 16, fontWeight: 600, margin: 0, flex: 1 }}>
            Generate AI Art
          </h2>
          <button className="cs-icon-btn" onClick={onClose} disabled={loading} title="Close">
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--cs-text-muted)" }}>
            Describe the illustration you want — framing, style, and aspect ratio are handled automatically.
          </p>
          <textarea
            className="cs-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT_LENGTH))}
            placeholder="A lone knight facing a storm on a cliffside…"
            rows={4}
            autoFocus
            disabled={loading}
            style={{ resize: "vertical", width: "100%" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--cs-text-muted)" }}>
              {prompt.length}/{MAX_PROMPT_LENGTH}
            </span>
            <button className="cs-btn" onClick={() => void generate()} disabled={loading || !prompt.trim()}>
              {loading ? <Loader2 size={14} className="cs-spin" /> : <Sparkles size={14} />}
              {loading ? "Generating…" : "Generate"}
            </button>
          </div>
          {error && <p style={{ color: "var(--cs-danger)", fontSize: 13, margin: 0 }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}
