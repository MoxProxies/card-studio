import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Standalone app build — served on its own (e.g. studio.moxproxies.com)
 * for direct, full-page use of the editor.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4173,
  },
  build: {
    outDir: "dist/app",
  },
});
