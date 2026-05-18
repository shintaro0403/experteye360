import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/participant/",
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": path.resolve(dir, "../shared/src"),
    },
  },
  server: {
    port: 5173,
    open: "/participant/embed-preview.html",
  },
});
