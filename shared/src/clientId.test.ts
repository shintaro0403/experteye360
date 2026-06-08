import { describe, expect, it } from "vitest";
import { resolveClientId } from "./clientId";

/**
 * MULTI-CLIENT-01 — 埋め込み URL の ?client= 解決（デモ複数社配布向け）
 *
 * 目的: 1 ビルドを複数 client に配布し、URL で組織を切り替えられるようにする。
 *
 * 受け入れ条件:
 * - URL に ?client={clientId} があれば、それを Sheet API の client クエリに使う。
 * - URL に client が無い場合は VITE_CLIENT_ID にフォールバックする。
 * - どちらも無い場合は null（Sheet backend では設定不足エラー）。
 *
 * 成功条件:
 * - resolveClientId の単体テストが Green。
 * - storage の Sheet API 呼び出しが URL 優先の clientId を付与する。
 *
 * コード上の期待値:
 * - resolveClientId({ search, envClientId }) → string | null
 * - sheetApiConfig() が resolveClientId を経由する
 */
describe("resolveClientId（MULTI-CLIENT-01）", () => {
  it("URL の ?client= を VITE_CLIENT_ID より優先する", () => {
    expect(
      resolveClientId({
        search: "?client=acme-factory",
        envClientId: "lipronext-demo",
      }),
    ).toBe("acme-factory");
  });

  it("URL に client が無いときは環境値にフォールバックする", () => {
    expect(
      resolveClientId({
        search: "",
        envClientId: " lipronext-demo ",
      }),
    ).toBe("lipronext-demo");
  });

  it("URL も環境値も無いときは null を返す", () => {
    expect(resolveClientId({ search: "", envClientId: "" })).toBeNull();
    expect(resolveClientId({ search: "?foo=bar", envClientId: undefined })).toBeNull();
  });

  it("?client= が空のときは環境値にフォールバックする", () => {
    expect(
      resolveClientId({
        search: "?client=",
        envClientId: "client-a",
      }),
    ).toBe("client-a");
  });

  it("?client= の前後空白は trim する", () => {
    expect(
      resolveClientId({
        search: "?client=%20acme%20",
        envClientId: "x",
      }),
    ).toBe("acme");
  });
});
