import { primaryTrainingRoom } from "./appSettings";
import { getAdminSessionRoomId } from "./adminEntry";
import { resolveAdminRoomByTrainingCode } from "./adminScopedLogin";
import type { AppSettings, TrainingRoom } from "./types";

export const ADMIN_TRAINING_CODE_REQUIRED_MESSAGE = "研修コードを入力してください";

export type ProvisionAdminRoomResult =
  | { ok: true; room: TrainingRoom; created: boolean; settings: AppSettings }
  | { ok: false; message: string };

/** 研修コードから roomId を生成（既存 ID と衝突しない） */
export function allocateRoomIdForAccessCode(accessCode: string, rooms: TrainingRoom[]): string {
  const slug =
    accessCode
      .trim()
      .replace(/[^\w\u3040-\u30ff\u3400-\u9fff-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "room";
  const base = `room-${slug}`;
  const ids = new Set(rooms.map((room) => room.roomId));
  if (!ids.has(base)) return base;
  let suffix = 2;
  while (ids.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

/**
 * 管理者ゲート②: 研修コードで room を確定する。
 * 既存 room があればそれを返し、なければ新規 room を settings に追加する（管理者がコードを決める）。
 */
export function provisionAdminRoomByTrainingCode(
  settings: AppSettings,
  trainingCode: string,
): ProvisionAdminRoomResult {
  const code = trainingCode.trim();
  if (!code) {
    return { ok: false, message: ADMIN_TRAINING_CODE_REQUIRED_MESSAGE };
  }

  const existing = resolveAdminRoomByTrainingCode(settings, code);
  if (existing) {
    return { ok: true, room: existing, created: false, settings };
  }

  const room: TrainingRoom = {
    roomId: allocateRoomIdForAccessCode(code, settings.rooms),
    displayName: code,
    accessCode: code,
    enabled: true,
  };

  return {
    ok: true,
    room,
    created: true,
    settings: { ...settings, rooms: [...settings.rooms, room] },
  };
}

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
