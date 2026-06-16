import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  UI_RESPONSE_BUDGET_MS,
  createDebounced,
  loadAppDataBundle,
  PARTICIPANT_SETTINGS_POLL_MS,
  prependResponse,
  resolveRefreshMode,
  resolveResponsesRoomId,
  shouldEnableParticipantSettingsSync,
  shouldShowBlockingLoader,
} from "./appDataLoad";
import { makeSettings, makeSubmission } from "./test/fixtures";

describe("appDataLoad（UI 応答性）", () => {
  it("初回読込だけブロッキング loader を出す", () => {
    expect(shouldShowBlockingLoader("initial")).toBe(true);
    expect(shouldShowBlockingLoader("background")).toBe(false);
  });

  it("回答一覧の roomId は Sheet 上の settings.rooms を使う（localStorage の seed と混同しない）", () => {
    const sheetSettings = makeSettings({
      rooms: [
        {
          roomId: "demo-room-001",
          displayName: "GAS デモ",
          accessCode: "",
          enabled: true,
        },
      ],
    });
    expect(resolveResponsesRoomId(sheetSettings)).toBe("demo-room-001");
  });

  it("ISOLATE-2: adminRoomId があれば primaryTrainingRoom より優先する", () => {
    const settings = makeSettings({
      rooms: [
        {
          roomId: "room-0403",
          displayName: "4月3日",
          accessCode: "0403",
          adminAccessCode: "2001",
          enabled: true,
        },
        {
          roomId: "room-0505",
          displayName: "5月5日",
          accessCode: "0505",
          adminAccessCode: "3001",
          enabled: true,
        },
      ],
    });
    expect(resolveResponsesRoomId(settings, "room-0505")).toBe("room-0505");
    expect(resolveResponsesRoomId(settings)).toBe("room-0403");
  });

  it("2回目以降の refresh は background モードになる", () => {
    expect(resolveRefreshMode(false)).toBe("initial");
    expect(resolveRefreshMode(true)).toBe("background");
  });

  it("SETTINGS-SYNC-1: adminToken 無しのときだけ受講者 settings 同期を有効にする", () => {
    expect(shouldEnableParticipantSettingsSync(null)).toBe(true);
    expect(shouldEnableParticipantSettingsSync(undefined)).toBe(true);
    expect(shouldEnableParticipantSettingsSync("")).toBe(true);
    expect(shouldEnableParticipantSettingsSync("  ")).toBe(true);
    expect(shouldEnableParticipantSettingsSync("admin-demo-2026")).toBe(false);
  });

  it("SETTINGS-SYNC-1: 受講者 settings ポーリング間隔は 5 秒", () => {
    expect(PARTICIPANT_SETTINGS_POLL_MS).toBe(5000);
  });

  it("settings と responses を並列取得する（直列より短い）", async () => {
    const delayMs = 400;
    let settingsStarted = 0;
    let responsesStarted = 0;

    const loadSettings = vi.fn(async () => {
      settingsStarted = Date.now();
      await new Promise((r) => setTimeout(r, delayMs));
      return makeSettings();
    });
    const loadResponses = vi.fn(async () => {
      responsesStarted = Date.now();
      await new Promise((r) => setTimeout(r, delayMs));
      return [makeSubmission()];
    });

    const startedAt = Date.now();
    const result = await loadAppDataBundle({
      loadSettings,
      loadResponses,
      scope: "all",
    });
    const elapsed = Date.now() - startedAt;

    expect(result.settings.tourUrl).toBe(makeSettings().tourUrl);
    expect(result.responses).toHaveLength(1);
    expect(Math.abs(settingsStarted - responsesStarted)).toBeLessThan(50);
    expect(elapsed).toBeLessThan(delayMs * 2);
    expect(elapsed).toBeLessThan(UI_RESPONSE_BUDGET_MS);
  });

  it("scope=settings のとき responses を読まない", async () => {
    const loadSettings = vi.fn(async () => makeSettings());
    const loadResponses = vi.fn(async () => [makeSubmission()]);

    const result = await loadAppDataBundle({
      loadSettings,
      loadResponses,
      scope: "settings",
    });

    expect(result.settings).toBeDefined();
    expect(result.responses).toBeUndefined();
    expect(loadResponses).not.toHaveBeenCalled();
  });

  it("append 後は先頭に 1 件だけ足す", () => {
    const existing = makeSubmission({ id: "old-1" });
    const next = makeSubmission({ id: "new-1" });
    const appended = prependResponse([existing], next);
    expect(appended.map((r) => r.id)).toEqual(["new-1", "old-1"]);
    expect(prependResponse(appended, next).map((r) => r.id)).toEqual(["new-1", "old-1"]);
  });
});

describe("createDebounced", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("連続呼び出しは debounce 後に 1 回だけ実行する", () => {
    const fn = vi.fn();
    const debounced = createDebounced(fn, 150);
    debounced();
    debounced();
    debounced();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(150);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
