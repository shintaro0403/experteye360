import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendSheetResponse,
  changeAdminTokenViaApi,
  changeTrainingCodeViaApi,
  clearSheetResponses,
  loadSheetResponses,
  loadSheetSettings,
  saveSheetSettings,
  verifyTrainingCodeViaApi,
} from "./storage/sheet";
import { makeSettings, makeSubmission } from "./test/fixtures";
import type { AppSettings, ParticipantSubmission } from "./types";

const API_BASE_URL = "https://script.google.com/macros/s/test/exec";
const TEST_CLIENT = "client-demo";
const TEST_ROOM = "room-demo-1";
const TEST_ADMIN_TOKEN = "admin-demo";

describe("sheetApi 契約", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GET settings は client クエリを付け、AppSettings として読める", async () => {
    const body: AppSettings = makeSettings({ tourUrl: "https://example.com/from-sheet" });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(body));

    const result = await loadSheetSettings({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
    });

    expect(result.tourUrl).toBe("https://example.com/from-sheet");
    const [url, init] = lastFetchCall();
    expectUrlHasParams(String(url), { path: "settings", client: TEST_CLIENT });
    expect(init?.method ?? "GET").toBe("GET");
  });

  it("POST settings は client クエリのみ付け、token と settings をボディで送る", async () => {
    const settings = makeSettings({ tourUrl: "https://example.com/admin-save" });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ok: true }));

    await saveSheetSettings({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      adminToken: TEST_ADMIN_TOKEN,
      settings,
    });

    const [url, init] = lastFetchCall();
    expectUrlHasParams(String(url), { path: "settings", client: TEST_CLIENT });
    expectUrlMissingParams(String(url), ["token"]);
    expect(init?.method).toBe("POST");
    const sent = JSON.parse(String(init?.body));
    expect(sent.token).toBe(TEST_ADMIN_TOKEN);
    expect(sent.settings).toMatchObject({ tourUrl: "https://example.com/admin-save" });
  });

  it("responses 取得は POST responses/query で client・room クエリ + token をボディで送る", async () => {
    const responses: ParticipantSubmission[] = [
      makeSubmission({ id: "sub-new", roomId: TEST_ROOM }),
    ];
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(responses));

    const result = await loadSheetResponses({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      roomId: TEST_ROOM,
      adminToken: TEST_ADMIN_TOKEN,
    });

    expect(result.map((r) => r.id)).toEqual(["sub-new"]);
    const [url, init] = lastFetchCall();
    expectUrlHasParams(String(url), {
      path: "responses/query",
      client: TEST_CLIENT,
      room: TEST_ROOM,
    });
    expectUrlMissingParams(String(url), ["token"]);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ token: TEST_ADMIN_TOKEN });
  });

  it("POST responses/clear は client・room クエリ + token をボディで送り、当該 room を削除する", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ok: true }));

    await clearSheetResponses({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      roomId: TEST_ROOM,
      adminToken: TEST_ADMIN_TOKEN,
    });

    const [url, init] = lastFetchCall();
    expectUrlHasParams(String(url), {
      path: "responses/clear",
      client: TEST_CLIENT,
      room: TEST_ROOM,
    });
    expectUrlMissingParams(String(url), ["token"]);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ token: TEST_ADMIN_TOKEN });
  });

  it("POST responses は client・room クエリと ParticipantSubmission ボディを送る", async () => {
    const submission = makeSubmission({ id: "sub-1", roomId: TEST_ROOM });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ok: true }));

    await appendSheetResponse({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      roomId: TEST_ROOM,
      submission,
    });

    const [url, init] = lastFetchCall();
    expectUrlHasParams(String(url), { path: "responses", client: TEST_CLIENT, room: TEST_ROOM });
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      id: "sub-1",
      roomId: TEST_ROOM,
      participantName: submission.participantName,
    });
  });

  it("POST 系 API は GAS の preflight を避けるため text/plain で JSON 文字列を送る", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ok: true }));

    await appendSheetResponse({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      roomId: TEST_ROOM,
      submission: makeSubmission({ roomId: TEST_ROOM }),
    });

    const [, init] = lastFetchCall();
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBe("text/plain;charset=utf-8");
    expect(() => JSON.parse(String(init?.body))).not.toThrow();
  });

  it("POST rooms/provision は token と accessCode を送り、新規 roomId を返す", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ roomId: "room-new-code", created: true }));

    const { provisionRoomViaApi } = await import("./storage/sheet");
    const result = await provisionRoomViaApi({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      adminToken: "admin-demo",
      accessCode: "NEW-CODE",
      displayName: "NEW-CODE",
    });

    expect(result).toEqual({ roomId: "room-new-code", created: true });
    const [url, init] = lastFetchCall();
    expectUrlHasParams(String(url), { path: "rooms/provision", client: TEST_CLIENT });
    expect(JSON.parse(String(init?.body))).toEqual({
      token: "admin-demo",
      accessCode: "NEW-CODE",
      displayName: "NEW-CODE",
    });
    expect(String(url)).not.toContain("token=");
  });

  it("POST rooms/verify は accessCode を送り、成功時に roomId を返す", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ roomId: TEST_ROOM }));

    const result = await verifyTrainingCodeViaApi({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      accessCode: "DEMO-2026",
    });

    expect(result).toEqual({ roomId: TEST_ROOM });
    const [url, init] = lastFetchCall();
    expectUrlHasParams(String(url), { path: "rooms/verify", client: TEST_CLIENT });
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ accessCode: "DEMO-2026" });
  });

  it("client 不正で API が 400 を返すと、呼び出し側でエラーになる", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "bad client" }, 400));

    await expect(loadSheetSettings({
      apiBaseUrl: API_BASE_URL,
      clientId: "unknown-client",
    })).rejects.toThrow("Sheet API request failed: 400");
  });

  it("API 500 とネットワーク失敗は、呼び出し側でエラーになる", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "server error" }, 500));

    await expect(loadSheetSettings({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
    })).rejects.toThrow("Sheet API request failed: 500");

    vi.mocked(fetch).mockRejectedValueOnce(new Error("network down"));

    await expect(loadSheetSettings({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
    })).rejects.toThrow("network down");
  });

  it("GAS が 200 で JSON エラーを返したときも、呼び出し側でエラーになる", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({
      ok: false,
      status: 401,
      error: "Invalid admin token",
    }));

    await expect(loadSheetSettings({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
    })).rejects.toThrow("Sheet API request failed: Invalid admin token");
  });

  it("すべての API 呼び出しに client クエリを付ける", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(makeSettings()))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(jsonResponse({ roomId: TEST_ROOM }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    await loadSheetSettings({ apiBaseUrl: API_BASE_URL, clientId: TEST_CLIENT });
    await saveSheetSettings({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      adminToken: TEST_ADMIN_TOKEN,
      settings: makeSettings(),
    });
    await loadSheetResponses({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      roomId: TEST_ROOM,
      adminToken: TEST_ADMIN_TOKEN,
    });
    await appendSheetResponse({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      roomId: TEST_ROOM,
      submission: makeSubmission({ roomId: TEST_ROOM }),
    });
    await verifyTrainingCodeViaApi({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      accessCode: "DEMO-2026",
    });
    await changeAdminTokenViaApi({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      adminToken: TEST_ADMIN_TOKEN,
      nextAdminToken: "admin-next",
    });

    for (const [url] of vi.mocked(fetch).mock.calls) {
      expectUrlHasParams(String(url), { client: TEST_CLIENT });
    }
  });

  it("SEC-SECRET-01: 管理者 token はどの API 呼び出しでも URL クエリに出さない", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(makeSettings()))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(jsonResponse({ roomId: TEST_ROOM }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    await loadSheetSettings({ apiBaseUrl: API_BASE_URL, clientId: TEST_CLIENT });
    await saveSheetSettings({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      adminToken: TEST_ADMIN_TOKEN,
      settings: makeSettings(),
    });
    await loadSheetResponses({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      roomId: TEST_ROOM,
      adminToken: TEST_ADMIN_TOKEN,
    });
    await clearSheetResponses({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      roomId: TEST_ROOM,
      adminToken: TEST_ADMIN_TOKEN,
    });
    await changeAdminTokenViaApi({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      adminToken: TEST_ADMIN_TOKEN,
      nextAdminToken: "admin-next",
    });
    await changeTrainingCodeViaApi({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      adminToken: TEST_ADMIN_TOKEN,
      roomId: TEST_ROOM,
      nextAccessCode: "DEMO-2027",
    });

    for (const [url] of vi.mocked(fetch).mock.calls) {
      const parsed = new URL(String(url), API_BASE_URL);
      expect(parsed.searchParams.get("token")).toBeNull();
      expect(String(url)).not.toContain(TEST_ADMIN_TOKEN);
    }
  });

  it("SEC-NET-01: http の API ベース URL は HTTPS 必須エラーになる", async () => {
    await expect(loadSheetSettings({
      apiBaseUrl: "http://evil.example/exec",
      clientId: TEST_CLIENT,
    })).rejects.toThrow(/HTTPS/i);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("SEC-NET-01: localhost / 127.0.0.1 の http は開発用に許可する", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(makeSettings()))
      .mockResolvedValueOnce(jsonResponse(makeSettings()));

    await expect(loadSheetSettings({
      apiBaseUrl: "http://127.0.0.1:5198/exec",
      clientId: TEST_CLIENT,
    })).resolves.toBeDefined();
    await expect(loadSheetSettings({
      apiBaseUrl: "http://localhost:5198/exec",
      clientId: TEST_CLIENT,
    })).resolves.toBeDefined();
  });

  it("responses 取得は room ごとに分け、別 room の回答を混ぜない", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = new URL(String(input));
      const room = url.searchParams.get("room");
      if (room === "room-a") {
        return jsonResponse([makeSubmission({ id: "sub-room-a", roomId: "room-a" })]);
      }
      if (room === "room-b") {
        return jsonResponse([makeSubmission({ id: "sub-room-b", roomId: "room-b" })]);
      }
      return jsonResponse({ error: "bad room" }, 400);
    });

    const roomA = await loadSheetResponses({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      roomId: "room-a",
      adminToken: TEST_ADMIN_TOKEN,
    });
    const roomB = await loadSheetResponses({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      roomId: "room-b",
      adminToken: TEST_ADMIN_TOKEN,
    });

    expect(roomA.map((response) => response.id)).toEqual(["sub-room-a"]);
    expect(roomB.map((response) => response.id)).toEqual(["sub-room-b"]);
  });

  it("不正 room の responses 取得はエラーになる", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "forbidden room" }, 403));

    await expect(loadSheetResponses({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      roomId: "unknown-room",
      adminToken: TEST_ADMIN_TOKEN,
    })).rejects.toThrow("Sheet API request failed: 403");
  });

  it("未登録の研修コードは rooms/verify でエラーになる", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "unknown access code" }, 403));

    await expect(verifyTrainingCodeViaApi({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      accessCode: "WRONG-CODE",
    })).rejects.toThrow("Sheet API request failed: 403");
  });

  it("POST settings は監査ログ対象の管理者操作として token をボディに必ず付ける", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ok: true, auditLogId: "audit-1" }));

    await saveSheetSettings({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      adminToken: TEST_ADMIN_TOKEN,
      settings: makeSettings(),
    });

    const [url, init] = lastFetchCall();
    expectUrlHasParams(String(url), { client: TEST_CLIENT });
    expectUrlMissingParams(String(url), ["token"]);
    expect(JSON.parse(String(init?.body)).token).toBe(TEST_ADMIN_TOKEN);
  });

  it("不正な管理者 token では管理者 API が 401 エラーになる", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "bad token" }, 401));

    await expect(loadSheetResponses({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      roomId: TEST_ROOM,
      adminToken: "wrong-admin-token",
    })).rejects.toThrow("Sheet API request failed: 401");
  });

  it("管理者コード変更は現行 token と新しい token をボディで送る", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ok: true }));

    await changeAdminTokenViaApi({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      adminToken: TEST_ADMIN_TOKEN,
      nextAdminToken: "admin-next",
    });

    const [url, init] = lastFetchCall();
    expectUrlHasParams(String(url), { path: "admin/token", client: TEST_CLIENT });
    expectUrlMissingParams(String(url), ["token"]);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      token: TEST_ADMIN_TOKEN,
      nextAdminToken: "admin-next",
    });
  });

  it("研修コード変更は roomId と新しい研修コード、現行 token をボディで送る", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ok: true }));

    await changeTrainingCodeViaApi({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      adminToken: TEST_ADMIN_TOKEN,
      roomId: TEST_ROOM,
      nextAccessCode: "DEMO-2027",
    });

    const [url, init] = lastFetchCall();
    expectUrlHasParams(String(url), { path: "rooms/access-code", client: TEST_CLIENT });
    expectUrlMissingParams(String(url), ["token"]);
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBe("text/plain;charset=utf-8");
    expect(JSON.parse(String(init?.body))).toEqual({
      token: TEST_ADMIN_TOKEN,
      roomId: TEST_ROOM,
      nextAccessCode: "DEMO-2027",
    });
  });

  it("研修コード変更は現行 token 不一致なら 401 エラーになる", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "bad token" }, 401));

    await expect(changeTrainingCodeViaApi({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      adminToken: "wrong-admin-token",
      roomId: TEST_ROOM,
      nextAccessCode: "DEMO-2027",
    })).rejects.toThrow("Sheet API request failed: 401");
  });

  it("管理者コード変更は現行 token 不一致なら 401 エラーになる", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "bad token" }, 401));

    await expect(changeAdminTokenViaApi({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      adminToken: "wrong-admin-token",
      nextAdminToken: "admin-next",
    })).rejects.toThrow("Sheet API request failed: 401");
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function lastFetchCall(): [RequestInfo | URL, RequestInit | undefined] {
  const calls = vi.mocked(fetch).mock.calls;
  const call = calls[calls.length - 1];
  if (!call) throw new Error("fetch was not called");
  return [call[0], call[1]];
}

function expectUrlHasParams(url: string, params: Record<string, string>): void {
  const parsed = new URL(url, API_BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    expect(parsed.searchParams.get(key)).toBe(value);
  }
}

function expectUrlMissingParams(url: string, keys: string[]): void {
  const parsed = new URL(url, API_BASE_URL);
  for (const key of keys) {
    expect(parsed.searchParams.get(key)).toBeNull();
  }
}
