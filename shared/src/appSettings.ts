import { normalizeSettings } from "./sceneQuestions";
import type { AppSettings, TrainingRoom } from "./types";

export const DEFAULT_ADMIN_ACCESS_CODE = "admin-demo";

export const DEFAULT_TRAINING_ROOMS: TrainingRoom[] = [
  {
    roomId: "room-demo-1",
    displayName: "デモ研修（午前）",
    accessCode: "DEMO-2026",
    enabled: true,
  },
];

export function normalizeAppSettings(settings: AppSettings): AppSettings {
  const base = normalizeSettings(settings);
  const rooms =
    base.rooms?.length > 0
      ? base.rooms.map((r) => ({
          ...r,
          roomId: r.roomId?.trim() || "room-1",
          displayName: r.displayName?.trim() || "研修回",
          accessCode: r.accessCode?.trim() || "",
          enabled: r.enabled !== false,
        }))
      : [...DEFAULT_TRAINING_ROOMS];

  const adminAccessCode = base.adminAccessCode?.trim() || DEFAULT_ADMIN_ACCESS_CODE;

  return {
    ...base,
    tourUrl: base.tourUrl ?? "",
    rooms,
    adminAccessCode,
  };
}

export function primaryTrainingRoom(settings: AppSettings): TrainingRoom {
  return settings.rooms[0] ?? DEFAULT_TRAINING_ROOMS[0];
}
