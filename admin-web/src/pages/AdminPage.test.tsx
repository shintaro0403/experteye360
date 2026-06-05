import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_ADMIN_AUTH_KEY, SESSION_ADMIN_TOKEN_KEY } from "@shared/adminEntry";
import { primaryTrainingRoom } from "@shared/appSettings";
import { DEFAULT_SETTINGS } from "@shared/seed";
import { generateParticipantPdf } from "@shared/pdfExport";
import { changeAdminTokenAsync, changeTrainingCodeAsync } from "@shared/storage";
import { makeScene, makeSettings, makeSubmission } from "@shared/test/fixtures";
import { useAppData } from "../hooks/useAppData";
import { AdminPage } from "./AdminPage";

vi.mock("@shared/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/storage")>();
  return {
    ...actual,
    isSheetStorageBackend: vi.fn(() => true),
    verifyAdminTokenAsync: vi.fn(),
    changeAdminTokenAsync: vi.fn().mockResolvedValue(undefined),
    changeTrainingCodeAsync: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("../hooks/useAppData", () => ({
  useAppData: vi.fn(),
}));

vi.mock("@shared/pdfExport", () => ({
  generateParticipantPdf: vi.fn(() => new Uint8Array([37, 80, 68, 70])),
}));

describe("AdminPage", () => {
  let container: HTMLDivElement;
  let root: Root | null;
  let refresh: ReturnType<typeof vi.fn>;
  let applySettings: ReturnType<typeof vi.fn>;

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
    vi.mocked(changeAdminTokenAsync).mockResolvedValue(undefined);
    applySettings = vi.fn();
    vi.mocked(useAppData).mockReturnValue({
      settings: DEFAULT_SETTINGS,
      setSettings: vi.fn().mockResolvedValue(undefined),
      applySettings,
      responses: [],
      addResponse: vi.fn().mockResolvedValue(undefined),
      replaceResponses: vi.fn().mockResolvedValue(undefined),
      refresh,
      loading: false,
      refreshing: false,
      error: null,
    });
  });

  function mockUseAppData(overrides: Partial<ReturnType<typeof useAppData>> = {}) {
    vi.mocked(useAppData).mockReturnValue({
      settings: DEFAULT_SETTINGS,
      setSettings: vi.fn().mockResolvedValue(undefined),
      applySettings,
      responses: [],
      addResponse: vi.fn().mockResolvedValue(undefined),
      replaceResponses: vi.fn().mockResolvedValue(undefined),
      refresh,
      loading: false,
      refreshing: false,
      error: null,
      ...overrides,
    });
  }

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

  it("Sheet backend では研修コード保存時に changeTrainingCodeAsync を呼び、成功後は再読込せず即反映する", async () => {
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
    expect(refresh).not.toHaveBeenCalled();
    expect(applySettings).toHaveBeenCalledWith({
      ...DEFAULT_SETTINGS,
      rooms: DEFAULT_SETTINGS.rooms.map((r) =>
        r.roomId === primaryTrainingRoom(DEFAULT_SETTINGS).roomId
          ? { ...r, accessCode: "DEMO-2027" }
          : r,
      ),
    });
    expect(window.alert).toHaveBeenCalledWith("研修コードを保存しました。受講者に新しいコードを案内してください。");
  });

  it("Sheet backend: GAS 形式の roomId で研修コードを保存する", async () => {
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
    mockUseAppData({ settings: sheetSettings });
    await render();
    const input = getTrainingCodeInput();
    const saveButton = getButton("研修コードを保存");

    await act(async () => {
      setInputValue(input, "demo-2027");
    });
    await act(async () => {
      saveButton.click();
    });

    expect(changeTrainingCodeAsync).toHaveBeenCalledWith({
      adminToken: "admin-demo-2026",
      roomId: "demo-room-001",
      nextAccessCode: "demo-2027",
    });
  });

  it("Sheet backend: 研修コード未入力のとき API を呼ばない", async () => {
    mockUseAppData({
      settings: makeSettings({
        rooms: [{ roomId: "demo-room-001", displayName: "GAS", accessCode: "", enabled: true }],
      }),
    });
    await render();
    await act(async () => {
      getButton("研修コードを保存").click();
    });
    expect(changeTrainingCodeAsync).not.toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith("研修コードを入力してください");
  });

  it("Sheet backend: 現在の管理者コードが空のとき API を呼ばずエラー表示する", async () => {
    await render();
    await act(async () => {
      setInputValue(getAdminNewInput(), "admin-next-99");
    });
    await act(async () => {
      getButton("管理者コードを変更").click();
    });
    expect(changeAdminTokenAsync).not.toHaveBeenCalled();
    expect(container.textContent).toContain("現在の管理者コードを入力してください");
  });

  it("Sheet backend: 現在欄がセッションと一致するとき入室 token で API を呼ぶ", async () => {
    await render();
    await act(async () => {
      setInputValue(getAdminCurrentInput(), "admin-demo-2026");
      setInputValue(getAdminNewInput(), "admin-next-99");
    });
    await act(async () => {
      getButton("管理者コードを変更").click();
    });
    expect(changeAdminTokenAsync).toHaveBeenCalledWith({
      adminToken: "admin-demo-2026",
      nextAdminToken: "admin-next-99",
    });
    expect(sessionStorage.getItem(SESSION_ADMIN_TOKEN_KEY)).toBe("admin-next-99");
    expect(container.textContent).toContain("管理者コードを変更しました");
  });

  it("Sheet backend: 現在欄がセッションと不一致のとき API を呼ばない", async () => {
    await render();
    await act(async () => {
      setInputValue(getAdminCurrentInput(), "wrong-code");
      setInputValue(getAdminNewInput(), "admin-next-99");
    });
    await act(async () => {
      getButton("管理者コードを変更").click();
    });
    expect(changeAdminTokenAsync).not.toHaveBeenCalled();
    expect(container.textContent).toContain("現在の管理者コードが正しくありません");
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
    expect(window.alert).toHaveBeenCalledWith("研修コードの保存に失敗しました。\n\n（bad token）");
  });

  it("入室済みで管理者コード入力に戻ると入室画面に戻りセッションを消す", async () => {
    await render();
    expect(container.textContent).toContain("研修コードを保存");
    await act(async () => {
      getButton("管理者コード入力に戻る").click();
    });
    expect(container.textContent).toContain("入室する");
    expect(container.textContent).not.toContain("研修コードを保存");
    expect(sessionStorage.getItem(SESSION_ADMIN_AUTH_KEY)).toBeNull();
    expect(sessionStorage.getItem(SESSION_ADMIN_TOKEN_KEY)).toBeNull();
  });

  it("再読込中はボタンを無効化しスピナーを表示する", async () => {
    mockUseAppData({ refreshing: true });
    await render();
    const reload = getButton("再読込");
    expect(reload.disabled).toBe(true);
    expect(container.querySelector(".a-spinner")).not.toBeNull();
  });

  it("回答タブで一覧と未選択メッセージを表示する", async () => {
    const submission = makeSubmission({
      id: "resp-1",
      participantName: "一覧 太郎",
      sceneId: DEFAULT_SETTINGS.scenes[0]?.id ?? "scene-1",
    });
    mockUseAppData({ responses: [submission] });
    await render();
    await act(async () => {
      getButton("回答").click();
    });
    expect(container.textContent).toContain("一覧 太郎");
    expect(container.textContent).toContain("一覧から回答を選択してください");
  });

  it("回答詳細から選択中回答の PDF を生成できる", async () => {
    const submission = makeSubmission({
      id: "pdf-response-1",
      participantName: "PDF 太郎",
      sceneId: "scene-pdf",
    });
    const settings = makeSettings({
      scenes: [makeScene({ id: "scene-pdf", displayName: "PDF 確認シーン" })],
    });
    mockUseAppData({
      settings,
      responses: [submission],
    });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:pdf");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    await render();
    await act(async () => {
      getButton("回答").click();
    });
    await act(async () => {
      getButtonContaining("PDF 太郎").click();
    });
    await act(async () => {
      getButton("PDFをダウンロード").click();
    });

    expect(generateParticipantPdf).toHaveBeenCalledWith({
      submission,
      scene: settings.scenes[0],
    });
  });

  async function render() {
    root = createRoot(container);
    await act(async () => {
      root?.render(<AdminPage />);
    });
  }

  function getAdminCurrentInput(): HTMLInputElement {
    const input = container.querySelector<HTMLInputElement>('input[placeholder="現在のコード"]');
    if (!input) throw new Error("admin current input not found");
    return input;
  }

  function getAdminNewInput(): HTMLInputElement {
    const input = container.querySelector<HTMLInputElement>('input[placeholder="4文字以上"]');
    if (!input) throw new Error("admin new input not found");
    return input;
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

  function getButtonContaining(text: string): HTMLButtonElement {
    const button = Array.from(container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.includes(text),
    );
    if (!(button instanceof HTMLButtonElement)) throw new Error(`button not found containing: ${text}`);
    return button;
  }

  function setInputValue(input: HTMLInputElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
});
