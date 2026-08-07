// Runs the editor dev server and the text-template-library watcher
// together, so editing a field config under text-template-library/ takes
// effect in the running editor without ever running a command by hand —
// see README's "MTG text fields" section. Bound to `pnpm dev:editor`.

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const children = [
  spawn(process.execPath, [path.join(ROOT, "scripts/watch-text-templates.mjs")], { stdio: "inherit" }),
  // pnpm ships as a .cmd shim on Windows, which spawn() can only launch via a shell.
  spawn("pnpm", ["--filter", "@card-studio/editor", "dev"], { stdio: "inherit", shell: process.platform === "win32" }),
];

let shuttingDown = false;
function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill();
  process.exit(code);
}

for (const child of children) {
  child.on("exit", (code) => shutdown(code ?? 0));
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
