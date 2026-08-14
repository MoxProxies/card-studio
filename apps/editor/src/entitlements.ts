/**
 * What the current user is allowed to do with a `contentLocked` layer —
 * fields a text-field template (or the rarity-symbol layer, see
 * rarityConfig.ts) ships fixed by default: artist/signature/the set
 * symbol, things meant to stay put unless the embedding host says
 * otherwise. See schema.ts's `LayerBase.contentLocked` doc comment for
 * how this is distinct from `locked` (position/transform, never gated by
 * this).
 *
 * No auth system lives in this app (see README's "Not built yet") — this
 * is deliberately just a plain boolean the host grants, not a token or
 * session of its own. Wiring it to a real moxproxies-website "premium
 * user" check later is entirely that host's job: it computes the right
 * boolean (from whatever session/subscription state it already has) and
 * passes it in via the embed element's `can-edit-locked-content`
 * attribute or `setEntitlements()` method (embed.ts) — nothing in this
 * package needs to change to support that.
 */
export interface Entitlements {
  /** Can edit the *content* of a layer with contentLocked: true — the
   * "premium" gate. Doesn't affect `locked` at all; every user can
   * always toggle that regardless of this. */
  canEditLockedContent: boolean;
  /** Can open Toolbar.tsx's "AI Art" prompt (AiArtModal.tsx) — a separate
   * premium gate from canEditLockedContent above (a host could plausibly
   * grant one without the other). See aiArtBridge.ts and embed.ts's
   * "ai-art-request" event / completeAiArtRequest() for how the actual
   * generation call round-trips through the host page — this package
   * never calls an image-generation API itself. */
  canGenerateAiArt: boolean;
}

export const DEFAULT_ENTITLEMENTS: Entitlements = { canEditLockedContent: false, canGenerateAiArt: false };
