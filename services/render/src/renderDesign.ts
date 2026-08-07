import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import { computeObjectFit, Design, Layer, mmToPx, PRINT_DPI, shrinkTextToFit } from "@card-studio/scene-schema";
import { getFrameAssetPath } from "./frameAssets.js";
import { getRarityAssetPath } from "./rarityAssets.js";

/**
 * Rasterizes a Design at a given DPI. This is the print-quality path:
 * the same DPI-independent scene JSON the editor works with, redrawn
 * server-side at full resolution (e.g. 800 DPI @ 63x88mm ≈ 1984x2772px)
 * instead of scaling up a screen-resolution canvas.
 *
 * Frame layers resolve assetId against the built-in catalog
 * (frameAssets.ts) and draw that artwork stretched to the layer's box,
 * same as the editor. An unresolved id (unknown/legacy) falls back to
 * a flat tint fill.
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
      await drawFrame(ctx, layer, width, height);
      break;

    case "shape":
      drawShape(ctx, layer, width, height, dpi);
      break;

    case "image":
      await drawImage(ctx, layer, width, height);
      break;

    case "text":
      drawText(ctx, layer, width, height, dpi);
      break;
  }

  ctx.restore();
}

async function drawFrame(ctx: SKRSContext2D, layer: Extract<Layer, { type: "frame" }>, width: number, height: number) {
  const assetPath = getFrameAssetPath(layer.assetId);
  if (assetPath) {
    try {
      const image = await loadImage(assetPath);
      ctx.drawImage(image, 0, 0, width, height);
      return;
    } catch {
      // Fall through to the tint placeholder if the asset failed to load.
    }
  }
  ctx.fillStyle = layer.tint ?? "#e5e7eb";
  ctx.fillRect(0, 0, width, height);
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

async function drawImage(ctx: SKRSContext2D, layer: Extract<Layer, { type: "image" }>, width: number, height: number) {
  // A library asset (e.g. a rarity symbol) resolves by id against its own
  // catalog on disk; ordinary uploaded art uses `src` directly.
  const source = (layer.assetId && getRarityAssetPath(layer.assetId)) || layer.src;
  const image = await loadImage(source);
  const fit = computeObjectFit(layer.fit, width, height, image.width, image.height);
  ctx.save();
  if (fit.clip) {
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();
  }
  ctx.drawImage(image, fit.offsetX, fit.offsetY, fit.drawWidth, fit.drawHeight);
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
  // Skia's font-string parser (unlike Chromium's) doesn't disambiguate an
  // explicit "normal" alongside "italic" — "italic normal 16px Inter"
  // silently drops the italic style instead of reading "normal" as the
  // font-weight — so build the string from only the non-default tokens
  // rather than always naming style and weight.
  const fontKeywords = [layer.italic ? "italic" : "", layer.fontWeight === "bold" ? "bold" : ""].filter(Boolean);
  const buildFont = (px: number) => [...fontKeywords, `${px}px`, layer.fontFamily].join(" ");

  const { fontSizePx, lines } = shrinkTextToFit({
    content: layer.content,
    startFontSizePx: ptToPx(layer.fontSizePt),
    maxWidthPx: width,
    maxHeightPx: height,
    lineHeightRatio: layer.lineHeight,
    shrink: layer.overflow === "shrink",
    setFontSizePx: (px) => {
      ctx.font = buildFont(px);
    },
    measureWidth: (text) => ctx.measureText(text).width,
  });

  ctx.fillStyle = layer.color;
  ctx.textBaseline = "top";
  ctx.textAlign = layer.align;

  const lineHeightPx = fontSizePx * layer.lineHeight;
  const originX = layer.align === "left" ? 0 : layer.align === "right" ? width : width / 2;

  lines.forEach((line, i) => {
    ctx.fillText(line, originX, i * lineHeightPx);
  });
}
