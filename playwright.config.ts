import { defineConfig, devices } from "@playwright/test";

const sheetBackendEnv = {
  VITE_STORAGE_BACKEND: "sheet",
  VITE_SHEET_API_BASE: "http://127.0.0.1:5198/exec",
  VITE_CLIENT_ID: "client-demo",
};

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  reporter: "list",
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "node scripts/e2e-sheet-api-server.mjs",
      url: "http://127.0.0.1:5198/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "npm --prefix participant-web run dev -- --host 127.0.0.1 --port 5275 --mode e2e",
      url: "http://127.0.0.1:5275/participant/",
      env: sheetBackendEnv,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "npm --prefix admin-web run dev -- --host 127.0.0.1 --port 5276 --mode e2e",
      url: "http://127.0.0.1:5276/admin/",
      env: sheetBackendEnv,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
