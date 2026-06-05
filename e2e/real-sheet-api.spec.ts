import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

type ApiErrorBody = {
  ok: false;
  status?: number;
  error?: string;
};

type ParticipantSubmission = {
  id: string;
  createdAt: string;
  participantName: string;
  affiliation: string;
  roomId: string;
  sceneId: string;
  rounds: Array<{
    awarenessSelection: string[];
    actionSelection: string[];
    criteriaOrdered: string[];
    roundNote: string;
  }>;
  confidenceLevel: number;
};

const enabled = process.env.E2E_REAL_SHEET === "1";

let preflightOk = false;
let preflightMessage = "";
let resolvedRoomId = "";

test.describe.configure({ mode: "serial" });

test.describe("Real Sheet API（実 GAS / 実シート）", () => {
  test.skip(!enabled, "Set E2E_REAL_SHEET=1 to run against the real GAS / Sheet backend.");

  test.beforeAll(async () => {
    try {
      const apiBaseUrl = requiredEnv("E2E_REAL_SHEET_API_BASE");
      const clientId = requiredEnv("E2E_REAL_CLIENT_ID");
      const adminToken = requiredEnv("E2E_REAL_ADMIN_TOKEN");
      const trainingCode = requiredEnv("E2E_REAL_TRAINING_CODE");

      await fetchSheetJson(apiBaseUrl, "settings", { client: clientId });

      const verified = await verifyRoom(apiBaseUrl, clientId, trainingCode);
      resolvedRoomId = verified.roomId;

      const responses = await listResponses(apiBaseUrl, clientId, verified.roomId, adminToken);
      expect(Array.isArray(responses)).toBe(true);

      preflightOk = true;
    } catch (error) {
      preflightOk = false;
      preflightMessage = formatPreflightError(error);
    }
  });

  test.beforeEach(() => {
    test.skip(
      !preflightOk,
      preflightMessage ||
        "Preflight failed. Set E2E_REAL_TRAINING_CODE / E2E_REAL_ADMIN_TOKEN to match the sheet, or run GAS resetDemoAdminToken() and restore demo-2026.",
    );
  });

  test("preflight: 実 GAS・研修コード・管理者 token が有効", async () => {
    expect(preflightOk, preflightMessage).toBe(true);
    expect(resolvedRoomId).toBeTruthy();
  });

  test("別 client / 別 room に E2E 回答を返さない", async () => {
    const apiBaseUrl = requiredEnv("E2E_REAL_SHEET_API_BASE");
    const clientId = requiredEnv("E2E_REAL_CLIENT_ID");
    const adminToken = requiredEnv("E2E_REAL_ADMIN_TOKEN");
    const otherClientId = process.env.E2E_REAL_OTHER_CLIENT_ID?.trim() || `${clientId}-other-e2e`;

    const submission = buildSubmission(resolvedRoomId);
    await postResponse(apiBaseUrl, clientId, resolvedRoomId, submission);

    await expect.poll(async () => {
      const responses = await listResponses(apiBaseUrl, clientId, resolvedRoomId, adminToken);
      return responses.some((response) => response.id === submission.id);
    }, {
      timeout: 15_000,
      message: "実シートに保存した E2E 回答が同一 client + room で取得できる",
    }).toBe(true);

    const otherClientBody = await fetchSheetJson<unknown>(
      apiBaseUrl,
      "responses",
      { client: otherClientId, room: resolvedRoomId, token: adminToken },
    );
    expect(JSON.stringify(otherClientBody)).not.toContain(submission.id);
    expect(isApiErrorBody(otherClientBody)).toBe(true);

    const otherRoomBody = await fetchSheetJson<unknown>(
      apiBaseUrl,
      "responses",
      { client: clientId, room: `${resolvedRoomId}-other-e2e`, token: adminToken },
    );
    expect(JSON.stringify(otherRoomBody)).not.toContain(submission.id);
    expect(isApiErrorBody(otherRoomBody)).toBe(true);
  });

  test("研修コード変更後は旧コード拒否・新コード OK（最後に元に戻す）", async () => {
    const apiBaseUrl = requiredEnv("E2E_REAL_SHEET_API_BASE");
    const clientId = requiredEnv("E2E_REAL_CLIENT_ID");
    const adminToken = requiredEnv("E2E_REAL_ADMIN_TOKEN");
    const originalCode = requiredEnv("E2E_REAL_TRAINING_CODE");
    const tempCode = `e2e-tc-${randomUUID().slice(0, 8)}`;

    try {
      await changeTrainingCode(apiBaseUrl, clientId, adminToken, resolvedRoomId, tempCode);

      const oldVerify = await fetchSheetJson<unknown>(
        apiBaseUrl,
        "rooms/verify",
        { client: clientId },
        postJson({ accessCode: originalCode }),
      );
      expect(isApiErrorBody(oldVerify)).toBe(true);

      const reVerified = await verifyRoom(apiBaseUrl, clientId, tempCode);
      expect(reVerified.roomId).toBe(resolvedRoomId);
    } finally {
      await changeTrainingCode(apiBaseUrl, clientId, adminToken, resolvedRoomId, originalCode);
      const restored = await verifyRoom(apiBaseUrl, clientId, originalCode);
      expect(restored.roomId).toBe(resolvedRoomId);
    }
  });

  test("管理者コード変更後は旧 token 拒否・新 token OK（最後に元に戻す）", async () => {
    const apiBaseUrl = requiredEnv("E2E_REAL_SHEET_API_BASE");
    const clientId = requiredEnv("E2E_REAL_CLIENT_ID");
    const originalToken = requiredEnv("E2E_REAL_ADMIN_TOKEN");
    const tempToken = `e2e-adm-${randomUUID().slice(0, 8)}`;

    try {
      await changeAdminToken(apiBaseUrl, clientId, originalToken, tempToken);

      const oldTokenBody = await fetchSheetJson<unknown>(
        apiBaseUrl,
        "responses",
        { client: clientId, room: resolvedRoomId, token: originalToken },
      );
      expect(isApiErrorBody(oldTokenBody)).toBe(true);

      const responses = await listResponses(apiBaseUrl, clientId, resolvedRoomId, tempToken);
      expect(Array.isArray(responses)).toBe(true);
    } finally {
      await changeAdminToken(apiBaseUrl, clientId, tempToken, originalToken);
      const responses = await listResponses(apiBaseUrl, clientId, resolvedRoomId, originalToken);
      expect(Array.isArray(responses)).toBe(true);
    }
  });

  test("responses/clear は当該 room の E2E 回答を削除する", async () => {
    const apiBaseUrl = requiredEnv("E2E_REAL_SHEET_API_BASE");
    const clientId = requiredEnv("E2E_REAL_CLIENT_ID");
    const adminToken = requiredEnv("E2E_REAL_ADMIN_TOKEN");

    const submission = buildSubmission(resolvedRoomId);
    await postResponse(apiBaseUrl, clientId, resolvedRoomId, submission);

    await expect.poll(async () => {
      const responses = await listResponses(apiBaseUrl, clientId, resolvedRoomId, adminToken);
      return responses.some((response) => response.id === submission.id);
    }, {
      timeout: 15_000,
      message: "clear 前に E2E 回答が一覧に載る",
    }).toBe(true);

    const cleared = await clearResponses(apiBaseUrl, clientId, resolvedRoomId, adminToken);
    expect(cleared.ok).toBe(true);

    await expect.poll(async () => {
      const responses = await listResponses(apiBaseUrl, clientId, resolvedRoomId, adminToken);
      return responses.some((response) => response.id === submission.id);
    }, {
      timeout: 15_000,
      message: "clear 後は当該 ID が一覧に無い",
    }).toBe(false);
  });
});

function formatPreflightError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return [
    "実 GAS preflight failed:",
    message,
    "確認: E2E_REAL_TRAINING_CODE がシートの研修コードと一致しているか。",
    "確認: E2E_REAL_ADMIN_TOKEN が有効か（変更済みなら GAS で resetDemoAdminToken() または実 token を env に設定）。",
  ].join(" ");
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function buildUrl(apiBaseUrl: string, path: string, params: Record<string, string>): string {
  const url = new URL(apiBaseUrl);
  url.searchParams.set("path", path);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function postJson(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
  };
}

async function fetchSheetJson<T>(
  apiBaseUrl: string,
  path: string,
  params: Record<string, string>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(buildUrl(apiBaseUrl, path, params), init);
  expect(response.ok, `HTTP ${response.status} for ${path}`).toBeTruthy();
  return (await response.json()) as T;
}

function assertSheetSuccess<T extends Record<string, unknown>>(body: T, path: string): T {
  if (isApiErrorBody(body)) {
    throw new Error(`Sheet API error on ${path}: ${body.status ?? "?"} ${body.error ?? "unknown"}`);
  }
  return body;
}

async function verifyRoom(
  apiBaseUrl: string,
  clientId: string,
  accessCode: string,
): Promise<{ roomId: string }> {
  const body = await fetchSheetJson<{ roomId?: string } & Partial<ApiErrorBody>>(
    apiBaseUrl,
    "rooms/verify",
    { client: clientId },
    postJson({ accessCode }),
  );
  return assertSheetSuccess(body, "rooms/verify") as { roomId: string };
}

async function listResponses(
  apiBaseUrl: string,
  clientId: string,
  roomId: string,
  adminToken: string,
): Promise<ParticipantSubmission[]> {
  const body = await fetchSheetJson<ParticipantSubmission[] | ApiErrorBody>(
    apiBaseUrl,
    "responses",
    { client: clientId, room: roomId, token: adminToken },
  );
  if (isApiErrorBody(body)) {
    throw new Error(`Sheet API error on responses: ${body.status ?? "?"} ${body.error ?? "unknown"}`);
  }
  return body;
}

async function postResponse(
  apiBaseUrl: string,
  clientId: string,
  roomId: string,
  submission: ParticipantSubmission,
): Promise<void> {
  const body = await fetchSheetJson<unknown>(
    apiBaseUrl,
    "responses",
    { client: clientId, room: roomId },
    postJson(submission),
  );
  if (isApiErrorBody(body)) {
    throw new Error(`Sheet API error on POST responses: ${body.error ?? "unknown"}`);
  }
}

async function changeTrainingCode(
  apiBaseUrl: string,
  clientId: string,
  adminToken: string,
  roomId: string,
  nextAccessCode: string,
): Promise<void> {
  const body = await fetchSheetJson<{ ok?: boolean } & Partial<ApiErrorBody>>(
    apiBaseUrl,
    "rooms/access-code",
    { client: clientId, token: adminToken },
    postJson({ roomId, nextAccessCode }),
  );
  assertSheetSuccess(body, "rooms/access-code");
}

async function changeAdminToken(
  apiBaseUrl: string,
  clientId: string,
  adminToken: string,
  nextAdminToken: string,
): Promise<void> {
  const body = await fetchSheetJson<{ ok?: boolean } & Partial<ApiErrorBody>>(
    apiBaseUrl,
    "admin/token",
    { client: clientId, token: adminToken },
    postJson({ nextAdminToken }),
  );
  assertSheetSuccess(body, "admin/token");
}

async function clearResponses(
  apiBaseUrl: string,
  clientId: string,
  roomId: string,
  adminToken: string,
): Promise<{ ok: boolean; deletedCount?: number }> {
  const body = await fetchSheetJson<{ ok: boolean; deletedCount?: number } & Partial<ApiErrorBody>>(
    apiBaseUrl,
    "responses/clear",
    { client: clientId, room: roomId, token: adminToken },
    { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: "{}" },
  );
  return assertSheetSuccess(body, "responses/clear") as { ok: boolean; deletedCount?: number };
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  return Boolean(
    body &&
      typeof body === "object" &&
      "ok" in body &&
      (body as { ok?: unknown }).ok === false,
  );
}

function buildSubmission(roomId: string): ParticipantSubmission {
  const id = `real-sheet-e2e-${randomUUID()}`;
  return {
    id,
    createdAt: new Date().toISOString(),
    participantName: `Real Sheet E2E ${id.slice(-8)}`,
    affiliation: "E2E",
    roomId,
    sceneId: "scene-demo-1",
    rounds: [
      {
        awarenessSelection: ["ラベル・表示の違和感"],
        actionSelection: ["班長へ相談する"],
        criteriaOrdered: ["品質"],
        roundNote: "実 GAS / 実シート分離確認",
      },
    ],
    confidenceLevel: 4,
  };
}
