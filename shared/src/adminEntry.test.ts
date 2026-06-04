import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  changeAdminAccessCode,
  getAdminSessionToken,
  isAdminSessionActive,
  SESSION_ADMIN_AUTH_KEY,
  SESSION_ADMIN_TOKEN_KEY,
  setAdminSessionActive,
  setAdminSessionToken,
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
  });
});
