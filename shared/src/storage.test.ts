import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendResponse,
  loadResponses,
  loadSettings,
  resetDemoData,
  saveResponses,
  saveSettings,
} from "./storage";
import { DEFAULT_SETTINGS } from "./seed";
import { makeSettings, makeSubmission } from "./test/fixtures";

describe("storage（local）", () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie
      .split(";")
      .map((part) => part.split("=")[0]?.trim())
      .filter((name) => name?.startsWith("expertEye360Responses"))
      .forEach((name) => {
        document.cookie = `${name}=; path=/; max-age=0`;
      });
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
});
