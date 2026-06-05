import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
const dir = path.dirname(fileURLToPath(import.meta.url));
const pagesRepo = process.env.VITE_PAGES_REPO?.trim();
const base = pagesRepo ? `/${pagesRepo}/admin/` : "/admin/";

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
