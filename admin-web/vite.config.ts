import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteAppBase } from "../scripts/pages-base.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const base = viteAppBase("admin");

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": path.resolve(dir, "../shared/src"),
    },
  },
  server: {
    port: 5174,
    open: "/admin/embed-preview.html",
  },
});
