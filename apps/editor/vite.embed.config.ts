import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

/**
 * Embed build — a single JS bundle that registers the
 * <card-studio-editor> custom element, meant to be loaded from a
 * <script type="module"> tag on moxproxies-website and mounted into
 * a plain <card-studio-editor> element in the page markup.
 */
export default defineConfig({
  plugins: [react()],
  // Vite's standard app build replaces process.env.NODE_ENV automatically
  // (React's CJS wrapper branches on it); library mode doesn't pick that up
  // the same way, so left implicit this bundle throws "process is not
  // defined" the moment it runs in a plain browser — exactly the environment
  // it's loaded into on the host page. Must be set explicitly here.
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: "dist/embed",
    lib: {
      entry: resolve(__dirname, "src/embed.ts"),
      formats: ["es"],
      fileName: () => "card-studio-embed.js",
    },
    // Keep the bundle self-contained so the host page doesn't need to
    // provide React itself.
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
