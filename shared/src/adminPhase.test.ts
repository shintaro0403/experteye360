import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  enterAdminTrainingGate,
  isAdminTrainingGateActive,
  isAdminWorkspaceActive,
  SESSION_ADMIN_AUTH_KEY,
  SESSION_ADMIN_GATE_KEY,
  SESSION_ADMIN_ROOM_KEY,
  setAdminSessionActive,
  setAdminSessionRoomId,
} from "./adminEntry";

/**
 * ADMIN-2STEP-1: 画面フェーズ判定の正本（AdminPage が依存するセッション契約）
 */
describe("ADMIN-2STEP-1: admin phase session contract", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("ゲートのみ → workspace ではない", () => {
    enterAdminTrainingGate("admin-demo");
    expect(isAdminTrainingGateActive()).toBe(true);
    expect(isAdminWorkspaceActive()).toBe(false);
  });

  it("workspace 入室 → ゲートではない", () => {
    enterAdminTrainingGate("admin-demo");
    setAdminSessionActive(true);
    setAdminSessionRoomId("room-0403");
    sessionStorage.removeItem(SESSION_ADMIN_GATE_KEY);
    expect(isAdminWorkspaceActive()).toBe(true);
    expect(isAdminTrainingGateActive()).toBe(false);
  });

  it("不整合セッション（ゲート+auth+room）でも workspace にはならない", () => {
    setAdminSessionActive(true);
    setAdminSessionRoomId("room-0403");
    sessionStorage.setItem(SESSION_ADMIN_GATE_KEY, "1");
    expect(sessionStorage.getItem(SESSION_ADMIN_AUTH_KEY)).toBe("1");
    expect(isAdminWorkspaceActive()).toBe(false);
    expect(isAdminTrainingGateActive()).toBe(true);
  });
});
