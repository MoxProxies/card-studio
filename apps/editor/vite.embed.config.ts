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
