import type { Layer } from "@card-studio/scene-schema";
import { useDesignStore } from "../store/DesignProvider";
import { getFrameAsset } from "../frameAssets";

/** Which text-template-library/ category applies to the design's current
 * frame (see getTextTemplates in textTemplates.ts) — undefined when no
 * frame is present yet, or the frame's asset id doesn't resolve to a
 * known category, both of which fall back to the base/default field set.
 * Shared by Toolbar.tsx (deciding which field set "Add Text Field" offers)
 * and PropertiesPanel.tsx (rules/flavor live re-fit, rulesFlavorFit.ts) so
 * both agree on the same frame's category without duplicating the lookup.
 */
export function useActiveFrameCategory(): string | undefined {
  const design = useDesignStore((s) => s.design);
  const activeFrameLayer = design.layers.find((l): l is Extract<Layer, { type: "frame" }> => l.type === "frame");
  return activeFrameLayer ? getFrameAsset(activeFrameLayer.assetId)?.category : undefined;
}
