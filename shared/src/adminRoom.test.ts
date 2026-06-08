import { describe, expect, it } from "vitest";
import { makeSettings } from "./test/fixtures";
import {
  resolveAdminRoomByCode,
  resolveAdminRoomForSheetLogin,
  resolveAdminScopeRoom,
} from "./adminRoom";
import { SESSION_ADMIN_ROOM_KEY, setAdminSessionRoomId } from "./adminEntry";

/**
 * ISOLATE-1 — 管理者コードから研修回（room）を特定する（shared ドメイン）
 *
 * 目的: URL を変えず、管理者コードだけで「どの研修回の管理者か」を決める。
 *
 * 受け入れ条件:
 * - 各 room に adminAccessCode があるとき、入力コードが一致する room だけ返す。
 * - room A の管理者コードでは room B に一致しない。
 * - 不一致・空入力は null。
 * - 後方互換: room が 1 つだけで settings.adminAccessCode のみのときも動く。
 *
 * 成功条件: 本ファイルの it が Green。既存テストを壊さない。
 *
 * コード上の期待値:
 * - resolveAdminRoomByCode(settings, adminCode) → TrainingRoom | null
 */
describe("resolveAdminRoomByCode（ISOLATE-1）", () => {
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

  it("管理者コード 2001 は room-0403 に一致する", () => {
    const room = resolveAdminRoomByCode(twoRoomSettings, "2001");
    expect(room?.roomId).toBe("room-0403");
  });

  it("管理者コード 3001 は room-0505 に一致する", () => {
    const room = resolveAdminRoomByCode(twoRoomSettings, "3001");
    expect(room?.roomId).toBe("room-0505");
  });

  it("room A の管理者コードでは room B に一致しない", () => {
    expect(resolveAdminRoomByCode(twoRoomSettings, "2001")?.roomId).not.toBe("room-0505");
    expect(resolveAdminRoomByCode(twoRoomSettings, "3001")?.roomId).not.toBe("room-0403");
  });

  it("不一致・空入力は null", () => {
    expect(resolveAdminRoomByCode(twoRoomSettings, "9999")).toBeNull();
    expect(resolveAdminRoomByCode(twoRoomSettings, "")).toBeNull();
    expect(resolveAdminRoomByCode(twoRoomSettings, "   ")).toBeNull();
  });

  it("無効な room は一致対象にしない", () => {
    const settings = makeSettings({
      rooms: [
        {
          roomId: "room-off",
          displayName: "停止中",
          accessCode: "OFF",
          adminAccessCode: "9000",
          enabled: false,
        },
      ],
    });
    expect(resolveAdminRoomByCode(settings, "9000")).toBeNull();
  });

  it("room 1 つ・settings.adminAccessCode のみの後方互換", () => {
    const settings = makeSettings({
      rooms: [
        {
          roomId: "room-demo-1",
          displayName: "デモ",
          accessCode: "DEMO-2026",
          enabled: true,
        },
      ],
      adminAccessCode: "admin-demo",
    });
    const room = resolveAdminRoomByCode(settings, "admin-demo");
    expect(room?.roomId).toBe("room-demo-1");
  });

  it("resolveAdminRoomForSheetLogin: 平文なし・単一 room なら API 照合用に room を返す", () => {
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
    const room = resolveAdminRoomForSheetLogin(gasLike, "admin-demo-2026");
    expect(room?.roomId).toBe("demo-room-001");
  });

  it("resolveAdminRoomForSheetLogin: 複数 room で平文なしは null", () => {
    expect(resolveAdminRoomForSheetLogin(twoRoomSettings, "admin-demo-2026")).toBeNull();
  });

  it("resolveAdminScopeRoom はセッションの roomId を優先する", () => {
    const settings = makeSettings({
      rooms: [
        {
          roomId: "room-0403",
          displayName: "4月3日",
          accessCode: "0403",
          adminAccessCode: "2001",
          enabled: true,
        },
        {
          roomId: "room-0505",
          displayName: "5月5日",
          accessCode: "0505",
          adminAccessCode: "3001",
          enabled: true,
        },
      ],
    });
    setAdminSessionRoomId("room-0505");
    expect(resolveAdminScopeRoom(settings).roomId).toBe("room-0505");
    setAdminSessionRoomId(null);
  });
});
