export const SESSION_ADMIN_AUTH_KEY = "expertEye360:adminAuth";
export const SESSION_ADMIN_TOKEN_KEY = "expertEye360:adminToken";

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
