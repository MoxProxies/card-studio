// Publishes text-template-library/ (the canonical, hand-editable source of
// per-frame-category text field placement/font/color config) to its one
// consumer, apps/editor. Two jobs, run every time:
//
// 1. Bootstrap: any frame-library/<category>/ that doesn't yet have a
//    matching text-template-library/<category>.json gets one, duplicated
//    verbatim from text-template-library/_base.json — the base config is
//    a reasonable starting point for any classic-MTG-shaped frame, and a
//    duplicate is something you can safely hand-edit per field without
//    touching _base.json or any other category.
// 2. Publish: bundles every *.json under text-template-library/ (the base
//    plus every category, including ones with no frame-library folder
//    anymore — never deleted automatically) into one generated catalog,
//    apps/editor/src/textTemplateCatalog.generated.json.
//
// text-template-library/_base.json           -> the default/fallback set
// text-template-library/<category>.json       -> per-frame-category override
//
// Run with: node scripts/sync-text-templates.mjs (after sync-frames, if
// you just added a new frame category — see README's "MTG text fields"
// section).

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = path.join(ROOT, "text-template-library");
const FRAME_SOURCE_DIR = path.join(ROOT, "frame-library");
const BASE_FILE = path.join(SOURCE_DIR, "_base.json");
const CATALOG_FILE = path.join(ROOT, "apps/editor/src/textTemplateCatalog.generated.json");

if (!existsSync(BASE_FILE)) {
  console.error(`Missing ${path.relative(ROOT, BASE_FILE)} — this is the default field set every category config`);
  console.error(`starts as a duplicate of, and must exist. Nothing published.`);
  process.exit(1);
}

const frameCategories = readdirSync(FRAME_SOURCE_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

const baseRaw = readFileSync(BASE_FILE, "utf8");
for (const category of frameCategories) {
  const categoryFile = path.join(SOURCE_DIR, `${category}.json`);
  if (existsSync(categoryFile)) continue;
  writeFileSync(categoryFile, baseRaw);
  console.log(`created ${path.relative(ROOT, categoryFile)} (duplicate of _base.json — tune it to fit the "${category}" frames)`);
}

function readTemplateFile(file) {
  const templates = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(templates)) {
    throw new Error(`${path.relative(ROOT, file)} must be a JSON array of text field templates`);
  }
  return templates;
}

const catalog = { base: readTemplateFile(BASE_FILE), categories: {} };
for (const file of readdirSync(SOURCE_DIR)) {
  if (!file.endsWith(".json") || file === "_base.json") continue;
  const category = path.basename(file, ".json");
  catalog.categories[category] = readTemplateFile(path.join(SOURCE_DIR, file));
}

writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2) + "\n");
console.log(
  `wrote base + ${Object.keys(catalog.categories).length} category override(s) -> ${path.relative(ROOT, CATALOG_FILE)}`
);
