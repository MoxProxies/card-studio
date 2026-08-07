import { Group, Image as KonvaImage, Rect, Ellipse, Text } from "react-konva";
import type Konva from "konva";
import type { Layer } from "@card-studio/scene-schema";
import { mmToStagePx } from "../geometry";
import { useHtmlImage } from "../hooks/useHtmlImage";

interface LayerNodeProps {
  layer: Layer;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  registerRef: (node: Konva.Node | null) => void;
  onDragStart: () => void;
  onDragMove: (node: Konva.Node) => void;
  onDragEnd: (node: Konva.Node) => void;
}

/** Renders one scene layer as Konva node(s). Position/transform math and
 * history commits live in CanvasStage — this component only forwards
 * gesture events for the node it owns. */
export function LayerNode({ layer, onSelect, registerRef, onDragStart, onDragMove, onDragEnd }: LayerNodeProps) {
  // Hooks must run unconditionally on every render of this instance.
  const image = useHtmlImage(layer.type === "image" ? layer.src : undefined);

  const common = {
    id: layer.id,
    x: mmToStagePx(layer.x),
    y: mmToStagePx(layer.y),
    width: mmToStagePx(layer.width),
    height: mmToStagePx(layer.height),
    rotation: layer.rotationDeg,
    opacity: layer.opacity,
    draggable: !layer.locked,
    visible: layer.visible,
    onClick: onSelect,
    onTap: onSelect,
    ref: registerRef,
    onDragStart,
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => onDragMove(e.target),
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => onDragEnd(e.target),
  };

  if (layer.type === "frame") {
    return (
      <Group {...common}>
        <Rect
          width={common.width}
          height={common.height}
          fill={layer.tint ?? "#e5e7eb"}
          stroke="#9ca3af"
          dash={[6, 4]}
          strokeWidth={1}
        />
        <Text
          text={`frame: ${layer.assetId}`}
          width={common.width}
          height={common.height}
          align="center"
          verticalAlign="middle"
          fontSize={12}
          fill="#6b7280"
          listening={false}
        />
      </Group>
    );
  }

  if (layer.type === "text") {
    return (
      <Text
        {...common}
        text={layer.content}
        fontFamily={layer.fontFamily}
        // pt -> css px at 96dpi; Konva then scales with the stage like everything else.
        fontSize={(layer.fontSizePt / 72) * 96}
        fontStyle={layer.fontWeight === "bold" ? "bold" : "normal"}
        fill={layer.color}
        align={layer.align}
        lineHeight={layer.lineHeight}
        wrap={layer.overflow === "clip" ? "none" : "word"}
      />
    );
  }

  if (layer.type === "image") {
    return <KonvaImage {...common} image={image} />;
  }

  // shape
  if (layer.shape === "ellipse") {
    return (
      <Ellipse
        {...common}
        radiusX={common.width / 2}
        radiusY={common.height / 2}
        offsetX={-common.width / 2}
        offsetY={-common.height / 2}
        fill={layer.fill}
        stroke={layer.stroke}
        strokeWidth={mmToStagePx(layer.strokeWidthMm)}
      />
    );
  }

  return (
    <Rect
      {...common}
      fill={layer.fill}
      stroke={layer.stroke}
      strokeWidth={mmToStagePx(layer.strokeWidthMm)}
      cornerRadius={mmToStagePx(layer.cornerRadiusMm)}
    />
  );
}
