import { useEffect, useRef, useState, type RefObject } from "react";
import { Stage, Layer as KonvaLayer, Rect, Transformer } from "react-konva";
import type Konva from "konva";
import { useDesignStore } from "../store/DesignProvider";
import { mmToStagePx } from "../geometry";
import { LayerNode } from "./LayerNode";

/** The card canvas: renders every scene layer, a bleed/trim guide, and
 * a shared Transformer bound to whichever layer is selected. */
export function CanvasStage({ stageRef }: { stageRef: RefObject<Konva.Stage> }) {
  const design = useDesignStore((s) => s.design);
  const selectedLayerId = useDesignStore((s) => s.selectedLayerId);
  const selectLayer = useDesignStore((s) => s.selectLayer);
  const updateLayer = useDesignStore((s) => s.updateLayer);

  const transformerRef = useRef<Konva.Transformer>(null);
  const [nodeRefs] = useState(() => new Map<string, Konva.Node>());

  const widthPx = mmToStagePx(design.size.widthMm);
  const heightPx = mmToStagePx(design.size.heightMm);
  const bleedPx = mmToStagePx(design.size.bleedMm);

  const attachTransformer = () => {
    const node = selectedLayerId ? nodeRefs.get(selectedLayerId) : undefined;
    const transformer = transformerRef.current;
    if (!transformer) return;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  };

  useEffect(attachTransformer, [selectedLayerId]);

  return (
    <Stage
      ref={stageRef}
      width={widthPx}
      height={heightPx}
      onMouseDown={(e) => {
        if (e.target === e.target.getStage()) selectLayer(null);
      }}
      style={{ background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }}
    >
      <KonvaLayer>
        <Rect x={0} y={0} width={widthPx} height={heightPx} fill={design.backgroundColor} />

        {design.layers.map((layer) => (
          <LayerNode
            key={layer.id}
            layer={layer}
            onSelect={() => selectLayer(layer.id)}
            onChange={(patch) => updateLayer(layer.id, patch)}
            registerRef={(node) => {
              if (node) nodeRefs.set(layer.id, node);
              else nodeRefs.delete(layer.id);
              attachTransformer();
            }}
          />
        ))}

        {design.size.bleedMm > 0 && (
          <Rect
            x={bleedPx}
            y={bleedPx}
            width={widthPx - bleedPx * 2}
            height={heightPx - bleedPx * 2}
            stroke="#ef4444"
            dash={[4, 4]}
            listening={false}
          />
        )}

        <Transformer ref={transformerRef} rotateEnabled onTransformEnd={attachTransformer} />
      </KonvaLayer>
    </Stage>
  );
}
