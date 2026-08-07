// Publishes frame-library/ (the canonical, hand-editable source of frame
// artwork) to both consumers: apps/editor (served statically, browser) and
// services/render (read from disk, @napi-rs/canvas). Run this any time you
// add, rename, or remove a file under frame-library/ — see README's
// "Adding frames" section.
//
// frame-library/<category>/<slug>.png  ->  id "<category>/<slug>"
//
// Run with: node scripts/sync-frame-library.mjs

import { readdirSync, mkdirSync, rmSync, copyFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { humanize } from "./lib/slug.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = path.join(ROOT, "frame-library");
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

const TARGETS = [
  {
    imagesDir: path.join(ROOT, "apps/editor/public/frames"),
    catalogFile: path.join(ROOT, "apps/editor/src/frameCatalog.generated.json"),
  },
  {
    imagesDir: path.join(ROOT, "services/render/assets/frames"),
    catalogFile: path.join(ROOT, "services/render/src/frameCatalog.generated.json"),
  },
];

function scanCatalog() {
  const categories = readdirSync(SOURCE_DIR, { withFileTypes: true }).filter((e) => e.isDirectory());
  const assets = [];
  for (const categoryEntry of categories) {
    const category = categoryEntry.name;
    const categoryDir = path.join(SOURCE_DIR, category);
    const files = readdirSync(categoryDir, { withFileTypes: true })
      .filter((e) => e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
      .map((e) => e.name)
      .sort();
    for (const fileName of files) {
      const slug = path.basename(fileName, path.extname(fileName));
      assets.push({
        id: `${category}/${slug}`,
        name: humanize(slug),
        category,
        categoryLabel: humanize(category),
        fileName,
      });
    }
  }
  assets.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  return assets;
}

function publish(assets) {
  for (const target of TARGETS) {
    rmSync(target.imagesDir, { recursive: true, force: true });
    for (const asset of assets) {
      const destDir = path.join(target.imagesDir, asset.category);
      mkdirSync(destDir, { recursive: true });
      copyFileSync(path.join(SOURCE_DIR, asset.category, asset.fileName), path.join(destDir, asset.fileName));
    }
    writeFileSync(target.catalogFile, JSON.stringify(assets, null, 2) + "\n");
    console.log(`wrote ${assets.length} assets -> ${path.relative(ROOT, target.catalogFile)}`);
  }
}

const assets = scanCatalog();
if (assets.length === 0) {
  console.warn(`No frame images found under ${path.relative(ROOT, SOURCE_DIR)}/<category>/*.png — nothing to publish.`);
} else {
  publish(assets);
}
