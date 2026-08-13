import { z } from "zod";

/**
 * All spatial fields are in millimeters, origin top-left of the card
 * (bleed included, so 0,0 is the bleed corner, not the trim corner).
 * Keeping the scene DPI-independent means the same design renders
 * correctly at preview resolution in the editor and at print
 * resolution in the render service.
 */
const LayerBase = z.object({
  id: z.string(),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotationDeg: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1),
  visible: z.boolean().default(true),
  /** Position/size/rotation lock — when true, the layer can't be dragged,
   * resized, or rotated via the canvas Transformer, nor moved by arrow-key
   * nudge or by typing into the properties panel's X/Y/Width/Height/
   * Rotation fields (CanvasStage.tsx's attachTransformer, LayerNode.tsx's
   * `draggable`, designStore.ts's nudgeLayers, and PropertiesPanel.tsx's
   * liveNumber all check it). Not gated by any user entitlement — anyone
   * can toggle it via the lock icon in the layer/properties panel,
   * regardless of contentLocked below or the current user's entitlements.
   * A text-field template can default a field to locked (see
   * TextFieldTemplate.locked in textTemplates.ts) for things like a
   * signature or an official symbol that shouldn't move by accident. */
  locked: z.boolean().default(false),
  /** *Content* lock — separate from `locked` above, which only gates
   * position/transform. When true, editing this layer's content (a
   * TextLayer's text; the rarity dropdown, for the one designated
   * rarity-symbol layer) additionally requires the
   * Entitlements.canEditLockedContent the embedding host grants (see
   * apps/editor/src/entitlements.ts) — the "premium" gate. A layer can be
   * `locked` (immovable) and *not* `contentLocked` (freely editable
   * text), or the other way around, or both, or neither — the two are
   * independent. Doesn't affect services/render at all; rendering only
   * cares what a field currently contains, not who was allowed to put it
   * there. */
  contentLocked: z.boolean().default(false),
  /** Id of a Design.groups entry this layer belongs to, if any — purely an
   * organizational label for the layer panel (bulk select/hide/lock/move,
   * a shared header), not a transform hierarchy: z-order is still just
   * `layers` array order, unaffected by group membership, and a grouped
   * layer's x/y/rotation stay independent of its groupmates'. Layers
   * sharing a groupId are expected to sit contiguously in `layers` — the
   * layer panel derives visual group blocks by clustering consecutive
   * same-groupId layers rather than from a separate membership list, so
   * groupLayers (designStore.ts) always makes that true when a group is
   * created. */
  groupId: z.string().optional(),
});

export const FrameLayer = LayerBase.extend({
  type: z.literal("frame"),
  /** Asset id in the frame/template library (border art, mana symbols, etc). */
  assetId: z.string(),
  /** Optional color tint applied over the frame art (e.g. mono-color frames). */
  tint: z.string().optional(),
});

export const ImageLayer = LayerBase.extend({
  type: z.literal("image"),
  /** URL of the user's art / uploaded image, or a browser-usable URL
   * cache of `assetId`'s resolved asset when that's set. */
  src: z.string(),
  fit: z.enum(["cover", "contain", "fill"]).default("cover"),
  /** Crop rect in source-image fractional coords (0-1), applied before fit. */
  crop: z
    .object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })
    .optional(),
  /** If set, this image is a static library asset (e.g. a rarity symbol)
   * resolved by id against that library's catalog rather than
   * user-uploaded content — assetId is the source of truth for what to
   * draw; `src` is kept as a same-value browser-usable URL alongside it
   * so the layer stays self-describing (e.g. for design JSON export)
   * without needing the catalog. Unset for ordinary uploaded art. */
  assetId: z.string().optional(),
});

export const TextLayer = LayerBase.extend({
  type: z.literal("text"),
  content: z.string(),
  /** The text-template-library/ field id (e.g. "title", "rules",
   * "artist") this layer was created from — see TextFieldTemplate.id in
   * apps/editor/src/textTemplates.ts. Unset for a layer added by some
   * other path (a plain "Add Text", or one whose template has since been
   * hand-edited past recognition) — there's deliberately no fallback to
   * `name` for this, since `name` is a free-text label a user can retype
   * to anything. An embedding host that needs to know "which MTG field is
   * this" (e.g. moxproxies-website mapping a saved Design back onto its
   * own CardDesign columns for search/display) should key off this and
   * treat a missing value as "not a recognized standard field," not guess
   * from position or label text. Optional (no `.default()`) so it's
   * opt-in for consumers and doesn't force every existing raw Layer
   * literal in Toolbar.tsx to set it, unlike locked/contentLocked above. */
  fieldId: z.string().optional(),
  fontFamily: z.string().default("Inter"),
  fontSizePt: z.number().positive().default(12),
  /** Floor for the "shrink" search below — see maxFontSizePt. Unset falls
   * back to a small fixed floor (4px-equivalent at whatever DPI is
   * rendering), matching pre-range behavior. */
  minFontSizePt: z.number().positive().optional(),
  /** When set, overflow "shrink" searches from this size down to
   * minFontSizePt for the largest size that still fits the box, instead
   * of starting from fontSizePt and only ever decreasing — i.e. short
   * content grows to fill the box instead of sitting at a small fixed
   * size. Unset preserves the original shrink-only-from-fontSizePt
   * behavior. */
  maxFontSizePt: z.number().positive().optional(),
  fontWeight: z.union([z.literal("normal"), z.literal("bold"), z.number()]).default("normal"),
  italic: z.boolean().default(false),
  color: z.string().default("#000000"),
  align: z.enum(["left", "center", "right"]).default("left"),
  lineHeight: z.number().positive().default(1.2),
  /** 'shrink' auto-fits fontSizePt (or the minFontSizePt..maxFontSizePt
   * range, if set) to the box; 'clip' truncates overflow. */
  overflow: z.enum(["shrink", "clip", "visible"]).default("shrink"),
  /** Presence of shadowColor is the on/off switch — undefined means no
   * shadow at all (the common case), so a layer with no shadow doesn't
   * carry four extra zero-valued fields. The offset/blur are in pt, same
   * physical unit as fontSizePt, so the shadow scales identically between
   * the editor's preview DPI and the render service's print DPI. Applies
   * to the whole rendered text layer, including inline {token} symbols —
   * not just the glyphs — for a consistent look on tokens embedded
   * mid-paragraph (see "Inline symbols in text" in the README). */
  shadowColor: z.string().optional(),
  shadowOffsetXPt: z.number().default(0),
  shadowOffsetYPt: z.number().default(0),
  shadowBlurPt: z.number().min(0).default(1),
  shadowOpacity: z.number().min(0).max(1).default(0.75),
  /** Optional bottom-right notch cut out of this layer's own box for word
   * wrap purposes — e.g. rules/flavor text making room for power/
   * toughness sitting in the corner below them (see rulesFlavorFit.ts,
   * the only current writer of these two fields). Both mm, relative to
   * this layer's own y/x: lines whose vertical span falls at or below
   * avoidFromYMm are wrapped to avoidWidthMm instead of the layer's full
   * `width`; lines entirely above it use the full width as normal.
   * Renderers (LayerNode.tsx, the print render service's drawText) apply
   * this generically off these two fields alone — no lookup of sibling
   * layers, fieldId, or template data needed at draw time. Unset (the
   * common case, every field other than rules/flavor) draws the box as a
   * plain rectangle exactly as before. */
  avoidFromYMm: z.number().optional(),
  avoidWidthMm: z.number().nonnegative().optional(),
});

export const ShapeLayer = LayerBase.extend({
  type: z.literal("shape"),
  shape: z.enum(["rect", "ellipse"]),
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidthMm: z.number().nonnegative().default(0),
  cornerRadiusMm: z.number().nonnegative().default(0),
});

export const Layer = z.discriminatedUnion("type", [FrameLayer, ImageLayer, TextLayer, ShapeLayer]);
export type Layer = z.infer<typeof Layer>;
export type FrameLayer = z.infer<typeof FrameLayer>;
export type ImageLayer = z.infer<typeof ImageLayer>;
export type TextLayer = z.infer<typeof TextLayer>;
export type ShapeLayer = z.infer<typeof ShapeLayer>;

export const CardSize = z.object({
  /** Full-bleed canvas — art/frame content should extend all the way to
   * this edge; this is also the exported/printed file's size. */
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  /** Trim/cut size — the actual card after cutting. Centered within
   * width/height. */
  cutWidthMm: z.number().positive(),
  cutHeightMm: z.number().positive(),
  /** Recommended safe area — nothing critical should sit outside this.
   * Centered within cutWidth/cutHeight. */
  safeWidthMm: z.number().positive(),
  safeHeightMm: z.number().positive(),
});
export type CardSize = z.infer<typeof CardSize>;

export const SCENE_SCHEMA_VERSION = 1;

/** A named organizational label for a set of layers — see LayerBase's
 * groupId doc comment. Registry lives on the Design, not embedded in each
 * layer, so the name/id are defined once regardless of how many layers
 * belong to it. */
export const LayerGroup = z.object({
  id: z.string(),
  name: z.string(),
});
export type LayerGroup = z.infer<typeof LayerGroup>;

export const Design = z.object({
  schemaVersion: z.literal(SCENE_SCHEMA_VERSION).default(SCENE_SCHEMA_VERSION),
  id: z.string(),
  name: z.string(),
  size: CardSize,
  backgroundColor: z.string().default("#ffffff"),
  /** Ordered back-to-front: index 0 renders first (bottom). */
  layers: z.array(Layer).default([]),
  /** Every group any layer's groupId currently references — see
   * LayerBase.groupId. A group with no member layers left (e.g. its last
   * layer was deleted individually rather than via a group action) is
   * harmless dead metadata, not cleaned up automatically. */
  groups: z.array(LayerGroup).default([]),
  /** Id of the moxproxies-website CardDesign this design is linked to, if any. */
  sourceCardDesignId: z.string().nullable().default(null),
});
export type Design = z.infer<typeof Design>;

export function createEmptyDesign(id: string, size: CardSize): Design {
  return Design.parse({
    schemaVersion: SCENE_SCHEMA_VERSION,
    id,
    name: "Untitled design",
    size,
    backgroundColor: "#ffffff",
    layers: [],
    groups: [],
    sourceCardDesignId: null,
  });
}
