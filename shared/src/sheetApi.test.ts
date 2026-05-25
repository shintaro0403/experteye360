import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendSheetResponse,
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
    expect(String(url)).toContain("settings");
    expectUrlHasParams(String(url), { client: TEST_CLIENT });
    expect(init?.method ?? "GET").toBe("GET");
  });

  it("POST settings は client と token クエリを付け、AppSettings を送る", async () => {
    const settings = makeSettings({ tourUrl: "https://example.com/admin-save" });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ok: true }));

    await saveSheetSettings({
      apiBaseUrl: API_BASE_URL,
      clientId: TEST_CLIENT,
      adminToken: TEST_ADMIN_TOKEN,
      settings,
    });

    const [url, init] = lastFetchCall();
    expect(String(url)).toContain("settings");
    expectUrlHasParams(String(url), { client: TEST_CLIENT, token: TEST_ADMIN_TOKEN });
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      tourUrl: "https://example.com/admin-save",
    });
  });

  it("GET responses は client・room・token クエリを付け、回答配列として読める", async () => {
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
    expect(String(url)).toContain("responses");
    expectUrlHasParams(String(url), {
      client: TEST_CLIENT,
      room: TEST_ROOM,
      token: TEST_ADMIN_TOKEN,
    });
    expect(init?.method ?? "GET").toBe("GET");
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
    expect(String(url)).toContain("responses");
    expectUrlHasParams(String(url), { client: TEST_CLIENT, room: TEST_ROOM });
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      id: "sub-1",
      roomId: TEST_ROOM,
      participantName: submission.participantName,
    });
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
    expect(String(url)).toContain("rooms/verify");
    expectUrlHasParams(String(url), { client: TEST_CLIENT });
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ accessCode: "DEMO-2026" });
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
  return call;
}

function expectUrlHasParams(url: string, params: Record<string, string>): void {
  const parsed = new URL(url, API_BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    expect(parsed.searchParams.get(key)).toBe(value);
  }
}
