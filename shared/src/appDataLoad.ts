import { primaryTrainingRoom } from "./appSettings";
import type { AppSettings, ParticipantSubmission } from "./types";

/** ボタン操作から UI が反映されるまでの上限（ミリ秒） */
export const UI_RESPONSE_BUDGET_MS = 2000;

/** storage イベント連鎖による再読込の debounce（ミリ秒） */
export const STORAGE_REFRESH_DEBOUNCE_MS = 150;

export type RefreshMode = "initial" | "background";

export type RefreshScope = "all" | "settings";

export function shouldShowBlockingLoader(mode: RefreshMode): boolean {
  return mode === "initial";
}

export function resolveRefreshMode(hasLoadedOnce: boolean): RefreshMode {
  return hasLoadedOnce ? "background" : "initial";
}

/** Sheet API の GET responses に渡す roomId。adminRoomId があればそれを優先。 */
export function resolveResponsesRoomId(
  settings: AppSettings,
  adminRoomId?: string | null,
): string {
  const scoped = adminRoomId?.trim();
  if (scoped) {
    const match = settings.rooms.find((room) => room.roomId === scoped && room.enabled !== false);
    if (match) return match.roomId;
  }
  return primaryTrainingRoom(settings).roomId;
}

export async function loadAppDataBundle(input: {
  loadSettings: () => Promise<AppSettings>;
  loadResponses: () => Promise<ParticipantSubmission[]>;
  scope: RefreshScope;
}): Promise<{ settings: AppSettings; responses?: ParticipantSubmission[] }> {
  if (input.scope === "settings") {
    const settings = await input.loadSettings();
    return { settings };
  }
  const [settings, responses] = await Promise.all([
    input.loadSettings(),
    input.loadResponses(),
  ]);
  return { settings, responses };
}

export function prependResponse(
  current: ParticipantSubmission[],
  next: ParticipantSubmission,
): ParticipantSubmission[] {
  if (current.some((r) => r.id === next.id)) return current;
  return [next, ...current];
}

export function createDebounced<T extends (...args: never[]) => void>(
  fn: T,
  ms: number,
): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = ((...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  }) as T & { cancel: () => void };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return debounced;
}
