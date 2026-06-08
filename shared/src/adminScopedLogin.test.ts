import { describe, expect, it } from "vitest";
import { makeSettings } from "./test/fixtures";
import {
  canChangeAccessCodes,
  canEditTourUrl,
  canProceedToSharedAdminApiVerify,
  isTrainingCodeScopedAdmin,
  resolveAdminRoomByTrainingCode,
  verifySharedAdminAccessCode,
} from "./adminScopedLogin";

/**
 * DEMO-SCOPE-1 — 共有管理者コード + 研修コードで room 確定（デモ配布）
 *
 * 目的: 同一 URL・共有管理者コードでも、研修コードで room を分離する。
 *
 * 受け入れ条件:
 * - adminRoomScope=trainingCode のとき共有管理者コード + 研修コードで room を特定。
 * - 研修コード不一致は null。
 * - デモスコープ時はコード変更不可（canChangeAccessCodes=false）。
 * - adminRoomScope 未指定は従来の adminCode スコープ。
 */
describe("DEMO-SCOPE-1: adminScopedLogin", () => {
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

  it("adminRoomScope=trainingCode のときデモスコープと判定する", () => {
    expect(isTrainingCodeScopedAdmin(demoScopedSettings)).toBe(true);
    expect(canChangeAccessCodes(demoScopedSettings)).toBe(false);
    expect(canEditTourUrl(demoScopedSettings)).toBe(false);
  });

  it("adminRoomScope 未指定は従来スコープ（コード変更可）", () => {
    const legacy = makeSettings({ adminAccessCode: "admin-demo" });
    expect(isTrainingCodeScopedAdmin(legacy)).toBe(false);
    expect(canChangeAccessCodes(legacy)).toBe(true);
    expect(canEditTourUrl(legacy)).toBe(true);
  });

  it("共有管理者コードが settings.adminAccessCode と一致するときだけ true", () => {
    expect(verifySharedAdminAccessCode(" admin-demo ", demoScopedSettings)).toBe(true);
    expect(verifySharedAdminAccessCode("wrong", demoScopedSettings)).toBe(false);
    expect(verifySharedAdminAccessCode("", demoScopedSettings)).toBe(false);
  });

  it("Sheet: adminAccessCode が空なら入力があれば API 照合へ進める", () => {
    const gasLike = makeSettings({
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
    expect(canProceedToSharedAdminApiVerify("admin-demo-2026", gasLike)).toBe(true);
    expect(canProceedToSharedAdminApiVerify("", gasLike)).toBe(false);
  });

  it("Sheet: adminAccessCode があるときは一致が必要", () => {
    expect(canProceedToSharedAdminApiVerify("admin-demo", demoScopedSettings)).toBe(true);
    expect(canProceedToSharedAdminApiVerify("wrong", demoScopedSettings)).toBe(false);
  });

  it("研修コード DEMO-2026 は room-demo-1 に一致する", () => {
    const room = resolveAdminRoomByTrainingCode(demoScopedSettings, "DEMO-2026");
    expect(room?.roomId).toBe("room-demo-1");
  });

  it("研修コード OTHER-2026 は room-other に一致する", () => {
    const room = resolveAdminRoomByTrainingCode(demoScopedSettings, "OTHER-2026");
    expect(room?.roomId).toBe("room-other");
  });

  it("研修コード不一致・空入力は null", () => {
    expect(resolveAdminRoomByTrainingCode(demoScopedSettings, "WRONG")).toBeNull();
    expect(resolveAdminRoomByTrainingCode(demoScopedSettings, "")).toBeNull();
  });

  it("無効 room の研修コードは null", () => {
    const settings = makeSettings({
      adminRoomScope: "trainingCode",
      rooms: [
        {
          roomId: "room-off",
          displayName: "停止中",
          accessCode: "OFF-CODE",
          enabled: false,
        },
      ],
    });
    expect(resolveAdminRoomByTrainingCode(settings, "OFF-CODE")).toBeNull();
  });
});
