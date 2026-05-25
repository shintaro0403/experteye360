import { defineConfig, devices } from "@playwright/test";

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
      command: "node scripts/e2e-storage-server.mjs",
      url: "http://127.0.0.1:5199/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "npm --prefix participant-web run dev -- --host 127.0.0.1",
      url: "http://127.0.0.1:5173/participant/",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "npm --prefix admin-web run dev -- --host 127.0.0.1",
      url: "http://127.0.0.1:5174/admin/",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
