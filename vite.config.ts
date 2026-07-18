import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import os from "node:os";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "client", "src"), "@shared": path.resolve(import.meta.dirname, "shared") } },
  // OneDrive and synced folders can deny writes below node_modules. Keep Vite's
  // transient optimizer cache in a project-local, source-controlled-safe folder.
  cacheDir: process.env.MEDRELAY_VITE_CACHE_DIR || path.join(os.tmpdir(), "medrelay-vite-cache"),
  root: path.resolve(import.meta.dirname, "client"),
  build: { outDir: path.resolve(import.meta.dirname, "dist/public"), emptyOutDir: true },
});
