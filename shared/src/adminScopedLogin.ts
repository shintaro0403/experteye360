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
