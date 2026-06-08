import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_ADMIN_AUTH_KEY, SESSION_ADMIN_ROOM_KEY, SESSION_ADMIN_TOKEN_KEY } from "@shared/adminEntry";
import { DEFAULT_SETTINGS } from "@shared/seed";
import { generateParticipantPdf } from "@shared/pdfExport";
import { verifyAdminTokenAsync } from "@shared/storage";
import { makeScene, makeSettings, makeSubmission } from "@shared/test/fixtures";
import { useAppData } from "../hooks/useAppData";
import { AdminPage } from "./AdminPage";

vi.mock("@shared/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/storage")>();
  return {
    ...actual,
    isSheetStorageBackend: vi.fn(() => true),
    verifyAdminTokenAsync: vi.fn().mockResolvedValue(undefined),
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
  let replaceResponses: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    sessionStorage.clear();
    sessionStorage.setItem(SESSION_ADMIN_AUTH_KEY, "1");
    sessionStorage.setItem(SESSION_ADMIN_TOKEN_KEY, "admin-demo-2026");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = null;
    refresh = vi.fn().mockResolvedValue(undefined);
    replaceResponses = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "alert").mockImplementation(() => undefined);
    vi.mocked(useAppData).mockReturnValue({
      settings: DEFAULT_SETTINGS,
      setSettings: vi.fn().mockResolvedValue(undefined),
      applySettings: vi.fn(),
      responses: [],
      addResponse: vi.fn().mockResolvedValue(undefined),
      replaceResponses,
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
      applySettings: vi.fn(),
      responses: [],
      addResponse: vi.fn().mockResolvedValue(undefined),
      replaceResponses,
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

  it("入室後は管理者コード変更・ツアー URL 編集 UI を出さない（研修コード保存は表示）", async () => {
    await render();
    expect(container.textContent).toContain("研修コードを保存");
    expect(container.textContent).not.toContain("管理者コードを変更");
    expect(container.textContent).not.toContain("3DVista ツアー URL");
    expect(container.querySelector('input[placeholder="https://..."]')).toBeNull();
    expect(
      Array.from(container.querySelectorAll("button")).some((b) => b.textContent?.trim() === "ツアーURL"),
    ).toBe(false);
  });

  it("入室済みで管理者コード入力に戻ると入室画面に戻りセッションを消す", async () => {
    await render();
    await act(async () => {
      getButton("管理者コード入力に戻る").click();
    });
    expect(container.textContent).toContain("入室する");
    expect(sessionStorage.getItem(SESSION_ADMIN_AUTH_KEY)).toBeNull();
    expect(sessionStorage.getItem(SESSION_ADMIN_TOKEN_KEY)).toBeNull();
  });

  it("Sheet: GAS 相当（adminAccessCode 空・単一 room）でも管理者 token で入室できる", async () => {
    sessionStorage.clear();
    const gasLikeSettings = makeSettings({
      adminAccessCode: "",
      rooms: [
        {
          roomId: "demo-room-001",
          displayName: "GAS デモ",
          accessCode: "",
          enabled: true,
        },
      ],
    });
    mockUseAppData({ settings: gasLikeSettings });
    await render();
    const loginInput = container.querySelector<HTMLInputElement>('input[placeholder="管理者コード"]');
    if (!loginInput) throw new Error("admin login input not found");
    await act(async () => {
      setInputValue(loginInput, "admin-demo-2026");
    });
    await act(async () => {
      getButton("入室する").click();
      await Promise.resolve();
    });
    expect(verifyAdminTokenAsync).toHaveBeenCalledWith("admin-demo-2026", "demo-room-001");
    expect(sessionStorage.getItem(SESSION_ADMIN_ROOM_KEY)).toBe("demo-room-001");
  });

  it("DEMO-SCOPE-1: デモスコープでは共有管理者コード + 研修コードで room を特定する", async () => {
    sessionStorage.clear();
    const demoScopedSettings = makeSettings({
      adminRoomScope: "trainingCode",
      adminAccessCode: "admin-demo",
      rooms: [
        {
          roomId: "room-demo-1",
          displayName: "A社デモ",
          accessCode: "DEMO-2026",
          enabled: true,
        },
        {
          roomId: "room-other",
          displayName: "B社デモ",
          accessCode: "OTHER-2026",
          enabled: true,
        },
      ],
    });
    mockUseAppData({ settings: demoScopedSettings });
    await render();
    const adminInput = container.querySelector<HTMLInputElement>('input[placeholder="管理者コード"]');
    const trainingInput = container.querySelector<HTMLInputElement>('input[placeholder="研修コード"]');
    if (!adminInput || !trainingInput) throw new Error("demo scoped login inputs not found");
    await act(async () => {
      setInputValue(adminInput, "admin-demo");
      setInputValue(trainingInput, "OTHER-2026");
    });
    await act(async () => {
      getButton("入室する").click();
      await Promise.resolve();
    });
    expect(verifyAdminTokenAsync).toHaveBeenCalledWith("admin-demo", "room-other");
    expect(sessionStorage.getItem(SESSION_ADMIN_ROOM_KEY)).toBe("room-other");
  });

  it("ISOLATE-2: 管理者コード 3001 で入室すると room-0505 で token を検証する", async () => {
    sessionStorage.clear();
    const twoRoomSettings = makeSettings({
      rooms: [
        {
          roomId: "room-0403",
          displayName: "4月3日研修",
          accessCode: "0403",
          adminAccessCode: "2001",
          enabled: true,
        },
        {
          roomId: "room-0505",
          displayName: "5月5日研修",
          accessCode: "0505",
          adminAccessCode: "3001",
          enabled: true,
        },
      ],
      adminAccessCode: "legacy-global",
    });
    mockUseAppData({ settings: twoRoomSettings });
    await render();
    const loginInput = container.querySelector<HTMLInputElement>('input[placeholder="管理者コード"]');
    if (!loginInput) throw new Error("admin login input not found");
    await act(async () => {
      setInputValue(loginInput, "3001");
    });
    await act(async () => {
      getButton("入室する").click();
      await Promise.resolve();
    });
    expect(verifyAdminTokenAsync).toHaveBeenCalledWith("3001", "room-0505");
    expect(sessionStorage.getItem(SESSION_ADMIN_ROOM_KEY)).toBe("room-0505");
  });

  it("入室 API 待ち中は入室ボタンにスピナーを表示する", async () => {
    sessionStorage.clear();
    mockUseAppData({
      settings: makeSettings({
        rooms: [{ roomId: "demo-room-001", displayName: "GAS", accessCode: "", enabled: true }],
        adminAccessCode: "admin-demo-2026",
      }),
    });
    let finishLogin: (() => void) | undefined;
    vi.mocked(verifyAdminTokenAsync).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishLogin = resolve;
        }),
    );
    await render();
    const loginInput = container.querySelector<HTMLInputElement>('input[placeholder="管理者コード"]');
    if (!loginInput) throw new Error("admin login input not found");
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(loginInput, "admin-demo-2026");
      loginInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      getButton("入室する").click();
    });
    const loginButton = getButton("入室する");
    expect(loginButton.disabled).toBe(true);
    expect(loginButton.querySelector(".a-spinner")).not.toBeNull();
    await act(async () => {
      finishLogin?.();
      await Promise.resolve();
    });
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

  it("Sheet backend: 確認後に全回答削除で replaceResponses([]) を呼び未実装アラートは出さない", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockUseAppData({
      responses: [makeSubmission({ id: "del-1", participantName: "削除対象" })],
      replaceResponses,
    });

    await render();
    await act(async () => {
      getButton("回答").click();
    });
    await act(async () => {
      getButton("全回答を削除").click();
    });

    expect(window.confirm).toHaveBeenCalledWith("全回答を削除しますか？");
    expect(replaceResponses).toHaveBeenCalledWith([]);
    expect(window.alert).not.toHaveBeenCalledWith("Sheet API 利用時の全回答削除は未実装です。");
  });

  it("Sheet backend: 全回答削除 API 未デプロイ時は再デプロイを案内する", async () => {
    vi.mocked(replaceResponses).mockRejectedValueOnce(
      new Error("Sheet API request failed: Unknown route: POST responses/clear"),
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockUseAppData({
      responses: [makeSubmission({ id: "del-fail" })],
      replaceResponses,
    });

    await render();
    await act(async () => {
      getButton("回答").click();
    });
    await act(async () => {
      getButton("全回答を削除").click();
      await Promise.resolve();
    });

    expect(replaceResponses).toHaveBeenCalledWith([]);
    expect(window.alert).toHaveBeenCalledWith(
      expect.stringContaining("responses/clear"),
    );
  });

  it("Sheet backend: 全回答削除をキャンセルしたときは replaceResponses を呼ばない", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    mockUseAppData({
      responses: [makeSubmission({ id: "del-2" })],
      replaceResponses,
    });

    await render();
    await act(async () => {
      getButton("回答").click();
    });
    await act(async () => {
      getButton("全回答を削除").click();
    });

    expect(replaceResponses).not.toHaveBeenCalled();
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
