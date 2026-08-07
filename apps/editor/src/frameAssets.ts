export interface FrameAsset {
  id: string;
  name: string;
  fileName: string;
}

// Keep in sync with services/render/src/frameAssets.ts — see README for why
// the catalog (and its backing images) are duplicated per-consumer rather
// than shared from one package.
export const FRAME_ASSETS: FrameAsset[] = [
  { id: "classic-white", name: "Classic White", fileName: "classic-white.png" },
  { id: "classic-blue", name: "Classic Blue", fileName: "classic-blue.png" },
  { id: "classic-black", name: "Classic Black", fileName: "classic-black.png" },
  { id: "classic-red", name: "Classic Red", fileName: "classic-red.png" },
  { id: "classic-green", name: "Classic Green", fileName: "classic-green.png" },
  { id: "classic-gold", name: "Classic Gold", fileName: "classic-gold.png" },
];

export function getFrameAsset(assetId: string): FrameAsset | undefined {
  return FRAME_ASSETS.find((a) => a.id === assetId);
}

/** Resolves a catalog assetId to a URL Konva/the <img> loader can fetch.
 * Undefined for unknown ids (e.g. legacy designs) — callers fall back to
 * the flat-tint placeholder in that case. */
export function getFrameAssetUrl(assetId: string): string | undefined {
  const asset = getFrameAsset(assetId);
  return asset ? `/frames/${asset.fileName}` : undefined;
}
