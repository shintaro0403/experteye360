import { normalizeAppSettings } from "./appSettings";
import { dedupeResponsesById, filterResponsesByRoomId, omitResponsesForRoomId } from "./responseScope";
import { resolveClientId } from "./clientId";
import {
  provisionAdminRoomByTrainingCode,
  type ProvisionAdminRoomResult,
} from "./adminRoom";
import { TRAINING_CODE_MISMATCH_MESSAGE, type VerifyTrainingCodeResult, verifyTrainingCode } from "./roomEntry";
import { DEFAULT_SETTINGS } from "./seed";
import {
  appendSheetResponse,
  changeAdminTokenViaApi,
  changeTrainingCodeViaApi,
  clearSheetResponses,
  loadSheetResponses,
  loadSheetSettings,
  provisionRoomViaApi,
  saveSheetSettings,
  verifyAdminTokenViaApi,
  verifyTrainingCodeViaApi,
  sheetApiErrorDetail,
} from "./storage/sheet";

export { sheetApiErrorDetail };
import type { AppSettings, ParticipantSubmission } from "./types";

const KEY_SETTINGS = "expertEye360:settings";
const KEY_RESPONSES = "expertEye360:responses";
const COOKIE_RESPONSES = "expertEye360Responses";
const COOKIE_CHUNK_COUNT = `${COOKIE_RESPONSES}Chunks`;
const COOKIE_CHUNK_SIZE = 3_000;
const E2E_STORAGE_RESPONSES_URL = "http://127.0.0.1:5199/responses";

function freshDefaults(): AppSettings {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as AppSettings;
}

type StorageEnv = {
  VITE_STORAGE_BACKEND?: string;
  VITE_SHEET_API_BASE?: string;
  VITE_CLIENT_ID?: string;
};

type LoadResponsesAsyncInput = {
  roomId?: string | null;
  adminToken?: string | null;
};

type SaveSettingsAsyncInput = {
  adminToken?: string | null;
};

type ChangeAdminTokenAsyncInput = {
  adminToken: string;
  nextAdminToken: string;
};

type ChangeTrainingCodeAsyncInput = {
  adminToken: string;
  roomId: string;
  nextAccessCode: string;
};

type SaveResponsesAsyncInput = {
  adminToken?: string | null;
  roomId?: string | null;
};

function getStorageEnv(): StorageEnv {
  const viteEnv = ((import.meta as ImportMeta & { env?: StorageEnv }).env ?? {}) as StorageEnv;
  const nodeEnv =
    typeof process === "undefined" ? {} : (process.env as Record<string, string | undefined>);
  return {
    VITE_STORAGE_BACKEND: viteEnv.VITE_STORAGE_BACKEND ?? nodeEnv.VITE_STORAGE_BACKEND,
    VITE_SHEET_API_BASE: viteEnv.VITE_SHEET_API_BASE ?? nodeEnv.VITE_SHEET_API_BASE,
    VITE_CLIENT_ID: viteEnv.VITE_CLIENT_ID ?? nodeEnv.VITE_CLIENT_ID,
  };
}

export function isSheetStorageBackend(): boolean {
  const env = getStorageEnv();
  return env.VITE_STORAGE_BACKEND === "sheet";
}

function sheetApiConfig(): { apiBaseUrl: string; clientId: string } {
  const env = getStorageEnv();
  const apiBaseUrl = env.VITE_SHEET_API_BASE?.trim();
  const clientId = resolveClientId({ envClientId: env.VITE_CLIENT_ID });
  if (!apiBaseUrl || !clientId) {
    throw new Error("Sheet API config is missing");
  }
  return { apiBaseUrl, clientId };
}

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  const found = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!found) return null;
  return found.slice(prefix.length);
}

function writeCookie(name: string, value: string): void {
  document.cookie = `${name}=${value}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

function readSharedResponses(): string | null {
  const countRaw = readCookie(COOKIE_CHUNK_COUNT);
  const count = countRaw ? Number(countRaw) : 0;
  if (!Number.isInteger(count) || count <= 0) return null;

  const chunks = Array.from({ length: count }, (_, index) => readCookie(`${COOKIE_RESPONSES}${index}`));
  if (chunks.some((chunk) => chunk === null)) return null;
  return decodeURIComponent(chunks.join(""));
}

function writeSharedResponses(raw: string): void {
  clearSharedResponses();
  const encoded = encodeURIComponent(raw);
  const chunks = encoded.match(new RegExp(`.{1,${COOKIE_CHUNK_SIZE}}`, "g")) ?? [];
  writeCookie(COOKIE_CHUNK_COUNT, String(chunks.length));
  chunks.forEach((chunk, index) => writeCookie(`${COOKIE_RESPONSES}${index}`, chunk));
}

function clearSharedResponses(): void {
  const countRaw = readCookie(COOKIE_CHUNK_COUNT);
  const count = countRaw ? Number(countRaw) : 0;
  if (Number.isInteger(count) && count > 0) {
    Array.from({ length: count }, (_, index) => deleteCookie(`${COOKIE_RESPONSES}${index}`));
  }
  deleteCookie(COOKIE_CHUNK_COUNT);
  deleteCookie(COOKIE_RESPONSES);
}

function shouldUseE2eStorage(): boolean {
  return Boolean(navigator.webdriver && location.hostname === "127.0.0.1");
}

function requestE2eResponses(method: "GET" | "POST" | "DELETE", body?: string): string | null {
  if (!shouldUseE2eStorage()) return null;

  try {
    const xhr = new XMLHttpRequest();
    xhr.open(method, E2E_STORAGE_RESPONSES_URL, false);
    if (body !== undefined) {
      xhr.setRequestHeader("Content-Type", "application/json");
    }
    xhr.send(body);
    if (xhr.status < 200 || xhr.status >= 300) return null;
    return xhr.responseText;
  } catch {
    return null;
  }
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
    return normalizeAppSettings(parsed);
  } catch {
    const d = freshDefaults();
    saveSettings(d);
    return d;
  }
}

export function saveSettings(s: AppSettings): void {
  localStorage.setItem(KEY_SETTINGS, JSON.stringify(normalizeAppSettings(s)));
  window.dispatchEvent(new Event("expertEye360-storage"));
}

export function loadResponses(): ParticipantSubmission[] {
  try {
    const raw = requestE2eResponses("GET") ?? localStorage.getItem(KEY_RESPONSES) ?? readSharedResponses();
    if (!raw) return [];
    const parsed = dedupeResponsesById(JSON.parse(raw) as ParticipantSubmission[]);
    localStorage.setItem(KEY_RESPONSES, JSON.stringify(parsed));
    return parsed;
  } catch {
    return [];
  }
}

export function saveResponses(list: ParticipantSubmission[]): void {
  const raw = JSON.stringify(list);
  localStorage.setItem(KEY_RESPONSES, raw);
  writeSharedResponses(raw);
  requestE2eResponses("POST", raw);
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
  clearSharedResponses();
  requestE2eResponses("DELETE");
  saveSettings(freshDefaults());
}

export async function loadSettingsAsync(): Promise<AppSettings> {
  if (!isSheetStorageBackend()) return loadSettings();
  const config = sheetApiConfig();
  return normalizeAppSettings(await loadSheetSettings(config), { clientId: config.clientId });
}

export async function saveSettingsAsync(
  settings: AppSettings,
  input: SaveSettingsAsyncInput = {},
): Promise<void> {
  if (!isSheetStorageBackend()) {
    saveSettings(settings);
    return;
  }
  const adminToken = input.adminToken?.trim();
  if (!adminToken) throw new Error("Admin token is required to save sheet settings");
  await saveSheetSettings({
    ...sheetApiConfig(),
    adminToken,
    settings: normalizeAppSettings(settings),
  });
  window.dispatchEvent(new Event("expertEye360-storage"));
}

export async function loadResponsesAsync(
  input: LoadResponsesAsyncInput = {},
): Promise<ParticipantSubmission[]> {
  if (!isSheetStorageBackend()) {
    const all = loadResponses();
    const roomId = input.roomId?.trim();
    if (!roomId) return all;
    return filterResponsesByRoomId(all, roomId);
  }
  const roomId = input.roomId?.trim();
  const adminToken = input.adminToken?.trim();
  if (!roomId || !adminToken) return [];
  return loadSheetResponses({
    ...sheetApiConfig(),
    roomId,
    adminToken,
  });
}

export async function appendResponseAsync(response: ParticipantSubmission): Promise<void> {
  if (!isSheetStorageBackend()) {
    appendResponse(response);
    return;
  }
  const roomId = response.roomId?.trim();
  if (!roomId) throw new Error("roomId is required to append sheet response");
  await appendSheetResponse({
    ...sheetApiConfig(),
    roomId,
    submission: response,
  });
  window.dispatchEvent(new Event("expertEye360-storage"));
}

export async function saveResponsesAsync(
  list: ParticipantSubmission[],
  input: SaveResponsesAsyncInput = {},
): Promise<void> {
  if (!isSheetStorageBackend()) {
    const roomId = input.roomId?.trim();
    if (roomId && list.length === 0) {
      saveResponses(omitResponsesForRoomId(loadResponses(), roomId));
      window.dispatchEvent(new Event("expertEye360-storage"));
      return;
    }
    saveResponses(list);
    return;
  }
  if (list.length > 0) {
    throw new Error("Replacing all responses is not supported for sheet backend");
  }
  const roomId = input.roomId?.trim();
  const adminToken = input.adminToken?.trim();
  if (!roomId || !adminToken) {
    throw new Error("Admin token and roomId are required to clear sheet responses");
  }
  await clearSheetResponses({
    ...sheetApiConfig(),
    roomId,
    adminToken,
  });
  window.dispatchEvent(new Event("expertEye360-storage"));
}

export type ProvisionAdminRoomAsyncInput = {
  trainingCode: string;
  settings: AppSettings;
  adminToken: string;
};

/** 管理者ゲート②: 研修コードで room を確定（local は settings 更新、Sheet は API で provision） */
export async function provisionAdminRoomAsync(
  input: ProvisionAdminRoomAsyncInput,
): Promise<ProvisionAdminRoomResult> {
  const local = provisionAdminRoomByTrainingCode(input.settings, input.trainingCode);
  if (!local.ok) return local;

  if (!isSheetStorageBackend()) {
    if (local.created) saveSettings(local.settings);
    return local;
  }

  const adminToken = input.adminToken.trim();
  if (!adminToken) {
    return { ok: false, message: "管理者コード入力からやり直してください" };
  }

  try {
    const api = await provisionRoomViaApi({
      ...sheetApiConfig(),
      adminToken,
      accessCode: input.trainingCode.trim(),
      displayName: local.room.displayName,
    });
    const room =
      input.settings.rooms.find((item) => item.roomId === api.roomId) ?? local.room;
    const settings =
      api.created && !input.settings.rooms.some((item) => item.roomId === api.roomId)
        ? { ...input.settings, rooms: [...input.settings.rooms, { ...room, roomId: api.roomId }] }
        : input.settings;
    return {
      ok: true,
      room: { ...room, roomId: api.roomId },
      created: api.created,
      settings,
    };
  } catch (err) {
    return { ok: false, message: formatProvisionRoomError(err) };
  }
}

/** 管理者ゲート②の provision 失敗を画面向けに整形 */
export function formatProvisionRoomError(err: unknown): string {
  const detail = sheetApiErrorDetail(err);
  if (detail.includes("Unknown route") && detail.includes("rooms/provision")) {
    return [
      "研修回の準備に失敗しました。",
      "",
      "接続先 GAS に rooms/provision API がありません。",
      "gas/Code.gs を Apps Script に反映し、「デプロイを管理」→ 既存デプロイの編集 → 新バージョンでデプロイしてください（URL は変えない）。",
    ].join("\n");
  }
  if (detail.includes("Invalid admin token")) {
    return "管理者コードが正しくありません。①からやり直してください。";
  }
  if (detail) {
    return `研修回の準備に失敗しました。\n\n（${detail}）`;
  }
  return "研修回の準備に失敗しました。しばらくしてから再度お試しください。";
}

export async function verifyTrainingCodeAsync(
  accessCode: string,
  fallbackRooms: AppSettings["rooms"],
): Promise<VerifyTrainingCodeResult> {
  if (!isSheetStorageBackend()) return verifyTrainingCode(accessCode, fallbackRooms);
  try {
    const result = await verifyTrainingCodeViaApi({
      ...sheetApiConfig(),
      accessCode,
    });
    return { ok: true, roomId: result.roomId };
  } catch {
    return { ok: false, message: TRAINING_CODE_MISMATCH_MESSAGE };
  }
}

export async function verifyAdminTokenAsync(adminToken: string, roomId: string): Promise<void> {
  const token = adminToken.trim();
  const scopedRoomId = roomId.trim();
  if (!token) throw new Error("Admin token is required");
  if (!scopedRoomId) throw new Error("roomId is required");
  if (!isSheetStorageBackend()) {
    await loadResponsesAsync({ adminToken: token, roomId: scopedRoomId });
    return;
  }
  await verifyAdminTokenViaApi({
    ...sheetApiConfig(),
    adminToken: token,
    roomId: scopedRoomId,
  });
}

export async function changeAdminTokenAsync(input: ChangeAdminTokenAsyncInput): Promise<void> {
  if (!isSheetStorageBackend()) {
    throw new Error("Changing admin token via API requires sheet backend");
  }
  await changeAdminTokenViaApi({
    ...sheetApiConfig(),
    adminToken: input.adminToken,
    nextAdminToken: input.nextAdminToken,
  });
}

export async function changeTrainingCodeAsync(input: ChangeTrainingCodeAsyncInput): Promise<void> {
  if (!isSheetStorageBackend()) {
    throw new Error("Changing training code via API requires sheet backend");
  }
  const adminToken = input.adminToken.trim();
  const roomId = input.roomId.trim();
  const nextAccessCode = input.nextAccessCode.trim();
  if (!adminToken) throw new Error("Admin token is required to change training code");
  if (!roomId) throw new Error("roomId is required to change training code");
  if (!nextAccessCode) throw new Error("nextAccessCode is required to change training code");
  await changeTrainingCodeViaApi({
    ...sheetApiConfig(),
    adminToken,
    roomId,
    nextAccessCode,
  });
  window.dispatchEvent(new Event("expertEye360-storage"));
}
