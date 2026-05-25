import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["shared/src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@shared": path.resolve(root, "shared/src"),
    },
  },
});
