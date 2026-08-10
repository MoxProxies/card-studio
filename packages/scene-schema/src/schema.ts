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
  locked: z.boolean().default(false),
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
