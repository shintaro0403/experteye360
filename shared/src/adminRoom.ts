import { primaryTrainingRoom } from "./appSettings";
import { getAdminSessionRoomId } from "./adminEntry";
import type { AppSettings, TrainingRoom } from "./types";

/** 管理者コードから、管理対象の研修回（room）を特定する。 */
export function resolveAdminRoomByCode(
  settings: AppSettings,
  adminCode: string,
): TrainingRoom | null {
  const code = adminCode.trim();
  if (!code) return null;

  const enabledRooms = settings.rooms.filter((room) => room.enabled !== false);
  const withRoomAdmin = enabledRooms.filter((room) => room.adminAccessCode?.trim());

  if (withRoomAdmin.length > 0) {
    const matched = withRoomAdmin.filter((room) => room.adminAccessCode?.trim() === code);
    if (matched.length === 1) return matched[0];
    return null;
  }

  if (enabledRooms.length === 1) {
    const legacy = settings.adminAccessCode?.trim();
    if (legacy && legacy === code) return enabledRooms[0];
  }

  return null;
}

/**
 * Sheet 入室用の room 特定。
 * 平文 adminAccessCode が無い本番 settings では、単一 room なら API 照合へ進める。
 */
export function resolveAdminRoomForSheetLogin(
  settings: AppSettings,
  adminCode: string,
): TrainingRoom | null {
  const code = adminCode.trim();
  if (!code) return null;

  const matched = resolveAdminRoomByCode(settings, adminCode);
  if (matched) return matched;

  const enabledRooms = settings.rooms.filter((room) => room.enabled !== false);
  if (enabledRooms.length === 1) return enabledRooms[0];

  return null;
}

/** 入室済み管理者が操作対象とする研修回。セッション room → なければ先頭 room。 */
export function resolveAdminScopeRoom(settings: AppSettings): TrainingRoom {
  const roomId = getAdminSessionRoomId();
  if (roomId) {
    const match = settings.rooms.find((room) => room.roomId === roomId && room.enabled !== false);
    if (match) return match;
  }
  return primaryTrainingRoom(settings);
}
