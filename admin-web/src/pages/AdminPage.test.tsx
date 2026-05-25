import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_ADMIN_AUTH_KEY, SESSION_ADMIN_TOKEN_KEY } from "@shared/adminEntry";
import { primaryTrainingRoom } from "@shared/appSettings";
import { DEFAULT_SETTINGS } from "@shared/seed";
import { changeTrainingCodeAsync } from "@shared/storage";
import { useAppData } from "../hooks/useAppData";
import { AdminPage } from "./AdminPage";

vi.mock("@shared/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/storage")>();
  return {
    ...actual,
    isSheetStorageBackend: vi.fn(() => true),
    verifyAdminTokenAsync: vi.fn(),
    changeAdminTokenAsync: vi.fn(),
    changeTrainingCodeAsync: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("../hooks/useAppData", () => ({
  useAppData: vi.fn(),
}));

describe("AdminPage", () => {
  let container: HTMLDivElement;
  let root: Root | null;
  let refresh: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    sessionStorage.clear();
    sessionStorage.setItem(SESSION_ADMIN_AUTH_KEY, "1");
    sessionStorage.setItem(SESSION_ADMIN_TOKEN_KEY, "admin-demo-2026");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = null;
    refresh = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "alert").mockImplementation(() => undefined);
    vi.mocked(changeTrainingCodeAsync).mockResolvedValue(undefined);
    vi.mocked(useAppData).mockReturnValue({
      settings: DEFAULT_SETTINGS,
      setSettings: vi.fn().mockResolvedValue(undefined),
      responses: [],
      addResponse: vi.fn().mockResolvedValue(undefined),
      replaceResponses: vi.fn().mockResolvedValue(undefined),
      refresh,
      loading: false,
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

  it("Sheet backend では研修コード保存時に changeTrainingCodeAsync を呼び、成功後に再読込する", async () => {
    await render();
    const input = getTrainingCodeInput();
    const saveButton = getButton("研修コードを保存");

    await act(async () => {
      setInputValue(input, " DEMO-2027 ");
    });
    await act(async () => {
      saveButton.click();
    });

    expect(changeTrainingCodeAsync).toHaveBeenCalledWith({
      adminToken: "admin-demo-2026",
      roomId: primaryTrainingRoom(DEFAULT_SETTINGS).roomId,
      nextAccessCode: "DEMO-2027",
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(window.alert).toHaveBeenCalledWith("研修コードを保存しました。受講者に新しいコードを案内してください。");
  });

  it("Sheet backend の研修コード保存に失敗したら成功扱いにせず失敗を伝える", async () => {
    vi.mocked(changeTrainingCodeAsync).mockRejectedValueOnce(new Error("bad token"));
    await render();
    const input = getTrainingCodeInput();
    const saveButton = getButton("研修コードを保存");

    await act(async () => {
      setInputValue(input, "DEMO-2027");
    });
    await act(async () => {
      saveButton.click();
    });

    expect(refresh).not.toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith("研修コードの保存に失敗しました。管理者コードを確認して再度お試しください。");
  });

  async function render() {
    root = createRoot(container);
    await act(async () => {
      root?.render(<AdminPage />);
    });
  }

  function getTrainingCodeInput(): HTMLInputElement {
    const input = container.querySelector<HTMLInputElement>('input[placeholder="受講者が入力するコード"]');
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
