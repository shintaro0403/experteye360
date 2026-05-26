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

test.describe("Real Sheet API: client / room separation", () => {
  test.skip(!enabled, "Set E2E_REAL_SHEET=1 to run against the real GAS / Sheet backend.");

  test("実 GAS は別 client / 別 room に E2E 回答を返さない", async () => {
    const apiBaseUrl = requiredEnv("E2E_REAL_SHEET_API_BASE");
    const clientId = requiredEnv("E2E_REAL_CLIENT_ID");
    const adminToken = requiredEnv("E2E_REAL_ADMIN_TOKEN");
    const trainingCode = requiredEnv("E2E_REAL_TRAINING_CODE");
    const otherClientId = process.env.E2E_REAL_OTHER_CLIENT_ID?.trim() || `${clientId}-other-e2e`;

    const verified = await requestJson<{ roomId: string }>(
      buildUrl(apiBaseUrl, "rooms/verify", { client: clientId }),
      postJson({ accessCode: trainingCode }),
    );
    expect(verified.roomId).toBeTruthy();

    const submission = buildSubmission(verified.roomId);
    await requestJson<unknown>(
      buildUrl(apiBaseUrl, "responses", { client: clientId, room: verified.roomId }),
      postJson(submission),
    );

    await expect.poll(async () => {
      const responses = await requestJson<ParticipantSubmission[]>(
        buildUrl(apiBaseUrl, "responses", {
          client: clientId,
          room: verified.roomId,
          token: adminToken,
        }),
      );
      return responses.some((response) => response.id === submission.id);
    }, {
      timeout: 15_000,
      message: "実シートに保存した E2E 回答が同一 client + room で取得できる",
    }).toBe(true);

    const otherClientBody = await requestJson<unknown>(
      buildUrl(apiBaseUrl, "responses", {
        client: otherClientId,
        room: verified.roomId,
        token: adminToken,
      }),
    );
    expect(JSON.stringify(otherClientBody)).not.toContain(submission.id);
    expect(isApiErrorBody(otherClientBody)).toBe(true);

    const otherRoomBody = await requestJson<unknown>(
      buildUrl(apiBaseUrl, "responses", {
        client: clientId,
        room: `${verified.roomId}-other-e2e`,
        token: adminToken,
      }),
    );
    expect(JSON.stringify(otherRoomBody)).not.toContain(submission.id);
    expect(isApiErrorBody(otherRoomBody)).toBe(true);
  });
});

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

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  expect(response.ok).toBeTruthy();
  return (await response.json()) as T;
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
