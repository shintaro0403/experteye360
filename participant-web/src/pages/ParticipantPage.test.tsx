import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getVerifiedRoomId,
  SESSION_VERIFIED_ROOM_KEY,
  TRAINING_CODE_MISMATCH_MESSAGE,
  setVerifiedRoomId,
} from "@shared/roomEntry";
import { DEFAULT_SETTINGS } from "@shared/seed";
import { verifyTrainingCodeAsync } from "@shared/storage";
import { useAppData } from "../hooks/useAppData";
import { ParticipantPage } from "./ParticipantPage";

vi.mock("../hooks/useAppData", () => ({
  useAppData: vi.fn(),
}));

vi.mock("@shared/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/storage")>();
  return {
    ...actual,
    isSheetStorageBackend: vi.fn(() => false),
    verifyTrainingCodeAsync: vi.fn(),
  };
});

describe("ParticipantPage", () => {
  let container: HTMLDivElement;
  let root: Root | null;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    sessionStorage.clear();
    setVerifiedRoomId(null);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = null;
    vi.mocked(useAppData).mockReturnValue({
      settings: DEFAULT_SETTINGS,
      setSettings: vi.fn(),
      applySettings: vi.fn(),
      responses: [],
      addResponse: vi.fn(),
      replaceResponses: vi.fn(),
      refresh: vi.fn(),
      loading: false,
      refreshing: false,
      error: null,
    });
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    container.remove();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("研修コードが不正なとき名前欄を出さない", async () => {
    vi.mocked(verifyTrainingCodeAsync).mockResolvedValue({
      ok: false,
      message: TRAINING_CODE_MISMATCH_MESSAGE,
    });
    await render();
    expect(container.querySelector('input[placeholder="例：山田 太郎"]')).toBeNull();
    await act(async () => {
      getButton("next").click();
    });
    expect(container.textContent).toContain(TRAINING_CODE_MISMATCH_MESSAGE);
  });

  it("名前入力画面で back を押すと研修コード入力に戻り検証状態を消す", async () => {
    vi.mocked(verifyTrainingCodeAsync).mockResolvedValue({ ok: true, roomId: "room-demo-1" });
    await render();
    await act(async () => {
      setInputValue(getTrainingCodeInput(), "DEMO-2026");
    });
    await act(async () => {
      getButton("next").click();
    });
    expect(container.querySelector('input[placeholder="例：山田 太郎"]')).not.toBeNull();
    expect(sessionStorage.getItem(SESSION_VERIFIED_ROOM_KEY)).toBe("room-demo-1");

    await act(async () => {
      getButton("back").click();
    });

    expect(getTrainingCodeInput()).not.toBeNull();
    expect(container.querySelector('input[placeholder="例：山田 太郎"]')).toBeNull();
    expect(getVerifiedRoomId()).toBeNull();
  });

  it("正しい研修コードのあと名前欄が表示される", async () => {
    vi.mocked(verifyTrainingCodeAsync).mockResolvedValue({ ok: true, roomId: "room-demo-1" });
    await render();
    await act(async () => {
      setInputValue(getTrainingCodeInput(), "DEMO-2026");
    });
    await act(async () => {
      getButton("next").click();
    });
    expect(container.querySelector('input[placeholder="例：山田 太郎"]')).not.toBeNull();
  });

  async function render() {
    root = createRoot(container);
    await act(async () => {
      root?.render(<ParticipantPage />);
    });
  }

  function getTrainingCodeInput(): HTMLInputElement {
    const input = container.querySelector<HTMLInputElement>('input[placeholder="例：DEMO-2026"]');
    if (!input) throw new Error("training code input not found");
    return input;
  }

  function getButton(name: string): HTMLButtonElement {
    const button = Array.from(container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.trim() === name,
    );
    if (!(button instanceof HTMLButtonElement)) throw new Error(`button not found: ${name}`);
    return button;
  }

  function setInputValue(input: HTMLInputElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
});
