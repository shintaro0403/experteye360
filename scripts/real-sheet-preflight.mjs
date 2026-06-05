/**
 * 実 GAS 向け E2E の事前確認（資格情報・到達性）。
 * Usage: npm run preflight:real-sheet
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const participantEnv = readEnvFile(path.join(rootDir, "participant-web", ".env.development"));

const apiBaseUrl =
  process.env.E2E_REAL_SHEET_API_BASE ||
  participantEnv.VITE_SHEET_API_BASE;
const clientId =
  process.env.E2E_REAL_CLIENT_ID ||
  participantEnv.VITE_CLIENT_ID;
const adminToken = process.env.E2E_REAL_ADMIN_TOKEN || "admin-demo-2026";
const trainingCode = process.env.E2E_REAL_TRAINING_CODE || "demo-2026";

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

if (!apiBaseUrl?.trim()) fail("VITE_SHEET_API_BASE / E2E_REAL_SHEET_API_BASE が未設定です。");
if (!clientId?.trim()) fail("VITE_CLIENT_ID / E2E_REAL_CLIENT_ID が未設定です。");

async function fetchJson(pathName, params, init) {
  const url = new URL(apiBaseUrl);
  url.searchParams.set("path", pathName);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url, init);
  const body = await response.json();
  return { httpOk: response.ok, body };
}

const settings = await fetchJson("settings", { client: clientId });
if (isApiError(settings.body)) {
  fail(`GET settings: ${settings.body.error}（client=${clientId}）`);
}
console.log("OK: GET settings");

const verify = await fetchJson(
  "rooms/verify",
  { client: clientId },
  {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ accessCode: trainingCode }),
  },
);
if (isApiError(verify.body)) {
  fail(
    `POST rooms/verify: ${verify.body.error}（E2E_REAL_TRAINING_CODE=${trainingCode} がシートと不一致。GAS で resetDemoTrainingCode() または管理者 UI で demo-2026 に戻す）`,
  );
}
const roomId = verify.body.roomId;
console.log(`OK: POST rooms/verify → roomId=${roomId}`);

const responses = await fetchJson("responses", {
  client: clientId,
  room: roomId,
  token: adminToken,
});
if (isApiError(responses.body)) {
  fail(
    `GET responses: ${responses.body.error}（E2E_REAL_ADMIN_TOKEN が無効。GAS で resetDemoAdminToken() または実 token を env に設定）`,
  );
}
console.log(`OK: GET responses（${Array.isArray(responses.body) ? responses.body.length : 0} 件）`);
console.log("preflight 完了。npm run test:e2e:real-sheet を実行できます。");

function isApiError(body) {
  return Boolean(body && typeof body === "object" && body.ok === false);
}

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
