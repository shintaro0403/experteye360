import type { TrainingRoom } from "./types";

/** 受講者向け・研修コード不一致時の固定文言 */
export const TRAINING_CODE_MISMATCH_MESSAGE = "正しい研修コードを入力してください";

export const SESSION_VERIFIED_ROOM_KEY = "expertEye360:verifiedRoomId";

export type VerifyTrainingCodeResult =
  | { ok: true; roomId: string }
  | { ok: false; message: typeof TRAINING_CODE_MISMATCH_MESSAGE };

export function verifyTrainingCode(
  code: string,
  rooms: TrainingRoom[],
): VerifyTrainingCodeResult {
  const normalized = code.trim();
  if (!normalized) {
    return { ok: false, message: TRAINING_CODE_MISMATCH_MESSAGE };
  }
  const match = rooms.find(
    (r) => r.enabled && r.accessCode.trim().toLowerCase() === normalized.toLowerCase(),
  );
  if (!match) {
    return { ok: false, message: TRAINING_CODE_MISMATCH_MESSAGE };
  }
  return { ok: true, roomId: match.roomId };
}

export function getVerifiedRoomId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_VERIFIED_ROOM_KEY);
  } catch {
    return null;
  }
}

export function setVerifiedRoomId(roomId: string | null): void {
  try {
    if (roomId) sessionStorage.setItem(SESSION_VERIFIED_ROOM_KEY, roomId);
    else sessionStorage.removeItem(SESSION_VERIFIED_ROOM_KEY);
  } catch {
    /* private mode 等 */
  }
}

export function canShowProfileFields(verifiedRoomId: string | null): boolean {
  return Boolean(verifiedRoomId?.trim());
}
