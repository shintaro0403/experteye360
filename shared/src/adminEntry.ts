export const SESSION_ADMIN_AUTH_KEY = "expertEye360:adminAuth";
export const SESSION_ADMIN_TOKEN_KEY = "expertEye360:adminToken";
export const SESSION_ADMIN_ROOM_KEY = "expertEye360:adminRoomId";
/** ADMIN-2STEP-1: 管理者コード通過後・研修コード未確定 */
export const SESSION_ADMIN_GATE_KEY = "expertEye360:adminGate";

export function verifyAdminCode(input: string, expectedAccessCode: string): boolean {
  const a = input.trim();
  const b = expectedAccessCode.trim();
  if (!a || !b) return false;
  return a === b;
}

export function isAdminSessionActive(): boolean {
  try {
    return sessionStorage.getItem(SESSION_ADMIN_AUTH_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAdminSessionActive(active: boolean): void {
  try {
    if (active) sessionStorage.setItem(SESSION_ADMIN_AUTH_KEY, "1");
    else {
      sessionStorage.removeItem(SESSION_ADMIN_AUTH_KEY);
      sessionStorage.removeItem(SESSION_ADMIN_TOKEN_KEY);
      sessionStorage.removeItem(SESSION_ADMIN_ROOM_KEY);
      sessionStorage.removeItem(SESSION_ADMIN_GATE_KEY);
    }
  } catch {
    /* private mode 等 */
  }
}

export function getAdminSessionToken(): string | null {
  try {
    return sessionStorage.getItem(SESSION_ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminSessionToken(token: string | null): void {
  try {
    if (token?.trim()) sessionStorage.setItem(SESSION_ADMIN_TOKEN_KEY, token.trim());
    else sessionStorage.removeItem(SESSION_ADMIN_TOKEN_KEY);
  } catch {
    /* private mode 等 */
  }
}

export function getAdminSessionRoomId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_ADMIN_ROOM_KEY);
  } catch {
    return null;
  }
}

export function setAdminSessionRoomId(roomId: string | null): void {
  try {
    if (roomId?.trim()) sessionStorage.setItem(SESSION_ADMIN_ROOM_KEY, roomId.trim());
    else sessionStorage.removeItem(SESSION_ADMIN_ROOM_KEY);
  } catch {
    /* private mode 等 */
  }
}

/** 管理者コード通過後、研修コード入力待ち（第 2 画面） */
export function isAdminTrainingGateActive(): boolean {
  try {
    return sessionStorage.getItem(SESSION_ADMIN_GATE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAdminTrainingGateActive(active: boolean): void {
  try {
    if (active) sessionStorage.setItem(SESSION_ADMIN_GATE_KEY, "1");
    else sessionStorage.removeItem(SESSION_ADMIN_GATE_KEY);
  } catch {
    /* private mode 等 */
  }
}

/** workspace セッションのみクリア（ゲート用 token は残す） */
export function clearAdminWorkspaceSession(): void {
  try {
    sessionStorage.removeItem(SESSION_ADMIN_AUTH_KEY);
    sessionStorage.removeItem(SESSION_ADMIN_ROOM_KEY);
  } catch {
    /* private mode 等 */
  }
}

/** 管理者コード通過 → 研修コードゲート（第 2 画面）。旧 workspace は必ず消す。 */
export function enterAdminTrainingGate(adminToken: string): void {
  clearAdminWorkspaceSession();
  setAdminSessionToken(adminToken);
  setAdminTrainingGateActive(true);
}

/** 研修コード確定済みの管理画面（room スコープ付き入室） */
export function isAdminWorkspaceActive(): boolean {
  if (isAdminTrainingGateActive()) return false;
  return isAdminSessionActive() && Boolean(getAdminSessionRoomId()?.trim());
}

export type ChangeAdminCodeResult = { ok: true } | { ok: false; error: string };

/** 現在の管理者コードを知っている場合のみ変更可能 */
export function changeAdminAccessCode(
  currentCode: string,
  nextCode: string,
  expectedAccessCode: string,
): ChangeAdminCodeResult {
  if (!verifyAdminCode(currentCode, expectedAccessCode)) {
    return { ok: false, error: "現在の管理者コードが正しくありません" };
  }
  const next = nextCode.trim();
  if (next.length < 4) {
    return { ok: false, error: "新しい管理者コードは4文字以上にしてください" };
  }
  if (next === expectedAccessCode.trim()) {
    return { ok: false, error: "新しい管理者コードは現在と異なるものにしてください" };
  }
  return { ok: true };
}

/** Sheet backend: 再入力した現在コードがセッション token と一致したときだけ API 変更可能 */
export function validateSheetAdminCodeChange(
  currentInput: string,
  nextInput: string,
  sessionAdminToken: string,
): ChangeAdminCodeResult {
  const current = currentInput.trim();
  const next = nextInput.trim();
  if (!current) {
    return { ok: false, error: "現在の管理者コードを入力してください" };
  }
  if (!verifyAdminCode(current, sessionAdminToken)) {
    return { ok: false, error: "現在の管理者コードが正しくありません" };
  }
  if (next.length < 4) {
    return { ok: false, error: "新しい管理者コードは4文字以上にしてください" };
  }
  if (verifyAdminCode(next, sessionAdminToken)) {
    return { ok: false, error: "新しい管理者コードは現在と異なるものにしてください" };
  }
  return { ok: true };
}
