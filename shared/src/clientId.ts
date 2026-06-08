export type ResolveClientIdInput = {
  search?: string | null;
  envClientId?: string | null;
};

/** 埋め込み URL の ?client= を優先し、無ければ VITE_CLIENT_ID にフォールバックする。 */
export function resolveClientId(input: ResolveClientIdInput = {}): string | null {
  const search =
    input.search ??
    (typeof window !== "undefined" ? window.location.search : null);
  const fromUrl = search ? new URLSearchParams(search).get("client")?.trim() : null;
  if (fromUrl) return fromUrl;

  const fromEnv = input.envClientId?.trim();
  if (fromEnv) return fromEnv;

  return null;
}
