// Watches text-template-library/ and reruns sync-text-templates.mjs on
// every change, so editing a field's position/font/color there takes
// effect in a running dev:editor without ever running a command by hand.
// Started automatically by `pnpm dev:editor` (see dev-editor.mjs); run it
// standalone with `node scripts/watch-text-templates.mjs` if you're
// driving vite yourself.

import { watch } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WATCH_DIR = path.join(ROOT, "text-template-library");
const SYNC_SCRIPT = path.join(ROOT, "scripts", "sync-text-templates.mjs");

function sync() {
  const result = spawnSync(process.execPath, [SYNC_SCRIPT], { stdio: "inherit" });
  if (result.status !== 0) {
    console.error("[watch-text-templates] sync failed — fix the JSON above, then save again.");
  }
}

console.log(`[watch-text-templates] watching ${path.relative(ROOT, WATCH_DIR)}/ — edits sync automatically.`);
sync(); // catch up on anything changed since the last sync before watching

let pending = null;
watch(WATCH_DIR, { persistent: true }, (_event, filename) => {
  if (!filename || !filename.endsWith(".json")) return;
  // Debounced: some editors emit several fs events per save (write + rename).
  clearTimeout(pending);
  pending = setTimeout(sync, 100);
});
