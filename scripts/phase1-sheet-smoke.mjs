/**
 * Phase 1: 手元 .env.development が実 GAS（sheet backend）に届くかのスモーク。
 * 受け入れ条件の自動補助（TDD ステップ 2）。UI は含まない。
 *
 * Usage: npm run smoke:phase1-sheet
 * Optional: PHASE1_TRAINING_CODE=demo-2026
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const participantEnv = readEnvFile(path.join(rootDir, "participant-web", ".env.development"));
const adminEnv = readEnvFile(path.join(rootDir, "admin-web", ".env.development"));

const apiBase = participantEnv.VITE_SHEET_API_BASE || adminEnv.VITE_SHEET_API_BASE;
const clientId = participantEnv.VITE_CLIENT_ID || adminEnv.VITE_CLIENT_ID;
const trainingCode = process.env.PHASE1_TRAINING_CODE?.trim() || "demo-2026";

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`OK: ${message}`);
}

if (!existsSync(path.join(rootDir, "participant-web", ".env.development"))) {
  fail("participant-web/.env.development がありません。§5.2 を参照して作成してください。");
}
if (!existsSync(path.join(rootDir, "admin-web", ".env.development"))) {
  fail("admin-web/.env.development がありません。§5.2 を参照して作成してください。");
}

for (const [label, env] of [
  ["participant-web", participantEnv],
  ["admin-web", adminEnv],
]) {
  if (env.VITE_STORAGE_BACKEND !== "sheet") {
    fail(`${label}: VITE_STORAGE_BACKEND=sheet が必要です（現在: ${env.VITE_STORAGE_BACKEND || "(未設定)"}）`);
  }
}

if (participantEnv.VITE_SHEET_API_BASE && adminEnv.VITE_SHEET_API_BASE) {
  if (participantEnv.VITE_SHEET_API_BASE !== adminEnv.VITE_SHEET_API_BASE) {
    fail("participant-web と admin-web の VITE_SHEET_API_BASE が一致しません。");
  }
}
if (participantEnv.VITE_CLIENT_ID && adminEnv.VITE_CLIENT_ID) {
  if (participantEnv.VITE_CLIENT_ID !== adminEnv.VITE_CLIENT_ID) {
    fail("participant-web と admin-web の VITE_CLIENT_ID が一致しません。");
  }
}

if (!apiBase) fail("VITE_SHEET_API_BASE を .env.development に設定してください。");
if (!clientId) fail("VITE_CLIENT_ID を .env.development に設定してください。");

ok(`backend=sheet client=${clientId}`);

const settingsUrl = buildUrl(apiBase, "settings", { client: clientId });
const settings = await requestJson(settingsUrl);
if (!settings || typeof settings !== "object" || !Array.isArray(settings.scenes)) {
  fail("GET settings が AppSettings 形式ではありません。");
}
ok(`GET settings（scenes=${settings.scenes.length}）`);

const roomIdForClear = settings.rooms?.[0]?.roomId || "demo-room-001";
const adminToken = process.env.PHASE1_ADMIN_TOKEN?.trim() || "admin-demo-2026";
const clearProbeUrl = buildUrl(apiBase, "responses/clear", {
  client: clientId,
  room: roomIdForClear,
  token: adminToken,
});
const clearProbe = await requestJson(
  clearProbeUrl,
  {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
  },
  { allowApiError: true },
);
if (clearProbe?.error?.includes("Unknown route")) {
  fail(
    "POST responses/clear が未デプロイです。gas/Code.gs を反映し Apps Script で「新しいデプロイ」してから VITE_SHEET_API_BASE を更新してください。",
  );
}
if (clearProbe?.ok === false && clearProbe.status === 401) {
  ok("POST responses/clear ルートあり（token 照合まで到達）");
} else if (clearProbe?.ok === true) {
  ok("POST responses/clear ルートあり");
} else {
  ok(`POST responses/clear ルートあり（応答: ${clearProbe?.error || "ok"})`);
}

const verifyUrl = buildUrl(apiBase, "rooms/verify", { client: clientId });
const verified = await requestJson(verifyUrl, {
  method: "POST",
  headers: { "Content-Type": "text/plain;charset=utf-8" },
  body: JSON.stringify({ accessCode: trainingCode }),
});
if (!verified?.roomId) {
  fail(`POST rooms/verify（研修コード ${trainingCode}）が roomId を返しません。`);
}
ok(`POST rooms/verify → roomId=${verified.roomId}`);

// 非破壊プローブ: 不正 token でルート存在のみ確認する（実際の研修コードは書き換えない）
const accessCodeProbe = await requestJson(
  buildUrl(apiBase, "rooms/access-code", {
    client: clientId,
    token: "__smoke-invalid-token__",
  }),
  {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      roomId: verified.roomId,
      nextAccessCode: "__smoke-probe-do-not-use__",
    }),
  },
  { allowApiError: true },
);
if (accessCodeProbe?.error?.includes("Unknown route")) {
  fail(
    "POST rooms/access-code が未デプロイです。gas/Code.gs を反映し Apps Script で「新しいデプロイ」してから VITE_SHEET_API_BASE を更新してください。",
  );
}
if (accessCodeProbe?.ok === false && accessCodeProbe.status === 401) {
  ok("POST rooms/access-code ルートあり（token 照合まで到達・研修コードは未変更）");
} else if (accessCodeProbe?.ok === true) {
  fail(
    "POST rooms/access-code が不正 token を受理しました。GAS の verifyAdminToken_ を確認してください。",
  );
} else {
  ok(`POST rooms/access-code ルートあり（応答: ${accessCodeProbe?.error || "ok"})`);
}

const provisionProbe = await requestJson(
  buildUrl(apiBase, "rooms/provision", { client: clientId }),
  {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      token: "__smoke-invalid-token__",
      accessCode: "__smoke-probe-do-not-use__",
    }),
  },
  { allowApiError: true },
);
if (provisionProbe?.error?.includes("Unknown route")) {
  fail(
    "POST rooms/provision が未デプロイです。gas/Code.gs を反映し Apps Script で「デプロイを管理」→ 既存デプロイの編集 → 新バージョンでデプロイしてください。",
  );
}
if (provisionProbe?.ok === false && provisionProbe.status === 401) {
  ok("POST rooms/provision ルートあり（token 照合まで到達）");
} else if (provisionProbe?.ok === true) {
  fail(
    "POST rooms/provision が不正 token を受理しました。GAS の verifyAdminTokenForSettings_ を確認してください。",
  );
} else {
  ok(`POST rooms/provision ルートあり（応答: ${provisionProbe?.error || "ok"})`);
}

console.log("\nPhase 1 自動スモーク: すべて成功。");
console.log("次: npm run dev:participant / dev:admin でブラウザ確認（§5.3）。");

function buildUrl(apiBaseUrl, apiPath, params) {
  const url = new URL(apiBaseUrl);
  url.searchParams.set("path", apiPath);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function requestJson(url, init, options = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    fail(`JSON でない応答 (${response.status}): ${text.slice(0, 200)}`);
  }
  if (
    !options.allowApiError &&
    (!response.ok || (body && typeof body === "object" && body.ok === false))
  ) {
    const err = body?.error || text.slice(0, 200);
    fail(`API エラー (${response.status}): ${err}`);
  }
  return body;
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
