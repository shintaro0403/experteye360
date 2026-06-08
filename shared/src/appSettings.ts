import { SHEET_DEMO_CLIENT_ID } from "./demoCredentials";
import { normalizeSettings } from "./sceneQuestions";
import type { AppSettings, AdminRoomScope, TrainingRoom } from "./types";

export const DEFAULT_ADMIN_ACCESS_CODE = "admin-demo";

export const DEFAULT_TRAINING_ROOMS: TrainingRoom[] = [
  {
    roomId: "room-demo-1",
    displayName: "デモ研修（午前）",
    accessCode: "DEMO-2026",
    enabled: true,
  },
];

export type NormalizeAppSettingsOptions = {
  clientId?: string | null;
};

/**
 * デモ配布 client（lipronext-demo）で adminRoomScope が未設定のときは trainingCode とする。
 * 実シートの settings_json が古くても 3 画面ゲート（SPEC-ADMIN-THREE-GATE-2026）を有効にする。
 */
export function resolveAdminRoomScope(
  settings: AppSettings,
  clientId?: string | null,
): AdminRoomScope | undefined {
  if (settings.adminRoomScope === "adminCode" || settings.adminRoomScope === "trainingCode") {
    return settings.adminRoomScope;
  }
  if (clientId?.trim() === SHEET_DEMO_CLIENT_ID) {
    return "trainingCode";
  }
  return settings.adminRoomScope;
}

export function normalizeAppSettings(
  settings: AppSettings,
  options: NormalizeAppSettingsOptions = {},
): AppSettings {
  const base = normalizeSettings(settings);
  const rooms =
    base.rooms?.length > 0
      ? base.rooms.map((r) => ({
          ...r,
          roomId: r.roomId?.trim() || "room-1",
          displayName: r.displayName?.trim() || "研修回",
          accessCode: r.accessCode?.trim() || "",
          adminAccessCode: r.adminAccessCode?.trim() || "",
          enabled: r.enabled !== false,
        }))
      : [...DEFAULT_TRAINING_ROOMS];

  const trimmedAdminAccessCode = base.adminAccessCode?.trim() || "";
  // Sheet デモ client は hash 照合のため settings の平文 admin-demo を使わない（API と不一致になりうる）
  const adminAccessCode =
    options.clientId?.trim() === SHEET_DEMO_CLIENT_ID
      ? ""
      : trimmedAdminAccessCode || DEFAULT_ADMIN_ACCESS_CODE;

  return {
    ...base,
    tourUrl: base.tourUrl ?? "",
    rooms,
    adminAccessCode,
    adminRoomScope: resolveAdminRoomScope(base, options.clientId),
  };
}

export function primaryTrainingRoom(settings: AppSettings): TrainingRoom {
  return settings.rooms[0] ?? DEFAULT_TRAINING_ROOMS[0];
}
