import { verifyAdminCode } from "./adminEntry";
import { verifyTrainingCode } from "./roomEntry";
import type { AppSettings, TrainingRoom } from "./types";

export function isTrainingCodeScopedAdmin(settings: AppSettings): boolean {
  return settings.adminRoomScope === "trainingCode";
}

export function canChangeAccessCodes(settings: AppSettings): boolean {
  return !isTrainingCodeScopedAdmin(settings);
}

export function verifySharedAdminAccessCode(adminCode: string, settings: AppSettings): boolean {
  return verifyAdminCode(adminCode, settings.adminAccessCode);
}

/**
 * Sheet 入室前の共有管理者コードチェック。
 * 本番 settings は平文を持たない（adminAccessCode が空）ため、入力があれば API 照合へ進める。
 */
export function canProceedToSharedAdminApiVerify(adminCode: string, settings: AppSettings): boolean {
  const code = adminCode.trim();
  if (!code) return false;
  const expected = settings.adminAccessCode?.trim();
  if (!expected) return true;
  return verifyAdminCode(code, expected);
}

export function resolveAdminRoomByTrainingCode(
  settings: AppSettings,
  trainingCode: string,
): TrainingRoom | null {
  const result = verifyTrainingCode(trainingCode, settings.rooms);
  if (!result.ok) return null;
  return (
    settings.rooms.find((room) => room.roomId === result.roomId && room.enabled !== false) ?? null
  );
}
