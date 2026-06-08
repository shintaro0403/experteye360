import type { ParticipantSubmission } from "./types";

/** room スコープの回答のみ返す（localStorage / 管理者 UI 用） */
export function filterResponsesByRoomId(
  responses: ParticipantSubmission[],
  roomId: string,
): ParticipantSubmission[] {
  const scoped = roomId.trim();
  if (!scoped) return responses;
  return responses.filter((r) => r.roomId?.trim() === scoped);
}

/** 指定 room の回答だけ除いた一覧（他 room は残す） */
export function omitResponsesForRoomId(
  responses: ParticipantSubmission[],
  roomId: string,
): ParticipantSubmission[] {
  const scoped = roomId.trim();
  if (!scoped) return responses;
  return responses.filter((r) => r.roomId?.trim() !== scoped);
}

/** 同一 id の重複を除去（cookie 復元などで二重化した場合） */
export function dedupeResponsesById(responses: ParticipantSubmission[]): ParticipantSubmission[] {
  const seen = new Set<string>();
  return responses.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}
