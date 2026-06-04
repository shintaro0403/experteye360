import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  UI_RESPONSE_BUDGET_MS,
  createDebounced,
  loadAppDataBundle,
  prependResponse,
  resolveRefreshMode,
  resolveResponsesRoomId,
  shouldShowBlockingLoader,
} from "./appDataLoad";
import { makeSettings } from "./test/fixtures";
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

  it("2回目以降の refresh は background モードになる", () => {
    expect(resolveRefreshMode(false)).toBe("initial");
    expect(resolveRefreshMode(true)).toBe("background");
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
