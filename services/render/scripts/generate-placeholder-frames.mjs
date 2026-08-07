// One-off generator for the built-in frame catalog's placeholder artwork.
//
// These are original, generic trading-card frame templates (border + name
// bar + type bar + text box + PT box) drawn with @napi-rs/canvas — not a
// reproduction of any specific card game's copyrighted frame design. The
// area between the name bar and type bar is deliberately left untouched
// (fully transparent), so an Image layer placed underneath a Frame layer
// shows through as the card's art.
//
// Run with: node services/render/scripts/generate-placeholder-frames.mjs
// Writes into frame-library/classic/ — the canonical source directory for
// frame art (see README's "Adding frames" section). Run
// `node scripts/sync-frame-library.mjs` afterwards to publish it to both
// apps/editor and services/render.

import { createCanvas } from "@napi-rs/canvas";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const W = 630;
const H = 880;

const THEMES = [
  { fileName: "classic-white.png", primary: "#f8f4e3", accent: "#a9975c" },
  { fileName: "classic-blue.png", primary: "#1c6fb0", accent: "#0b3f63" },
  { fileName: "classic-black.png", primary: "#26221f", accent: "#000000" },
  { fileName: "classic-red.png", primary: "#b8402f", accent: "#6e2119" },
  { fileName: "classic-green.png", primary: "#256e3f", accent: "#12401f" },
  { fileName: "classic-gold.png", primary: "#c9a227", accent: "#7c5e12" },
];

function roundedRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawFrame({ primary, accent }) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  // Canvas starts fully transparent — anything not explicitly painted
  // (the art window) stays that way.

  // Outer border.
  ctx.lineWidth = 26;
  ctx.strokeStyle = primary;
  roundedRectPath(ctx, 20, 20, W - 40, H - 40, 22);
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.strokeStyle = accent;
  roundedRectPath(ctx, 20, 20, W - 40, H - 40, 22);
  ctx.stroke();

  // Name bar.
  ctx.fillStyle = primary;
  roundedRectPath(ctx, 40, 40, W - 80, 62, 10);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = accent;
  roundedRectPath(ctx, 40, 40, W - 80, 62, 10);
  ctx.stroke();

  // Type line bar (sits above the text box, below the art window).
  const typeBarY = 618;
  ctx.fillStyle = primary;
  roundedRectPath(ctx, 40, typeBarY, W - 80, 46, 8);
  ctx.fill();
  ctx.strokeStyle = accent;
  roundedRectPath(ctx, 40, typeBarY, W - 80, 46, 8);
  ctx.stroke();

  // Set-symbol placeholder circle, right end of the type bar.
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(W - 40 - 30, typeBarY + 23, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = accent;
  ctx.stroke();

  // Rules-text box — neutral parchment so text stays readable on any theme.
  const textBoxY = typeBarY + 46 + 8;
  ctx.fillStyle = "#f2ead9";
  ctx.globalAlpha = 0.96;
  roundedRectPath(ctx, 40, textBoxY, W - 80, H - 40 - textBoxY - 10, 10);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 3;
  ctx.strokeStyle = accent;
  roundedRectPath(ctx, 40, textBoxY, W - 80, H - 40 - textBoxY - 10, 10);
  ctx.stroke();

  // Power/toughness box, bottom-right corner, drawn last so it sits on top.
  const ptW = 118;
  const ptH = 52;
  ctx.fillStyle = primary;
  roundedRectPath(ctx, W - 40 - ptW, H - 40 - ptH, ptW, ptH, 8);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = accent;
  roundedRectPath(ctx, W - 40 - ptW, H - 40 - ptH, ptW, ptH, 8);
  ctx.stroke();

  return canvas.encode("png");
}

async function main() {
  const outDir = path.resolve(__dirname, "../../../frame-library/classic");
  mkdirSync(outDir, { recursive: true });

  for (const theme of THEMES) {
    const png = await drawFrame(theme);
    writeFileSync(path.join(outDir, theme.fileName), png);
    console.log("generated", theme.fileName);
  }

  console.log("\nRun `node scripts/sync-frame-library.mjs` to publish these.");
}

main();
