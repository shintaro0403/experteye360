import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: [
      "shared/src/**/*.test.{ts,tsx}",
      "admin-web/src/**/*.test.tsx",
      "participant-web/src/**/*.test.tsx",
    ],
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@shared": path.resolve(root, "shared/src"),
      react: path.resolve(root, "node_modules/react"),
      "react-dom": path.resolve(root, "node_modules/react-dom"),
      "react/jsx-runtime": path.resolve(root, "node_modules/react/jsx-runtime"),
    },
  },
});
