import { useEffect, useRef, useState, type RefObject } from "react";
import { Stage, Layer as KonvaLayer, Group, Rect, Line, Transformer } from "react-konva";
import type Konva from "konva";
import type { Layer } from "@card-studio/scene-schema";
import { useDesignStore } from "../store/DesignProvider";
import { mmToStagePx, WORKSPACE_PADDING_PX } from "../geometry";
import { LayerNode } from "./LayerNode";

const SNAP_THRESHOLD_PX = 6;
const CLICK_DRAG_THRESHOLD_PX = 3;

type Guide = { points: number[] };
type MarqueeRect = { x: number; y: number; width: number; height: number };

/** The card canvas: renders every scene layer, cut-line and safe-area
 * guides, marquee (rubber-band) multi-select, alignment/snap guides while
 * dragging, and a shared Transformer bound to the current selection. */
export function CanvasStage({ stageRef }: { stageRef: RefObject<Konva.Stage> }) {
  const design = useDesignStore((s) => s.design);
  const selectedLayerIds = useDesignStore((s) => s.selectedLayerIds);
  const showSafeArea = useDesignStore((s) => s.showSafeArea);
  const selectOnly = useDesignStore((s) => s.selectOnly);
  const toggleSelect = useDesignStore((s) => s.toggleSelect);
  const setSelection = useDesignStore((s) => s.setSelection);
  const clearSelection = useDesignStore((s) => s.clearSelection);
  const commitLayerChanges = useDesignStore((s) => s.commitLayerChanges);

  const transformerRef = useRef<Konva.Transformer>(null);
  const [nodeRefs] = useState(() => new Map<string, Konva.Node>());
  const dragStartPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  const marqueeStart = useRef<{ x: number; y: number; additive: boolean } | null>(null);
  // Mirrors marqueeRect synchronously: mousedown+mouseup can both fire before React
  // re-renders (they're native Konva listeners, not batched together), so reading
  // the *state* value from inside handleStageMouseUp risks seeing the pre-gesture
  // value. The ref is always current; marqueeRect (state) exists only to render the
  // live selection-box overlay.
  const marqueeRectRef = useRef<MarqueeRect | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);

  // Canvas text doesn't automatically repaint when a @font-face it depends
  // on finishes loading — react-konva only redraws in response to React
  // prop changes, and font loading is async and outside that loop. Without
  // this, text can render in the browser's fallback font on first paint
  // and only pick up the real embedded font on the next unrelated redraw.
  useEffect(() => {
    const redraw = () => stageRef.current?.batchDraw();
    document.fonts.ready.then(redraw);
    document.fonts.addEventListener("loadingdone", redraw);
    return () => document.fonts.removeEventListener("loadingdone", redraw);
  }, [stageRef]);

  const widthPx = mmToStagePx(design.size.widthMm);
  const heightPx = mmToStagePx(design.size.heightMm);

  // Cut line and safe area are both centered within the full-bleed canvas
  // (widthPx/heightPx), so each is just an even inset computed from its own
  // size — see STANDARD_CARD_SIZE_MM for why the safe-area inset differs
  // between axes (it's asymmetric in the source print spec, not a bug).
  const cutWidthPx = mmToStagePx(design.size.cutWidthMm);
  const cutHeightPx = mmToStagePx(design.size.cutHeightMm);
  const cutInsetXPx = (widthPx - cutWidthPx) / 2;
  const cutInsetYPx = (heightPx - cutHeightPx) / 2;

  const safeWidthPx = mmToStagePx(design.size.safeWidthMm);
  const safeHeightPx = mmToStagePx(design.size.safeHeightMm);
  const safeInsetXPx = (widthPx - safeWidthPx) / 2;
  const safeInsetYPx = (heightPx - safeHeightPx) / 2;

  const attachTransformer = () => {
    const nodes = selectedLayerIds.map((id) => nodeRefs.get(id)).filter((n): n is Konva.Node => !!n);
    const transformer = transformerRef.current;
    if (!transformer) return;
    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  };

  useEffect(attachTransformer, [selectedLayerIds]);

  function computeSnapAndApply(node: Konva.Node, activeId: string): Guide[] {
    const w = node.width();
    const h = node.height();
    const left = node.x();
    const top = node.y();
    const centerX = left + w / 2;
    const centerY = top + h / 2;

    const targetsX = [0, widthPx / 2, widthPx];
    const targetsY = [0, heightPx / 2, heightPx];
    for (const layer of design.layers) {
      if (layer.id === activeId) continue;
      const bx = mmToStagePx(layer.x);
      const by = mmToStagePx(layer.y);
      const bw = mmToStagePx(layer.width);
      const bh = mmToStagePx(layer.height);
      targetsX.push(bx, bx + bw / 2, bx + bw);
      targetsY.push(by, by + bh / 2, by + bh);
    }

    let bestDx: number | null = null;
    let snapX: number | null = null;
    for (const edge of [left, centerX, left + w]) {
      for (const t of targetsX) {
        const d = t - edge;
        if (Math.abs(d) <= SNAP_THRESHOLD_PX && (bestDx === null || Math.abs(d) < Math.abs(bestDx))) {
          bestDx = d;
          snapX = t;
        }
      }
    }
    let bestDy: number | null = null;
    let snapY: number | null = null;
    for (const edge of [top, centerY, top + h]) {
      for (const t of targetsY) {
        const d = t - edge;
        if (Math.abs(d) <= SNAP_THRESHOLD_PX && (bestDy === null || Math.abs(d) < Math.abs(bestDy))) {
          bestDy = d;
          snapY = t;
        }
      }
    }

    if (bestDx !== null) node.x(node.x() + bestDx);
    if (bestDy !== null) node.y(node.y() + bestDy);

    const nextGuides: Guide[] = [];
    if (snapX !== null) nextGuides.push({ points: [snapX, 0, snapX, heightPx] });
    if (snapY !== null) nextGuides.push({ points: [0, snapY, widthPx, snapY] });
    return nextGuides;
  }

  const handleLayerDragStart = () => {
    dragStartPositions.current.clear();
    for (const id of selectedLayerIds) {
      const node = nodeRefs.get(id);
      if (node) dragStartPositions.current.set(id, { x: node.x(), y: node.y() });
    }
  };

  const handleLayerDragMove = (activeNode: Konva.Node) => {
    const activeId = activeNode.id();
    if (selectedLayerIds.length > 1 && selectedLayerIds.includes(activeId)) {
      const start = dragStartPositions.current.get(activeId);
      if (start) {
        const dx = activeNode.x() - start.x;
        const dy = activeNode.y() - start.y;
        for (const id of selectedLayerIds) {
          if (id === activeId) continue;
          const other = nodeRefs.get(id);
          const otherStart = dragStartPositions.current.get(id);
          if (other && otherStart) {
            other.x(otherStart.x + dx);
            other.y(otherStart.y + dy);
          }
        }
      }
      setGuides([]);
      return;
    }
    setGuides(computeSnapAndApply(activeNode, activeId));
  };

  const handleLayerDragEnd = (activeNode: Konva.Node) => {
    const activeId = activeNode.id();
    const pxPerMm = mmToStagePx(1);
    const ids = selectedLayerIds.includes(activeId) && selectedLayerIds.length > 1 ? selectedLayerIds : [activeId];
    const entries = ids
      .map((id) => nodeRefs.get(id))
      .filter((n): n is Konva.Node => !!n)
      .map((n) => ({ id: n.id(), patch: { x: n.x() / pxPerMm, y: n.y() / pxPerMm } }));
    commitLayerChanges(entries);
    setGuides([]);
  };

  const handleTransformEnd = () => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const pxPerMm = mmToStagePx(1);
    const entries = transformer.nodes().map((node) => {
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      const patch: Partial<Layer> = {
        x: node.x() / pxPerMm,
        y: node.y() / pxPerMm,
        width: (node.width() * scaleX) / pxPerMm,
        height: (node.height() * scaleY) / pxPerMm,
        rotationDeg: node.rotation(),
      };
      return { id: node.id(), patch };
    });
    commitLayerChanges(entries);
  };

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage || e.target !== stage) return; // a shape handles its own click/select
    const pos = stage.getPointerPosition();
    if (!pos) return;
    marqueeStart.current = { x: pos.x, y: pos.y, additive: e.evt.shiftKey };
    marqueeRectRef.current = { x: pos.x, y: pos.y, width: 0, height: 0 };
    setMarqueeRect(marqueeRectRef.current);
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const start = marqueeStart.current;
    if (!start) return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    marqueeRectRef.current = {
      x: Math.min(start.x, pos.x),
      y: Math.min(start.y, pos.y),
      width: Math.abs(pos.x - start.x),
      height: Math.abs(pos.y - start.y),
    };
    setMarqueeRect(marqueeRectRef.current);
  };

  const handleStageMouseUp = () => {
    const start = marqueeStart.current;
    const rect = marqueeRectRef.current;
    marqueeStart.current = null;
    marqueeRectRef.current = null;
    setMarqueeRect(null);
    if (!start || !rect) return;

    if (rect.width < CLICK_DRAG_THRESHOLD_PX && rect.height < CLICK_DRAG_THRESHOLD_PX) {
      if (!start.additive) clearSelection();
      return;
    }

    // rect is in absolute stage coordinates; layer bboxes are local to the
    // card Group, offset by WORKSPACE_PADDING_PX within the stage.
    const hitIds = design.layers
      .filter((layer) => {
        const lx = mmToStagePx(layer.x) + WORKSPACE_PADDING_PX;
        const ly = mmToStagePx(layer.y) + WORKSPACE_PADDING_PX;
        const lw = mmToStagePx(layer.width);
        const lh = mmToStagePx(layer.height);
        return lx < rect.x + rect.width && lx + lw > rect.x && ly < rect.y + rect.height && ly + lh > rect.y;
      })
      .map((l) => l.id);

    setSelection(start.additive ? Array.from(new Set([...selectedLayerIds, ...hitIds])) : hitIds);
  };

  const stageWidthPx = widthPx + WORKSPACE_PADDING_PX * 2;
  const stageHeightPx = heightPx + WORKSPACE_PADDING_PX * 2;

  return (
    <Stage
      ref={stageRef}
      width={stageWidthPx}
      height={stageHeightPx}
      onMouseDown={handleStageMouseDown}
      onMouseMove={handleStageMouseMove}
      onMouseUp={handleStageMouseUp}
    >
      <KonvaLayer>
        {/* Workspace margin around the card, so oversized layers and
            Transformer handles at/beyond the card's edge have somewhere to
            render — see WORKSPACE_PADDING_PX. Non-listening so clicks here
            still reach the Stage for marquee/deselect handling. */}
        <Rect x={0} y={0} width={stageWidthPx} height={stageHeightPx} fill="#e5e7eb" listening={false} />

        <Group x={WORKSPACE_PADDING_PX} y={WORKSPACE_PADDING_PX}>
          {/* Decorative background — must not intercept pointer events, or every
              click targets this Rect instead of the Stage and empty-canvas
              click/marquee handling below never sees e.target === stage. */}
          <Rect
            x={0}
            y={0}
            width={widthPx}
            height={heightPx}
            fill={design.backgroundColor}
            listening={false}
            shadowColor="black"
            shadowBlur={16}
            shadowOpacity={0.25}
          />

          {design.layers.map((layer) => (
            <LayerNode
              key={layer.id}
              layer={layer}
              onSelect={(e) => {
                if (e.evt.shiftKey) toggleSelect(layer.id);
                else selectOnly(layer.id);
              }}
              registerRef={(node) => {
                if (node) nodeRefs.set(layer.id, node);
                else nodeRefs.delete(layer.id);
                attachTransformer();
              }}
              onDragStart={handleLayerDragStart}
              onDragMove={handleLayerDragMove}
              onDragEnd={handleLayerDragEnd}
            />
          ))}

          {/* Cut line — where the card is actually trimmed. Always shown. */}
          <Rect
            x={cutInsetXPx}
            y={cutInsetYPx}
            width={cutWidthPx}
            height={cutHeightPx}
            stroke="#ef4444"
            dash={[4, 4]}
            listening={false}
          />

          {/* Safe area — recommended inset from the cut line, toggle-able. */}
          {showSafeArea && (
            <Rect
              x={safeInsetXPx}
              y={safeInsetYPx}
              width={safeWidthPx}
              height={safeHeightPx}
              stroke="#f59e0b"
              dash={[4, 4]}
              listening={false}
            />
          )}

          {guides.map((g, i) => (
            <Line key={i} points={g.points} stroke="#ec4899" strokeWidth={1} dash={[4, 4]} listening={false} />
          ))}

          <Transformer ref={transformerRef} rotateEnabled onTransformEnd={handleTransformEnd} />
        </Group>
      </KonvaLayer>

      {marqueeRect && (
        <KonvaLayer listening={false}>
          <Rect
            x={marqueeRect.x}
            y={marqueeRect.y}
            width={marqueeRect.width}
            height={marqueeRect.height}
            fill="rgba(59, 130, 246, 0.1)"
            stroke="#3b82f6"
            strokeWidth={1}
          />
        </KonvaLayer>
      )}
    </Stage>
  );
}
