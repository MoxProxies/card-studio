// One-off generator for the built-in frame catalog's placeholder artwork.
//
// These are original, generic trading-card frame templates (border + name
// bar + type bar + text box + PT box) drawn with @napi-rs/canvas — not a
// reproduction of any specific card game's copyrighted frame design. The
// area between the name bar and type bar is deliberately left untouched
// (fully transparent), so an Image layer placed underneath a Frame layer
// shows through as the card's art.
//
// Canvas covers the full BLEED size, not just the cut/trim size — frame
// layers are sized to bleed by default (see Toolbar.tsx's addFrame), so
// art authored only to cut size would leave a background-color gap around
// the whole card once printed and trimmed. The bleed margin here is a
// uniform 3.048mm added on every side (not a proportional scale-up — see
// packages/scene-schema/src/units.ts's STANDARD_CARD_SIZE_MM for why),
// converted to px at this canvas's own px/mm so it lines up with the real
// spec regardless of what CUT_W/CUT_H are set to.
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

const CUT_W = 630;
const CUT_H = 880;
const CUT_W_MM = 62.992;
const BLEED_MARGIN_MM = 3.048;
const MARGIN = Math.round((CUT_W / CUT_W_MM) * BLEED_MARGIN_MM);
const W = CUT_W + MARGIN * 2;
const H = CUT_H + MARGIN * 2;

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

  // Fill the full bleed canvas with the border color first — this is what
  // actually reaches the true edge; everything below is positioned in the
  // same relative layout as before, just offset by MARGIN into this larger
  // canvas.
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, H);

  // Outer border, inset from the *cut* edge (MARGIN in from the canvas edge).
  ctx.lineWidth = 26;
  ctx.strokeStyle = primary;
  roundedRectPath(ctx, MARGIN + 20, MARGIN + 20, CUT_W - 40, CUT_H - 40, 22);
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.strokeStyle = accent;
  roundedRectPath(ctx, MARGIN + 20, MARGIN + 20, CUT_W - 40, CUT_H - 40, 22);
  ctx.stroke();

  // Name bar.
  ctx.fillStyle = primary;
  roundedRectPath(ctx, MARGIN + 40, MARGIN + 40, CUT_W - 80, 62, 10);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = accent;
  roundedRectPath(ctx, MARGIN + 40, MARGIN + 40, CUT_W - 80, 62, 10);
  ctx.stroke();

  // Type line bar (sits above the text box, below the art window).
  const typeBarY = MARGIN + 618;
  ctx.fillStyle = primary;
  roundedRectPath(ctx, MARGIN + 40, typeBarY, CUT_W - 80, 46, 8);
  ctx.fill();
  ctx.strokeStyle = accent;
  roundedRectPath(ctx, MARGIN + 40, typeBarY, CUT_W - 80, 46, 8);
  ctx.stroke();

  // Set-symbol placeholder circle, right end of the type bar.
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(MARGIN + CUT_W - 40 - 30, typeBarY + 23, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = accent;
  ctx.stroke();

  // Rules-text box — neutral parchment so text stays readable on any theme.
  const textBoxY = typeBarY + 46 + 8;
  ctx.fillStyle = "#f2ead9";
  ctx.globalAlpha = 0.96;
  roundedRectPath(ctx, MARGIN + 40, textBoxY, CUT_W - 80, MARGIN + CUT_H - 40 - textBoxY - 10, 10);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 3;
  ctx.strokeStyle = accent;
  roundedRectPath(ctx, MARGIN + 40, textBoxY, CUT_W - 80, MARGIN + CUT_H - 40 - textBoxY - 10, 10);
  ctx.stroke();

  // Power/toughness box, bottom-right corner, drawn last so it sits on top.
  const ptW = 118;
  const ptH = 52;
  ctx.fillStyle = primary;
  roundedRectPath(ctx, MARGIN + CUT_W - 40 - ptW, MARGIN + CUT_H - 40 - ptH, ptW, ptH, 8);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = accent;
  roundedRectPath(ctx, MARGIN + CUT_W - 40 - ptW, MARGIN + CUT_H - 40 - ptH, ptW, ptH, 8);
  ctx.stroke();

  // Punch the art window back out to fully transparent — the base
  // full-bleed fill above (needed so the *border* reaches the true edge)
  // would otherwise paint over it too. Nothing else is drawn in this
  // region (it sits between the name bar and the type bar), so clearing
  // it last, after everything else, is safe.
  const artWindowX = MARGIN + 40;
  const artWindowY = MARGIN + 102;
  const artWindowWidth = CUT_W - 80;
  const artWindowHeight = typeBarY - artWindowY;
  ctx.clearRect(artWindowX, artWindowY, artWindowWidth, artWindowHeight);

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
