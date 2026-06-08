import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  changeAdminAccessCode,
  getAdminSessionToken,
  isAdminSessionActive,
  isAdminTrainingGateActive,
  isAdminWorkspaceActive,
  SESSION_ADMIN_AUTH_KEY,
  SESSION_ADMIN_GATE_KEY,
  SESSION_ADMIN_ROOM_KEY,
  SESSION_ADMIN_TOKEN_KEY,
  setAdminSessionRoomId,
  setAdminSessionActive,
  setAdminSessionToken,
  setAdminTrainingGateActive,
  validateSheetAdminCodeChange,
  verifyAdminCode,
} from "./adminEntry";

describe("verifyAdminCode", () => {
  it("正しいコードのときだけ true", () => {
    expect(verifyAdminCode(" admin-demo ", "admin-demo")).toBe(true);
    expect(verifyAdminCode("wrong", "admin-demo")).toBe(false);
    expect(verifyAdminCode("", "admin-demo")).toBe(false);
  });
});

describe("changeAdminAccessCode", () => {
  it("現在のコードが違うときは拒否する", () => {
    expect(changeAdminAccessCode("wrong", "next", "admin-demo")).toEqual({
      ok: false,
      error: "現在の管理者コードが正しくありません",
    });
  });

  it("新コードが短すぎるときは拒否する", () => {
    expect(changeAdminAccessCode("admin-demo", "abc", "admin-demo")).toEqual({
      ok: false,
      error: "新しい管理者コードは4文字以上にしてください",
    });
  });

  it("新コードが現在と同じときは拒否する", () => {
    expect(changeAdminAccessCode("admin-demo", "admin-demo", "admin-demo")).toEqual({
      ok: false,
      error: "新しい管理者コードは現在と異なるものにしてください",
    });
  });

  it("条件を満たせば変更できる", () => {
    expect(changeAdminAccessCode("admin-demo", "admin-next", "admin-demo")).toEqual({ ok: true });
  });
});

describe("validateSheetAdminCodeChange", () => {
  const session = "admin-demo-2026";

  it("現在欄が空のときは API 前に拒否する", () => {
    expect(validateSheetAdminCodeChange("", "admin-next", session)).toEqual({
      ok: false,
      error: "現在の管理者コードを入力してください",
    });
  });

  it("現在欄がセッション token と一致しないときは拒否する", () => {
    expect(validateSheetAdminCodeChange("wrong", "admin-next", session)).toEqual({
      ok: false,
      error: "現在の管理者コードが正しくありません",
    });
  });

  it("新コードが短すぎるときは拒否する", () => {
    expect(validateSheetAdminCodeChange(session, "abc", session)).toEqual({
      ok: false,
      error: "新しい管理者コードは4文字以上にしてください",
    });
  });

  it("新コードが現在と同じときは拒否する", () => {
    expect(validateSheetAdminCodeChange(session, session, session)).toEqual({
      ok: false,
      error: "新しい管理者コードは現在と異なるものにしてください",
    });
  });

  it("条件を満たせば変更できる", () => {
    expect(validateSheetAdminCodeChange(session, "admin-next-99", session)).toEqual({ ok: true });
  });
});

describe("admin session storage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("入室状態と token を保存・削除できる", () => {
    expect(isAdminSessionActive()).toBe(false);
    setAdminSessionActive(true);
    setAdminSessionToken("token-1");
    expect(isAdminSessionActive()).toBe(true);
    expect(getAdminSessionToken()).toBe("token-1");
    setAdminSessionActive(false);
    expect(isAdminSessionActive()).toBe(false);
    expect(getAdminSessionToken()).toBeNull();
    expect(sessionStorage.getItem(SESSION_ADMIN_AUTH_KEY)).toBeNull();
    expect(sessionStorage.getItem(SESSION_ADMIN_TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(SESSION_ADMIN_ROOM_KEY)).toBeNull();
  });

  it("admin roomId を保存・削除できる", () => {
    setAdminSessionRoomId("room-0505");
    expect(sessionStorage.getItem(SESSION_ADMIN_ROOM_KEY)).toBe("room-0505");
    setAdminSessionActive(false);
    expect(sessionStorage.getItem(SESSION_ADMIN_ROOM_KEY)).toBeNull();
  });
});

describe("ADMIN-2STEP-1: admin training gate session", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("ゲートのみのとき isAdminTrainingGateActive は true、isAdminWorkspaceActive は false", () => {
    setAdminTrainingGateActive(true);
    setAdminSessionToken("admin-demo");
    expect(isAdminTrainingGateActive()).toBe(true);
    expect(isAdminWorkspaceActive()).toBe(false);
    expect(isAdminSessionActive()).toBe(false);
  });

  it("フル入室後は isAdminWorkspaceActive が true、ゲートは false にできる", () => {
    setAdminTrainingGateActive(true);
    setAdminSessionActive(true);
    setAdminSessionToken("admin-demo");
    setAdminSessionRoomId("room-demo-1");
    setAdminTrainingGateActive(false);
    expect(isAdminWorkspaceActive()).toBe(true);
    expect(isAdminTrainingGateActive()).toBe(false);
  });

  it("setAdminSessionActive(false) でゲートもクリアされる", () => {
    setAdminTrainingGateActive(true);
    setAdminSessionActive(true);
    setAdminSessionRoomId("room-demo-1");
    setAdminSessionActive(false);
    expect(sessionStorage.getItem(SESSION_ADMIN_GATE_KEY)).toBeNull();
    expect(isAdminWorkspaceActive()).toBe(false);
  });
});
