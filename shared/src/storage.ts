import { normalizeSettings } from "./sceneQuestions";
import { DEFAULT_SETTINGS } from "./seed";
import type { AppSettings, ParticipantSubmission } from "./types";

const KEY_SETTINGS = "expertEye360:settings";
const KEY_RESPONSES = "expertEye360:responses";

function freshDefaults(): AppSettings {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as AppSettings;
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY_SETTINGS);
    if (!raw) {
      const d = freshDefaults();
      saveSettings(d);
      return d;
    }
    const parsed = JSON.parse(raw) as AppSettings;
    if (!parsed.scenes?.length) {
      const d = freshDefaults();
      saveSettings(d);
      return d;
    }
    return normalizeSettings(parsed);
  } catch {
    const d = freshDefaults();
    saveSettings(d);
    return d;
  }
}

export function saveSettings(s: AppSettings): void {
  localStorage.setItem(KEY_SETTINGS, JSON.stringify(normalizeSettings(s)));
  window.dispatchEvent(new Event("expertEye360-storage"));
}

export function loadResponses(): ParticipantSubmission[] {
  try {
    const raw = localStorage.getItem(KEY_RESPONSES);
    if (!raw) return [];
    return JSON.parse(raw) as ParticipantSubmission[];
  } catch {
    return [];
  }
}

export function saveResponses(list: ParticipantSubmission[]): void {
  localStorage.setItem(KEY_RESPONSES, JSON.stringify(list));
  window.dispatchEvent(new Event("expertEye360-storage"));
}

export function appendResponse(r: ParticipantSubmission): void {
  const list = loadResponses();
  list.unshift(r);
  saveResponses(list);
}

export function resetDemoData(): void {
  localStorage.removeItem(KEY_SETTINGS);
  localStorage.removeItem(KEY_RESPONSES);
  saveSettings(freshDefaults());
}
