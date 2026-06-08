import { defineConfig, devices } from "@playwright/test";

const sheetBackendEnv = {
  VITE_STORAGE_BACKEND: "sheet",
  VITE_SHEET_API_BASE: "http://127.0.0.1:5198/exec",
  VITE_CLIENT_ID: "client-demo",
};

export default defineConfig({
  testDir: "./e2e",
  // CI では mock E2E のみ（実 GAS は Secrets 未設定時に preflight が落ちるため除外）
  testIgnore: process.env.CI ? ["**/real-sheet-api.spec.ts"] : undefined,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  // 単一・状態共有の mock サーバー（scripts/e2e-sheet-api-server.mjs）を複数ワーカーが
  // 並列に叩くと state 競合で flaky になるため、E2E は直列（単一ワーカー）で実行する。
  fullyParallel: false,
  workers: 1,
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
