// Publishes symbol-library/ (the canonical, hand-editable source of inline
// text symbols — mana colors, tap/untap, etc.) to both consumers: apps/editor
// (served statically, browser) and services/render (read from disk,
// @napi-rs/canvas) — same pattern as sync-rarity-library.mjs. These are
// distinct from rarity-library/'s symbols: rarity symbols are placed as a
// single whole layer, these get woven inline into wrapped/shrunk text (e.g.
// rules text) wherever a {token} appears — see README's "Inline symbols in
// text" section.
//
// symbol-library/<id>.svg  ->  id "<id>" (lowercase, "/" -> "-" for hybrid
// symbols like w-u.svg for {W/U})
//
// Run with: node scripts/sync-symbol-library.mjs

import { readdirSync, mkdirSync, rmSync, copyFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { humanize } from "./lib/slug.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = path.join(ROOT, "symbol-library");

const TARGETS = [
  {
    imagesDir: path.join(ROOT, "apps/editor/public/symbols"),
    catalogFile: path.join(ROOT, "apps/editor/src/symbolCatalog.generated.json"),
  },
  {
    imagesDir: path.join(ROOT, "services/render/assets/symbols"),
    catalogFile: path.join(ROOT, "services/render/src/symbolCatalog.generated.json"),
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
