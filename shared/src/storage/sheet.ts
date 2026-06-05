import type { AppSettings, ParticipantSubmission } from "../types";

type SheetApiBase = {
  apiBaseUrl: string;
  clientId: string;
};

type AdminSheetApiBase = SheetApiBase & {
  adminToken: string;
};

type SheetApiErrorBody = {
  ok: false;
  status?: number;
  error?: string;
};

export type LoadSheetSettingsInput = SheetApiBase;

export type SaveSheetSettingsInput = AdminSheetApiBase & {
  settings: AppSettings;
};

export type LoadSheetResponsesInput = AdminSheetApiBase & {
  roomId: string;
};

export type ClearSheetResponsesInput = AdminSheetApiBase & {
  roomId: string;
};

export type AppendSheetResponseInput = SheetApiBase & {
  roomId: string;
  submission: ParticipantSubmission;
};

export type VerifyTrainingCodeViaApiInput = SheetApiBase & {
  accessCode: string;
};

export type VerifyTrainingCodeViaApiResult = {
  roomId: string;
};

export type ChangeAdminTokenViaApiInput = AdminSheetApiBase & {
  nextAdminToken: string;
};

export type ChangeTrainingCodeViaApiInput = AdminSheetApiBase & {
  roomId: string;
  nextAccessCode: string;
};

export async function loadSheetSettings(input: LoadSheetSettingsInput): Promise<AppSettings> {
  return requestJson<AppSettings>(buildUrl(input.apiBaseUrl, "settings", {
    client: input.clientId,
  }));
}

export async function saveSheetSettings(input: SaveSheetSettingsInput): Promise<void> {
  await requestJson<unknown>(
    buildUrl(input.apiBaseUrl, "settings", {
      client: input.clientId,
    }),
    postJson({ token: input.adminToken, settings: input.settings }),
  );
}

export async function loadSheetResponses(
  input: LoadSheetResponsesInput,
): Promise<ParticipantSubmission[]> {
  return requestJson<ParticipantSubmission[]>(
    buildUrl(input.apiBaseUrl, "responses/query", {
      client: input.clientId,
      room: input.roomId,
    }),
    postJson({ token: input.adminToken }),
  );
}

export async function clearSheetResponses(input: ClearSheetResponsesInput): Promise<void> {
  await requestJson<unknown>(
    buildUrl(input.apiBaseUrl, "responses/clear", {
      client: input.clientId,
      room: input.roomId,
    }),
    postJson({ token: input.adminToken }),
  );
}

export async function appendSheetResponse(input: AppendSheetResponseInput): Promise<void> {
  await requestJson<unknown>(
    buildUrl(input.apiBaseUrl, "responses", {
      client: input.clientId,
      room: input.roomId,
    }),
    postJson(input.submission),
  );
}

export async function verifyTrainingCodeViaApi(
  input: VerifyTrainingCodeViaApiInput,
): Promise<VerifyTrainingCodeViaApiResult> {
  return requestJson<VerifyTrainingCodeViaApiResult>(
    buildUrl(input.apiBaseUrl, "rooms/verify", {
      client: input.clientId,
    }),
    postJson({ accessCode: input.accessCode }),
  );
}

export async function changeAdminTokenViaApi(input: ChangeAdminTokenViaApiInput): Promise<void> {
  await requestJson<unknown>(
    buildUrl(input.apiBaseUrl, "admin/token", {
      client: input.clientId,
    }),
    postJson({ token: input.adminToken, nextAdminToken: input.nextAdminToken }),
  );
}

export async function changeTrainingCodeViaApi(
  input: ChangeTrainingCodeViaApiInput,
): Promise<void> {
  await requestJson<unknown>(
    buildUrl(input.apiBaseUrl, "rooms/access-code", {
      client: input.clientId,
    }),
    postJson({
      token: input.adminToken,
      roomId: input.roomId,
      nextAccessCode: input.nextAccessCode,
    }),
  );
}

/**
 * SEC-NET-01: API ベース URL は HTTPS 必須。
 * 開発・E2E 用に localhost / 127.0.0.1 の http のみ許可する。
 */
const DEV_PLAINTEXT_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function assertSecureApiBase(url: URL): void {
  if (url.protocol === "https:") return;
  if (url.protocol === "http:" && DEV_PLAINTEXT_HOSTS.has(url.hostname)) return;
  throw new Error("Sheet API base URL must use HTTPS");
}

function buildUrl(apiBaseUrl: string, path: string, params: Record<string, string>): string {
  const url = new URL(apiBaseUrl);
  assertSecureApiBase(url);
  url.searchParams.set("path", path);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function postJson(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
  };
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = (await response.json()) as T | SheetApiErrorBody;
  if (!response.ok) {
    throw new Error(`Sheet API request failed: ${response.status}`);
  }
  if (isSheetApiErrorBody(body)) {
    const detail = body.error?.trim() || String(body.status ?? "unknown");
    throw new Error(`Sheet API request failed: ${detail}`);
  }
  return body as T;
}

/** Sheet API の ok:false / fetch 失敗を画面向け短文にする */
export function sheetApiErrorDetail(err: unknown): string {
  if (!(err instanceof Error)) return "";
  return err.message.replace(/^Sheet API request failed:\s*/i, "").trim();
}

function isSheetApiErrorBody(body: unknown): body is SheetApiErrorBody {
  return Boolean(
    body &&
      typeof body === "object" &&
      "ok" in body &&
      (body as { ok?: unknown }).ok === false,
  );
}
