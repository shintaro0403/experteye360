import type { AppSettings, ParticipantSubmission } from "../types";

type SheetApiBase = {
  apiBaseUrl: string;
  clientId: string;
};

type AdminSheetApiBase = SheetApiBase & {
  adminToken: string;
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

function buildUrl(apiBaseUrl: string, path: string, params: Record<string, string>): string {
  const normalizedBase = apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`;
  const url = new URL(path, normalizedBase);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function postJson(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Sheet API request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}
