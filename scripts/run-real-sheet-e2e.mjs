import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const participantEnv = readEnvFile(path.join(rootDir, "participant-web", ".env.development"));
const adminEnv = readEnvFile(path.join(rootDir, "admin-web", ".env.development"));

const apiBaseUrl =
  process.env.E2E_REAL_SHEET_API_BASE ||
  participantEnv.VITE_SHEET_API_BASE ||
  adminEnv.VITE_SHEET_API_BASE;
const clientId =
  process.env.E2E_REAL_CLIENT_ID ||
  participantEnv.VITE_CLIENT_ID ||
  adminEnv.VITE_CLIENT_ID;

const env = {
  ...process.env,
  E2E_REAL_SHEET: "1",
  E2E_REAL_SHEET_API_BASE: apiBaseUrl,
  E2E_REAL_CLIENT_ID: clientId,
  E2E_REAL_ADMIN_TOKEN: process.env.E2E_REAL_ADMIN_TOKEN || "admin-demo-2026",
  E2E_REAL_TRAINING_CODE: process.env.E2E_REAL_TRAINING_CODE || "demo-2026",
  E2E_REAL_OTHER_CLIENT_ID: process.env.E2E_REAL_OTHER_CLIENT_ID || `${clientId || "client"}-other-e2e`,
};

for (const name of [
  "E2E_REAL_SHEET_API_BASE",
  "E2E_REAL_CLIENT_ID",
  "E2E_REAL_ADMIN_TOKEN",
  "E2E_REAL_TRAINING_CODE",
]) {
  if (!env[name]) {
    console.error(`Missing ${name}. Set it or add VITE_SHEET_API_BASE / VITE_CLIENT_ID to .env.development.`);
    process.exit(1);
  }
}

const result = spawnSync(
  process.execPath,
  [path.join(rootDir, "node_modules", "@playwright", "test", "cli.js"), "test", "-c", "playwright.real-sheet.config.ts"],
  {
    cwd: rootDir,
    env,
    stdio: "inherit",
  },
);

if (result.error) {
  console.error(result.error.message);
}
if (result.signal) {
  console.error(`Playwright terminated by signal ${result.signal}`);
}

process.exit(result.status ?? 1);

function readEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  return Object.fromEntries(
    readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const eq = line.indexOf("=");
        if (eq === -1) return [line, ""];
        return [line.slice(0, eq).trim(), line.slice(eq + 1).trim()];
      }),
  );
}
