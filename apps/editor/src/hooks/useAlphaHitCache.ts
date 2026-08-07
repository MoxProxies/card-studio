import { useEffect, type RefObject } from "react";
import type Konva from "konva";

/**
 * Makes a Konva node's click/hit region follow its actual rendered pixel
 * alpha instead of its full bounding box — so clicking a transparent part
 * of a layer (a frame's art window, most obviously) doesn't select that
 * layer; the click falls through to whatever's underneath instead, the
 * same way it would if the transparent layer weren't there at all.
 *
 * Konva's built-in mechanism for this is cache() + drawHitFromCache():
 * cache() rasterizes the node once, and drawHitFromCache() tells Konva's
 * hit-testing to treat fully-transparent cached pixels as "not hit"
 * instead of the default whole-rectangle hit region. The cache is a
 * snapshot, not live, so it has to be redone whenever whatever the node
 * visually depends on changes — that's what `deps` is for (e.g. the
 * loaded image, or the layer's current width/height).
 *
 * drawHitFromCache is a Shape-only method (Group/Container has no scene
 * function of its own to rasterize), so this only accepts a Shape ref —
 * for a Group-wrapped image, apply it to the inner Shape and let the click
 * bubble up to the Group's own handler like any other Konva event.
 */
export function useAlphaHitCache(nodeRef: RefObject<Konva.Shape>, deps: unknown[]) {
  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    node.cache();
    node.drawHitFromCache();
    // deps intentionally drive re-caching; the effect body itself doesn't
    // read them — it just re-snapshots whatever the node renders now.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
