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
  fontWeight: z.union([z.literal("normal"), z.literal("bold"), z.number()]).default("normal"),
  italic: z.boolean().default(false),
  color: z.string().default("#000000"),
  align: z.enum(["left", "center", "right"]).default("left"),
  lineHeight: z.number().positive().default(1.2),
  /** 'shrink' auto-reduces fontSizePt to fit the box; 'clip' truncates overflow. */
  overflow: z.enum(["shrink", "clip", "visible"]).default("shrink"),
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

export const Design = z.object({
  schemaVersion: z.literal(SCENE_SCHEMA_VERSION).default(SCENE_SCHEMA_VERSION),
  id: z.string(),
  name: z.string(),
  size: CardSize,
  backgroundColor: z.string().default("#ffffff"),
  /** Ordered back-to-front: index 0 renders first (bottom). */
  layers: z.array(Layer).default([]),
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
    sourceCardDesignId: null,
  });
}
