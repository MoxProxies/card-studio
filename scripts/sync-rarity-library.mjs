// Publishes rarity-library/ (the canonical, hand-editable source of rarity
// symbol artwork) to both consumers: apps/editor (served statically,
// browser) and services/render (read from disk, @napi-rs/canvas) — same
// pattern as sync-frame-library.mjs, just flat (no categories) since
// there's one fixed set of rarity symbols rather than an open-ended
// library. See README's "Adding/changing rarity symbols" section.
//
// rarity-library/<id>.svg  ->  id "<id>", label humanized from the filename
//
// Run with: node scripts/sync-rarity-library.mjs

import { readdirSync, mkdirSync, rmSync, copyFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { humanize } from "./lib/slug.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = path.join(ROOT, "rarity-library");

const TARGETS = [
  {
    imagesDir: path.join(ROOT, "apps/editor/public/rarity"),
    catalogFile: path.join(ROOT, "apps/editor/src/rarityCatalog.generated.json"),
  },
  {
    imagesDir: path.join(ROOT, "services/render/assets/rarity"),
    catalogFile: path.join(ROOT, "services/render/src/rarityCatalog.generated.json"),
  },
];

function scanCatalog() {
  const files = readdirSync(SOURCE_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".svg"))
    .map((e) => e.name)
    .sort();
  return files.map((fileName) => {
    const id = path.basename(fileName, ".svg");
    return { id, label: humanize(id), fileName };
  });
}

function publish(assets) {
  for (const target of TARGETS) {
    rmSync(target.imagesDir, { recursive: true, force: true });
    mkdirSync(target.imagesDir, { recursive: true });
    for (const asset of assets) {
      copyFileSync(path.join(SOURCE_DIR, asset.fileName), path.join(target.imagesDir, asset.fileName));
    }
    writeFileSync(target.catalogFile, JSON.stringify(assets, null, 2) + "\n");
    console.log(`wrote ${assets.length} assets -> ${path.relative(ROOT, target.catalogFile)}`);
  }
}

const assets = scanCatalog();
if (assets.length === 0) {
  console.warn(`No SVGs found under ${path.relative(ROOT, SOURCE_DIR)}/*.svg — nothing to publish.`);
} else {
  publish(assets);
}
