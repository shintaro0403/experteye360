import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendResponse,
  changeTrainingCodeAsync,
  formatProvisionRoomError,
  loadResponses,
  loadResponsesAsync,
  loadSettings,
  provisionAdminRoomAsync,
  resetDemoData,
  saveResponses,
  saveResponsesAsync,
  saveSettings,
} from "./storage";
import { DEFAULT_SETTINGS } from "./seed";
import { makeSettings, makeSubmission } from "./test/fixtures";

describe("storage（local）", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    document.cookie
      .split(";")
      .map((part) => part.split("=")[0]?.trim())
      .filter((name) => name?.startsWith("expertEye360Responses"))
      .forEach((name) => {
        document.cookie = `${name}=; path=/; max-age=0`;
      });
  });

  afterEach(() => {
    window.history.pushState({}, "", "/");
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("初回 loadSettings ではデモ設定を返して localStorage に保存する", () => {
    const settings = loadSettings();

    expect(settings.tourUrl).toBe(DEFAULT_SETTINGS.tourUrl);
    expect(settings.scenes).toHaveLength(DEFAULT_SETTINGS.scenes.length);
    expect(localStorage.getItem("expertEye360:settings")).not.toBeNull();
  });

  it("saveSettings 後に loadSettings で同じ設定を読める", () => {
    const settings = makeSettings({ tourUrl: "https://example.com/custom-tour" });

    saveSettings(settings);

    expect(loadSettings().tourUrl).toBe("https://example.com/custom-tour");
  });

  it("saveSettings 時に settings を正規化する", () => {
    const settings = makeSettings({
      scenes: [
        makeSettings().scenes[0]
          ? {
              ...makeSettings().scenes[0],
              questionCards: [],
              awarenessCards: ["1", "2", "3", "4", "5", "6"],
              criteriaCards: ["C"],
              actionCards: ["X"],
            }
          : DEFAULT_SETTINGS.scenes[0],
      ],
    });

    saveSettings(settings);

    const saved = loadSettings();
    expect(saved.scenes[0].questionCards).toHaveLength(5);
    expect(saved.scenes[0].questionCards[0].awarenessCards).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("settings JSON が破損しているとき、デモ設定に戻して落ちない", () => {
    localStorage.setItem("expertEye360:settings", "{broken json");

    const settings = loadSettings();

    expect(settings.tourUrl).toBe(DEFAULT_SETTINGS.tourUrl);
    expect(settings.scenes.length).toBeGreaterThan(0);
  });

  it("scenes が空の settings はデモ設定に戻す", () => {
    localStorage.setItem("expertEye360:settings", JSON.stringify(makeSettings({ scenes: [] })));

    const settings = loadSettings();

    expect(settings.scenes.length).toBeGreaterThan(0);
    expect(settings.scenes[0].id).toBe(DEFAULT_SETTINGS.scenes[0].id);
  });

  it("loadResponses の初回は空配列を返す", () => {
    expect(loadResponses()).toEqual([]);
  });

  it("responses JSON が破損しているとき、空配列を返して落ちない", () => {
    localStorage.setItem("expertEye360:responses", "{broken json");

    expect(loadResponses()).toEqual([]);
  });

  it("ISOLATE-LOCAL-1: loadResponsesAsync は roomId でフィルタする", async () => {
    saveResponses([
      makeSubmission({ id: "a", participantName: "2001太郎", roomId: "room-2001" }),
      makeSubmission({ id: "b", participantName: "0403花子", roomId: "room-0403" }),
    ]);

    const for0403 = await loadResponsesAsync({ roomId: "room-0403", adminToken: "admin-demo" });
    expect(for0403.map((r) => r.participantName)).toEqual(["0403花子"]);

    const for2001 = await loadResponsesAsync({ roomId: "room-2001", adminToken: "admin-demo" });
    expect(for2001.map((r) => r.participantName)).toEqual(["2001太郎"]);
  });

  it("ISOLATE-LOCAL-1: saveResponsesAsync([]) は指定 room だけ削除する", async () => {
    saveResponses([
      makeSubmission({ id: "a", participantName: "2001太郎", roomId: "room-2001" }),
      makeSubmission({ id: "b", participantName: "0403花子", roomId: "room-0403" }),
    ]);

    await saveResponsesAsync([], { roomId: "room-0403", adminToken: "admin-demo" });

    expect(loadResponses().map((r) => r.participantName)).toEqual(["2001太郎"]);
  });

  it("appendResponse 後、loadResponses の先頭が最新になる", () => {
    const oldResponse = makeSubmission({ id: "old-1" });
    const newResponse = makeSubmission({ id: "new-1" });

    saveResponses([oldResponse]);
    appendResponse(newResponse);

    expect(loadResponses().map((r) => r.id)).toEqual(["new-1", "old-1"]);
  });

  it("saveSettings / saveResponses は storage 更新イベントを発火する", () => {
    const listener = vi.fn();
    window.addEventListener("expertEye360-storage", listener);

    saveSettings(makeSettings());
    saveResponses([makeSubmission()]);

    window.removeEventListener("expertEye360-storage", listener);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("resetDemoData は settings を初期化し responses を空にする", () => {
    saveSettings(makeSettings({ tourUrl: "https://example.com/changed" }));
    saveResponses([makeSubmission({ id: "sub-1" })]);

    resetDemoData();

    expect(loadSettings().tourUrl).toBe(DEFAULT_SETTINGS.tourUrl);
    expect(loadResponses()).toEqual([]);
  });

  it("Sheet backend で saveResponsesAsync([]) は responses/clear を呼び、他 room は触らない", async () => {
    vi.stubEnv("VITE_STORAGE_BACKEND", "sheet");
    vi.stubEnv("VITE_SHEET_API_BASE", "https://script.google.com/macros/s/dev/exec");
    vi.stubEnv("VITE_CLIENT_ID", "client-a");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse({ ok: true })));
    const listener = vi.fn();
    window.addEventListener("expertEye360-storage", listener);

    await saveResponsesAsync([], {
      adminToken: " admin-token ",
      roomId: " room-a ",
    });

    window.removeEventListener("expertEye360-storage", listener);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    const parsed = new URL(String(url));
    expect(parsed.searchParams.get("path")).toBe("responses/clear");
    expect(parsed.searchParams.get("client")).toBe("client-a");
    expect(parsed.searchParams.get("room")).toBe("room-a");
    expect(parsed.searchParams.get("token")).toBeNull();
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ token: "admin-token" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("Sheet backend で saveResponsesAsync は空配列以外を拒否する", async () => {
    vi.stubEnv("VITE_STORAGE_BACKEND", "sheet");
    vi.stubEnv("VITE_SHEET_API_BASE", "https://script.google.com/macros/s/dev/exec");
    vi.stubEnv("VITE_CLIENT_ID", "client-a");

    await expect(
      saveResponsesAsync([makeSubmission()], {
        adminToken: "admin-token",
        roomId: "room-a",
      }),
    ).rejects.toThrow("Replacing all responses is not supported for sheet backend");
  });

  it("Sheet backend は URL の ?client= を環境値より優先して API に付与する", async () => {
    vi.stubEnv("VITE_STORAGE_BACKEND", "sheet");
    vi.stubEnv("VITE_SHEET_API_BASE", "https://script.google.com/macros/s/dev/exec");
    vi.stubEnv("VITE_CLIENT_ID", "client-a");
    window.history.pushState({}, "", "/?client=client-b");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse({ ok: true })));

    await saveResponsesAsync([], {
      adminToken: "admin-token",
      roomId: "room-a",
    });

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(new URL(String(url)).searchParams.get("client")).toBe("client-b");
  });

  it("formatProvisionRoomError: Unknown route は再デプロイ案内を含む", () => {
    const message = formatProvisionRoomError(
      new Error("Sheet API request failed: Unknown route: POST rooms/provision"),
    );
    expect(message).toContain("rooms/provision");
    expect(message).toContain("新バージョン");
  });

  it("Sheet backend の provisionAdminRoomAsync は rooms/provision を呼ぶ", async () => {
    vi.stubEnv("VITE_STORAGE_BACKEND", "sheet");
    vi.stubEnv("VITE_SHEET_API_BASE", "https://script.google.com/macros/s/dev/exec");
    vi.stubEnv("VITE_CLIENT_ID", "client-a");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(jsonResponse({ roomId: "room-1234", created: true })),
    );

    const result = await provisionAdminRoomAsync({
      trainingCode: "1234",
      adminToken: "admin-demo",
      settings: makeSettings({ rooms: [] }),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.room.roomId).toBe("room-1234");
    expect(result.created).toBe(true);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(new URL(String(url)).searchParams.get("path")).toBe("rooms/provision");
    expect(JSON.parse(String(init?.body))).toEqual({
      token: "admin-demo",
      accessCode: "1234",
      displayName: "1234",
    });
  });

  it("Sheet backend の provisionAdminRoomAsync は Unknown route を案内付きで返す", async () => {
    vi.stubEnv("VITE_STORAGE_BACKEND", "sheet");
    vi.stubEnv("VITE_SHEET_API_BASE", "https://script.google.com/macros/s/dev/exec");
    vi.stubEnv("VITE_CLIENT_ID", "client-a");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        jsonResponse({ ok: false, status: 404, error: "Unknown route: POST rooms/provision" }),
      ),
    );

    const result = await provisionAdminRoomAsync({
      trainingCode: "1234",
      adminToken: "admin-demo",
      settings: makeSettings({ rooms: [] }),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("rooms/provision");
    expect(result.message).toContain("新バージョン");
  });

  it("Sheet backend の研修コード変更は API に委譲し、保存イベントを発火する", async () => {
    vi.stubEnv("VITE_STORAGE_BACKEND", "sheet");
    vi.stubEnv("VITE_SHEET_API_BASE", "https://script.google.com/macros/s/dev/exec");
    vi.stubEnv("VITE_CLIENT_ID", "client-a");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse({ ok: true })));
    const listener = vi.fn();
    window.addEventListener("expertEye360-storage", listener);

    await changeTrainingCodeAsync({
      adminToken: " admin-token ",
      roomId: " room-a ",
      nextAccessCode: " DEMO-2027 ",
    });

    window.removeEventListener("expertEye360-storage", listener);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    const parsed = new URL(String(url));
    expect(parsed.searchParams.get("path")).toBe("rooms/access-code");
    expect(parsed.searchParams.get("client")).toBe("client-a");
    expect(parsed.searchParams.get("token")).toBeNull();
    expect(JSON.parse(String(init?.body))).toEqual({
      token: "admin-token",
      roomId: "room-a",
      nextAccessCode: "DEMO-2027",
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
