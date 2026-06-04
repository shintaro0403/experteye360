import { act } from "react";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeSettings, makeSubmission } from "@shared/test/fixtures";
import { useAppData, type UseAppDataOptions } from "./useAppData";

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

const { loadSettingsAsync, loadResponsesAsync, loadSettings } = vi.hoisted(() => ({
  loadSettingsAsync: vi.fn(async () => sheetSettings),
  loadResponsesAsync: vi.fn(async () => [makeSubmission({ id: "r-1", roomId: "demo-room-001" })]),
  loadSettings: vi.fn(() => sheetSettings),
}));

vi.mock("@shared/storage", () => ({
  loadSettings,
  loadSettingsAsync,
  loadResponsesAsync,
  saveSettingsAsync: vi.fn(),
  saveResponsesAsync: vi.fn(),
  appendResponseAsync: vi.fn(),
}));

function Probe(options: UseAppDataOptions) {
  const { loading, refreshing, responses, refresh } = useAppData(options);
  return createElement(
    "div",
    null,
    createElement("span", { "data-testid": "loading" }, loading ? "1" : "0"),
    createElement("span", { "data-testid": "refreshing" }, refreshing ? "1" : "0"),
    createElement("span", { "data-testid": "count" }, String(responses.length)),
    createElement("button", { type: "button", onClick: () => void refresh() }, "reload"),
  );
}

describe("useAppData", () => {
  let container: HTMLDivElement;
  let root: Root | null;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = null;
    loadSettingsAsync.mockClear();
    loadResponsesAsync.mockClear();
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    container.remove();
  });

  it("回答取得は Sheet の settings.rooms の roomId を使う", async () => {
    await renderProbe({ adminToken: "admin-demo-2026" });
    await act(async () => {
      await Promise.resolve();
    });
    expect(loadResponsesAsync).toHaveBeenCalledWith({
      roomId: "demo-room-001",
      adminToken: "admin-demo-2026",
    });
    expect(text("count")).toBe("1");
  });

  it("初回読込後の手動 refresh で settings を再取得する（blocking loader は appDataLoad で検証）", async () => {
    await renderProbe({ adminToken: "admin-demo-2026" });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(text("loading")).toBe("0");
    expect(loadSettingsAsync).toHaveBeenCalledTimes(1);

    await act(async () => {
      getButton("reload").click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(loadSettingsAsync).toHaveBeenCalledTimes(2);
    expect(text("loading")).toBe("0");
  });

  async function renderProbe(options: UseAppDataOptions) {
    root = createRoot(container);
    await act(async () => {
      root?.render(createElement(Probe, options));
    });
  }

  function text(testId: string): string {
    return container.querySelector(`[data-testid="${testId}"]`)?.textContent ?? "";
  }

  function getButton(name: string): HTMLButtonElement {
    const button = Array.from(container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.trim() === name,
    );
    if (!(button instanceof HTMLButtonElement)) throw new Error(`button not found: ${name}`);
    return button;
  }
});
