import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface FrameAsset {
  id: string;
  name: string;
  fileName: string;
}

// Keep in sync with apps/editor/src/frameAssets.ts — see README for why the
// catalog (and its backing images) are duplicated per-consumer rather than
// shared from one package.
export const FRAME_ASSETS: FrameAsset[] = [
  { id: "classic-white", name: "Classic White", fileName: "classic-white.png" },
  { id: "classic-blue", name: "Classic Blue", fileName: "classic-blue.png" },
  { id: "classic-black", name: "Classic Black", fileName: "classic-black.png" },
  { id: "classic-red", name: "Classic Red", fileName: "classic-red.png" },
  { id: "classic-green", name: "Classic Green", fileName: "classic-green.png" },
  { id: "classic-gold", name: "Classic Gold", fileName: "classic-gold.png" },
];

/** Resolves a catalog assetId to an absolute file path for @napi-rs/canvas's
 * loadImage. Undefined for unknown ids — callers fall back to the flat-tint
 * placeholder in that case. */
export function getFrameAssetPath(assetId: string): string | undefined {
  const asset = FRAME_ASSETS.find((a) => a.id === assetId);
  return asset ? path.join(__dirname, "../assets/frames", asset.fileName) : undefined;
}
