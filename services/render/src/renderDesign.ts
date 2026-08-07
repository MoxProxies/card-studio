import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import { Design, Layer, mmToPx, PRINT_DPI } from "@card-studio/scene-schema";

/**
 * Rasterizes a Design at a given DPI. This is the print-quality path:
 * the same DPI-independent scene JSON the editor works with, redrawn
 * server-side at full resolution (e.g. 800 DPI @ 63x88mm ≈ 1984x2772px)
 * instead of scaling up a screen-resolution canvas.
 *
 * Frame assets aren't wired to real storage yet (no asset library),
 * so frame layers render as a flat tint — same placeholder behaviour
 * as the editor. Swap in real asset resolution (assetId -> URL) once
 * that service exists.
 */
export async function renderDesign(design: Design, dpi: number = PRINT_DPI): Promise<Buffer> {
  const widthPx = Math.round(mmToPx(design.size.widthMm, dpi));
  const heightPx = Math.round(mmToPx(design.size.heightMm, dpi));
  const canvas = createCanvas(widthPx, heightPx);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = design.backgroundColor;
  ctx.fillRect(0, 0, widthPx, heightPx);

  for (const layer of design.layers) {
    if (!layer.visible) continue;
    await drawLayer(ctx, layer, dpi);
  }

  return canvas.encode("png");
}

async function drawLayer(ctx: SKRSContext2D, layer: Layer, dpi: number): Promise<void> {
  const x = mmToPx(layer.x, dpi);
  const y = mmToPx(layer.y, dpi);
  const width = mmToPx(layer.width, dpi);
  const height = mmToPx(layer.height, dpi);

  ctx.save();
  ctx.globalAlpha = layer.opacity;
  // Rotate around the layer's center, matching the editor's Konva nodes.
  ctx.translate(x + width / 2, y + height / 2);
  ctx.rotate((layer.rotationDeg * Math.PI) / 180);
  ctx.translate(-width / 2, -height / 2);

  switch (layer.type) {
    case "frame":
      ctx.fillStyle = layer.tint ?? "#e5e7eb";
      ctx.fillRect(0, 0, width, height);
      break;

    case "shape":
      drawShape(ctx, layer, width, height, dpi);
      break;

    case "image":
      await drawImage(ctx, layer.src, width, height);
      break;

    case "text":
      drawText(ctx, layer, width, height, dpi);
      break;
  }

  ctx.restore();
}

function drawShape(
  ctx: SKRSContext2D,
  layer: Extract<Layer, { type: "shape" }>,
  width: number,
  height: number,
  dpi: number
) {
  const strokeWidth = mmToPx(layer.strokeWidthMm, dpi);
  ctx.beginPath();
  if (layer.shape === "ellipse") {
    ctx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
  } else {
    const r = mmToPx(layer.cornerRadiusMm, dpi);
    roundedRect(ctx, 0, 0, width, height, r);
  }
  if (layer.fill) {
    ctx.fillStyle = layer.fill;
    ctx.fill();
  }
  if (layer.stroke && strokeWidth > 0) {
    ctx.strokeStyle = layer.stroke;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

function roundedRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

async function drawImage(ctx: SKRSContext2D, src: string, width: number, height: number) {
  const image = await loadImage(src);
  const scale = Math.max(width / image.width, height / image.height);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();
  ctx.drawImage(image, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
  ctx.restore();
}

function drawText(
  ctx: SKRSContext2D,
  layer: Extract<Layer, { type: "text" }>,
  width: number,
  height: number,
  dpi: number
) {
  const ptToPx = (pt: number) => (pt / 72) * dpi;
  let fontSizePx = ptToPx(layer.fontSizePt);
  const weight = layer.fontWeight === "bold" ? "bold" : "normal";

  const layOut = (size: number) => {
    ctx.font = `${weight} ${size}px ${layer.fontFamily}`;
    return wrapText(ctx, layer.content, width);
  };

  let lines = layOut(fontSizePx);
  if (layer.overflow === "shrink") {
    const lineHeightPx = () => fontSizePx * layer.lineHeight;
    while (lines.length * lineHeightPx() > height && fontSizePx > 4) {
      fontSizePx -= 1;
      lines = layOut(fontSizePx);
    }
  }

  ctx.font = `${weight} ${fontSizePx}px ${layer.fontFamily}`;
  ctx.fillStyle = layer.color;
  ctx.textBaseline = "top";
  ctx.textAlign = layer.align;

  const lineHeightPx = fontSizePx * layer.lineHeight;
  const originX = layer.align === "left" ? 0 : layer.align === "right" ? width : width / 2;

  lines.forEach((line, i) => {
    ctx.fillText(line, originX, i * lineHeightPx);
  });
}

function wrapText(ctx: SKRSContext2D, content: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of content.split("\n")) {
    const words = paragraph.split(" ");
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    lines.push(current);
  }
  return lines;
}
