/**
 * ISOLATE-3 — room 単位の管理者 token 照合（GAS / mock と同型）
 *
 * 目的: room A の token で room B の管理者 API を拒否する。
 *
 * 受け入れ条件:
 * - rooms.adminTokenHash があるときは room の hash のみ有効。
 * - room hash が無いときは clients.adminTokenHash にフォールバック（後方互換）。
 * - token 不一致は invalid。
 *
 * コード上の期待値:
 * - isAdminTokenValidForRoom({ token, clientAdminTokenHash, roomAdminTokenHash, tokenHash })
 */
export type AdminTokenVerifyInput = {
  token: string;
  clientAdminTokenHash?: string | null;
  roomAdminTokenHash?: string | null;
  tokenHash: (value: string) => string;
};

export function resolveExpectedAdminTokenHash(input: {
  clientAdminTokenHash?: string | null;
  roomAdminTokenHash?: string | null;
}): string | null {
  const roomHash = input.roomAdminTokenHash?.trim();
  if (roomHash) return roomHash;

  const clientHash = input.clientAdminTokenHash?.trim();
  if (clientHash) return clientHash;

  return null;
}

export function isAdminTokenValidForRoom(input: AdminTokenVerifyInput): boolean {
  const token = input.token.trim();
  if (!token) return false;

  const expected = resolveExpectedAdminTokenHash(input);
  if (!expected) return false;

  return input.tokenHash(token) === expected;
}
