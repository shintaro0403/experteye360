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

export async function loadSheetSettings(input: LoadSheetSettingsInput): Promise<AppSettings> {
  return requestJson<AppSettings>(buildUrl(input.apiBaseUrl, "settings", {
    client: input.clientId,
  }));
}

export async function saveSheetSettings(input: SaveSheetSettingsInput): Promise<void> {
  await requestJson<unknown>(
    buildUrl(input.apiBaseUrl, "settings", {
      client: input.clientId,
      token: input.adminToken,
    }),
    postJson(input.settings),
  );
}

export async function loadSheetResponses(
  input: LoadSheetResponsesInput,
): Promise<ParticipantSubmission[]> {
  return requestJson<ParticipantSubmission[]>(
    buildUrl(input.apiBaseUrl, "responses", {
      client: input.clientId,
      room: input.roomId,
      token: input.adminToken,
    }),
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
      token: input.adminToken,
    }),
    postJson({ nextAdminToken: input.nextAdminToken }),
  );
}

function buildUrl(apiBaseUrl: string, path: string, params: Record<string, string>): string {
  const url = new URL(apiBaseUrl);
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
    throw new Error(`Sheet API request failed: ${body.status ?? body.error ?? "unknown"}`);
  }
  return body as T;
}

function isSheetApiErrorBody(body: unknown): body is SheetApiErrorBody {
  return Boolean(
    body &&
      typeof body === "object" &&
      "ok" in body &&
      (body as { ok?: unknown }).ok === false,
  );
}
