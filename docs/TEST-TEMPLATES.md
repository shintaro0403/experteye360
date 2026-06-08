# ExpertEye360 — テストコード・テンプレート集

本書は **「この種類のテストは、だいたいこう書く」** を 1 か所にまとめたものである。AI・人間が新規 `*.test.ts` を書くときの **書き方の型（テンプレ）** を指す。

**本書が担うこと**

- ファイル名・`describe` / `it` の切り方・import・mock の置き方
- API 契約テスト用の **リクエスト／レスポンスの形**（一例として詳しめ）

**本書が担わないこと（正本は別ドキュメント）**

**何をテストするか（TC 一覧・Phase）**

- 正本: [TEST-DESIGN.md](./TEST-DESIGN.md) §1.2・§4

**振る舞い ID（C-01、ENTRY-03 等）**

- 正本: [TDD-FEATURE-INVENTORY.md](./TDD-FEATURE-INVENTORY.md)

**ドメインデータの意味**

- 正本: [types.ts](../shared/src/types.ts)、[README.md](../README.md)

**API エンドポイント・HTTP 意味**

- 正本: [SPREADSHEET-DATA.md](./SPREADSHEET-DATA.md) §4

**テスト名・1 テスト 1 振る舞いの原則**

- 正本: [TEST-DESIGN.md](./TEST-DESIGN.md) §2.2

**実装フロー（6 ステップ）**: [TEST-DESIGN.md §2.0.4](./TEST-DESIGN.md#204-機能ごとの実装フロー6-ステップ)

**テストの粒度（大→中→小）**: [TEST-DESIGN.md §2.0.5](./TEST-DESIGN.md#205-テストの粒度大中小)

**実行**

```bash
npm test          # ルート: vitest run
npm run test:watch
```

**補助コード（実装済み）**

- [shared/src/test/fixtures.ts](../shared/src/test/fixtures.ts) — `makeScene` / `makeSubmission` / `makeSettings`
- 参照実装: [choices.test.ts](../shared/src/choices.test.ts)（**小**）、[roomEntry.test.ts](../shared/src/roomEntry.test.ts)（**中**）

---

## 目次

- [1. どのテンプレを使うか（6 ステップとテンプレの対応）](#1-どのテンプレを使うか)
- [2. 共通ルール（全テンプレ）](#2-共通ルール)
- [3. T1 — 純関数 Unit](#3-T1-—-純関数-Unit)
- [4. T2 — local 永続化（happy-dom）](#4-T2-—-local-永続化)
- [5. T3 — API 契約（Vitest + fetch mock）](#5-T3-—-API-契約)
  - [5.1 このテストで固定する「型」](#51-このテストで固定する「型」)
  - [5.2 テスト用定数（fixtures と揃える）](#52-テスト用定数)
  - [5.3 fetch mock ヘルパ（テンプレ）](#53-fetch-mock-ヘルパ)
  - [5.4 テストファイルの型（コピペ用・1 本）](#54-テストファイルの型)
- [6. T4 — 送信ペイロード（Phase 1）](#6-T4-—-送信ペイロード)
- [7. T5 — コンポーネント薄（スモーク）](#7-T5-—-コンポーネント薄)
- [8. T6 — 手動（自動テンプレなし）](#8-T6-—-手動)
- [9. 機能 → テンプレ早見](#9-機能-テンプレ早見)
- [10. 改訂](#10-改訂)

---


## 1. どのテンプレを使うか（6 ステップとテンプレの対応）

**進め方（正本）**: [TEST-DESIGN.md §2.0.4](./TEST-DESIGN.md#204-機能ごとの実装フロー6-ステップ)

1. 受け入れ条件を書く → **T6**（手動）または仕様ドキュメント（`it` なし）
2. 振る舞いテストを書く → **中**（T3 / T2 / T4 / T5、またはモジュール代表 `*.test.ts`）
3. 最小実装 → （テンプレ外）
4. 内部ロジックが見える → shared へ切り出し候補
5. その部分だけ単体テスト → **T1（小）**
6. リファクタ → テストは Green のまま

新規領域では **いきなり T1 から書かない**。

**T6** — 手動・E2E（**大**）

- **ファイル例**: なし（TEST-DESIGN §4.12、§8.1、§1.5 手動）
- **いつ使う**: 5 問フロー・iframe・入室・受講者→管理者確認が通るか
- **重要度の目安**: A

**T3** — API 契約（**中**）

- **ファイル例**: `sheetApi.test.ts`
- **いつ使う**: `fetch` mock。GAS との JSON・クエリ契約
- **重要度の目安**: B（room 漏洩は A）

**T2** — local 永続化（**中**）

- **ファイル例**: `storage.test.ts`
- **いつ使う**: `localStorage` の読み書き往復
- **重要度の目安**: C

**T4** — 送信ペイロード（**中**）

- **ファイル例**: `submission.test.ts`
- **いつ使う**: `buildSubmission` 等（Phase 1 で抽出）。S-01〜S-09 を **少数の `it`** にまとめてよい
- **重要度の目安**: B

**T5** — コンポーネント薄（**中**）

- **ファイル例**: `ParticipantPage.test.tsx`
- **いつ使う**: 配線スモークのみ。ロジックは T4 / T1 へ
- **重要度の目安**: C

**モジュール代表 Unit（中）** — `judgmentFlow.test.ts` / `sceneQuestions.test.ts`

- T1 と同じ Vitest だが、**1 ファイル 3〜8 本の `it`** でモジュールの芯を固定する
- inventory の JF-01 等を **最初から 1 ID 1 `it` にしない**
- テンプレの骨格は §3（T1）を流用し、`describe` をモジュール名にする

**T1** — 純関数 Unit（**小**）

- **ファイル例**: `foo.test.ts`（`shared/src` 同階層）
- **いつ使う**: **中** が Green のあと、1 関数・1 境界だけ追記
- **重要度の目安**: C
- 参照: [choices.test.ts](../shared/src/choices.test.ts)

新規テストを書く前に **粒度（大/中/小）** を決め、次に **T1〜T6** を選ぶ。複数にまたがる場合は **API は T3、境界だけ T1** のように役割を分け、1 ファイルに詰め込まない。

---

## 2. 共通ルール（全テンプレ）

1. **配置** — `foo.ts` と同ディレクトリに `foo.test.ts`（[TEST-DESIGN.md](./TEST-DESIGN.md) コロケーション）。
2. **`it` の文言** — 日本語で「何をしたら何になるか」。[§2.2](./TEST-DESIGN.md#22-テスト記述の原則) を参照。
3. **1 `it` = 1 振る舞い** — 正常と境界を分ける。
4. **fixtures** — ドメインオブジェクトは `makeScene` / `makeSubmission` / `makeSettings` を使う。テスト専用の別型名は作らない。
5. **`@shared`** — `participant-web` / `admin-web` からではなく、原則 `shared/src` 内のテストでドメインを固定する。

---

## 3. T1 — 純関数 Unit

**対象**: `choices.ts`、`judgmentFlow.ts`、`sceneQuestions.ts`、`roomEntry.ts`、`adminEntry.ts` など。

**テンプレ（最小）**

```ts
import { describe, expect, it } from "vitest";
import { 対象関数 } from "./対象ファイル";

describe("関数名またはモジュール名", () => {
  it("入力Xのとき、返却Yになる", () => {
    expect(対象関数(入力)).toEqual(期待);
  });

  it("境界（空・上限）のとき、〜", () => {
    // ...
  });
});
```

**実例（プロジェクト内）** — [roomEntry.test.ts](../shared/src/roomEntry.test.ts)

```ts
import { verifyTrainingCode, TRAINING_CODE_MISMATCH_MESSAGE } from "./roomEntry";

it("不一致のとき固定文言だけを返す", () => {
  const result = verifyTrainingCode("wrong", rooms);
  expect(result).toEqual({ ok: false, message: TRAINING_CODE_MISMATCH_MESSAGE });
});
```

**やらないこと**

- `fetch` / `localStorage` / React の render（別テンプレへ）。

---

## 4. T2 — local 永続化（happy-dom）

**対象**: [storage.ts](../shared/src/storage.ts)（将来 `storage/local.ts` に分割しても同型）。

**テンプレ（骨格）**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import {
  loadSettings,
  saveSettings,
  loadResponses,
  appendResponse,
  resetDemoData,
} from "./storage";
import { makeSettings, makeSubmission } from "./test/fixtures";

describe("storage（local）", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDemoData(); // または明示的に seed 状態へ
  });

  it("saveSettings 後に loadSettings で同じ内容が返る", () => {
    const s = makeSettings({ tourUrl: "https://example.com/x" });
    saveSettings(s);
    expect(loadSettings().tourUrl).toBe("https://example.com/x");
  });

  it("appendResponse 後、先頭が最新になる", () => {
    const sub = makeSubmission({ id: "new-1" });
    appendResponse(sub);
    expect(loadResponses()[0]?.id).toBe("new-1");
  });
});
```

**やらないこと**

- 本番の `client` / `room` クエリ（T3 へ）。

---

## 5. T3 — API 契約（Vitest + `fetch` mock）

**対象**: 将来の `shared/src/storage/sheet.ts` と `sheetApi.test.ts`。

**正本**

- API: [SPREADSHEET-DATA.md §4](./SPREADSHEET-DATA.md#4-apigas-web-app-想定)
- TC: [TEST-DESIGN.md §4.2b](./TEST-DESIGN.md#42b-sharedsrcstoragesheetts--sheetapitestts本番)

### 5.1 このテストで固定する「型」

実装時は `shared/src/apiTypes.ts`（新規）に寄せてもよい。テスト・フロント・GAS は **同じ JSON 形**を使う。

#### クエリ（すべての API で URL に付与）

```ts
/** URL 検索パラメータ（SPREADSHEET-DATA §4 共通クエリ） */
export type ApiQuery = {
  client: string;       // clientId（必須）
  room?: string;        // roomId（受講者 POST responses 等で必須）
  // token は URL クエリに載せず POST ボディで送る（SEC-SECRET-01）。
  // 旧クライアント互換のため GAS 側はクエリの token もフォールバックで読む。
};
```

#### エラー（HTTP 4xx / 5xx 時の JSON 案）

```ts
export type ApiErrorBody = {
  error: string;
  code?: string;
};
```

#### エンドポイント別ボディ

**GET `settings`**

- **リクエスト body**: なし
- **成功時レスポンス body**: `AppSettings`

**POST `settings`**

- **リクエスト body**: `{ token, settings }`（管理者 token はボディ／SEC-SECRET-01。旧 `AppSettings` 直送りも後方互換）
- **成功時レスポンス body**: 空、または `{ ok: true }`（実装時に 1 つに固定）

**POST `responses/query`**（回答取得・推奨）

- **リクエスト body**: `{ token }`（管理者 token はボディ／SEC-SECRET-01）
- **成功時レスポンス body**: `ParticipantSubmission[]`

**GET `responses`**（後方互換・非推奨。token をクエリに載せるため新規利用は `responses/query`）

- **リクエスト body**: なし
- **成功時レスポンス body**: `ParticipantSubmission[]`

**POST `responses`**

- **リクエスト body**: `ParticipantSubmission`
- **成功時レスポンス body**: 追加行、または `{ id }`（実装時に 1 つに固定）

**POST `rooms/verify`**

- **リクエスト body**: `{ accessCode: string }`
- **成功時レスポンス body**: `{ roomId: string }`

**POST `reset`**

- **リクエスト body**: なし
- **成功時レスポンス body**: —

**POST `responses` のルール（決定済み）**

- クエリ: `client` + **`room`**（`roomId` と同値）
- JSON ボディ: `ParticipantSubmission`（**`roomId` フィールドも同値**で含める）

### 5.2 テスト用定数（fixtures と揃える）

```ts
export const TEST_CLIENT = "client-demo";
export const TEST_ROOM = "room-demo-1";
export const TEST_ADMIN_TOKEN = "admin-demo";
```

`makeSettings()` / `makeSubmission({ roomId: TEST_ROOM })` と同じ ID を使う。

### 5.3 `fetch` mock ヘルパ（テンプレ）

`sheetApi.test.ts` 内、または `shared/src/test/apiMock.ts` に置く想定。

```ts
import { vi } from "vitest";
import type { AppSettings, ParticipantSubmission } from "../types";

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function mockFetchOnce(handler: (input: RequestInfo | URL, init?: RequestInit) => Response) {
  vi.stubGlobal("fetch", vi.fn(handler));
}

/** 最後に呼ばれた fetch の URL にクエリが含まれるか */
export function expectUrlHasParams(url: string, params: Record<string, string>) {
  const u = new URL(url, "https://example.test");
  for (const [k, v] of Object.entries(params)) {
    expect(u.searchParams.get(k)).toBe(v);
  }
}
```

### 5.4 テストファイルの型（コピペ用・1 本）

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadSettings, appendResponse } from "./storage/sheet"; // 実装後のパス
import type { AppSettings, ParticipantSubmission } from "./types";
import { makeSettings, makeSubmission } from "./test/fixtures";
import { jsonResponse, mockFetchOnce, expectUrlHasParams, TEST_CLIENT, TEST_ROOM } from "./test/apiMock";

describe("sheetApi 契約", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GET settings?client= のレスポンスを AppSettings として読める", async () => {
    const body: AppSettings = makeSettings();
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(body));

    const result = await loadSettings(TEST_CLIENT);

    expect(result.tourUrl).toBe(body.tourUrl);
    const [url] = vi.mocked(fetch).mock.calls[0];
    expectUrlHasParams(String(url), { client: TEST_CLIENT });
  });

  it("POST responses は client と room クエリと ParticipantSubmission ボディを送る", async () => {
    const sub: ParticipantSubmission = makeSubmission({ roomId: TEST_ROOM });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ok: true }));

    await appendResponse(TEST_CLIENT, TEST_ROOM, sub);

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const sent = JSON.parse(String(init?.body)) as ParticipantSubmission;
    expect(sent.roomId).toBe(TEST_ROOM);
    expect(sent.participantName).toBe(sub.participantName);
  });

  it("POST rooms/verify 成功時に roomId が返る", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ roomId: TEST_ROOM }));

    // verifyTrainingCodeViaApi(accessCode) 等、実装名に合わせる
    // expect(roomId).toBe(TEST_ROOM);
  });

  it("client 欠落時はクラッシュせずエラーになる", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "bad client" }, 400));
    // await expect(loadSettings("")).rejects.toThrow(); // 実装の Result 型に合わせる
  });
});
```

**TC との対応**

- 上記を [TEST-DESIGN §4.2b](./TEST-DESIGN.md#42b-sharedsrcstoragesheetts--sheetapitestts本番) の TC-001〜013 に 1:1 で増やす
- room 漏洩（TC-008〜009）は **手動 A とセット**

---

## 6. T4 — 送信ペイロード（Phase 1）

**対象**: 将来の `submission.ts`（`ParticipantPage` から抽出）。

**テンプレ**

```ts
import { describe, expect, it } from "vitest";
import { buildSubmission } from "./submission";
import { makeScene } from "./test/fixtures";
import { JUDGMENT_ROUND_COUNT } from "./judgmentFlow";

describe("buildSubmission", () => {
  it("5 問分の rounds がそのまま含まれる", () => {
    const sub = buildSubmission({ /* 画面 state の最小 */ }, "scene-1");
    expect(sub.rounds).toHaveLength(JUDGMENT_ROUND_COUNT);
  });

  it("名前が空白のみのときバリデーションエラーになる", () => {
    expect(() => buildSubmission({ name: "   ", affiliation: "x" }, "scene-1")).toThrow();
  });
});
```

**型の正本**

- 返却は常に `ParticipantSubmission`（[types.ts](../shared/src/types.ts)）

---

## 7. T5 — コンポーネント薄（スモーク）

**対象**: `ParticipantPage.test.tsx`、`AdminPage.test.tsx`（任意）。

**テンプレ**

```ts
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
// import { ParticipantPage } from "./ParticipantPage";

describe("ParticipantPage", () => {
  it("シーン未設定時に警告が表示される", () => {
    // storage を mock するか、fixtures で settings を注入
    // render(<ParticipantPage />);
    // expect(screen.getByRole("alert")).toHaveTextContent("シーンが未設定");
  });
});
```

**やらないこと**

- 5 問フロー全体・iframe レイアウト（T6）
- `validateStep` の網羅（T4 / T1）

---

## 8. T6 — 手動（自動テンプレなし）

自動 `*.test.ts` は書かない。

**チェックリストの正本**

- [TEST-DESIGN.md §8.1](./TEST-DESIGN.md#81-iframe-レイアウト手動e2e)（iframe レイアウト）
- [TEST-DESIGN.md §1.5](./TEST-DESIGN.md#15-入室マルチテナント)（ENTRY-M、ADM-M、SH-07）

---

## 9. 機能 → テンプレ早見

#### 5 枚制限

- **主テンプレ**: T1
- **ファイル（予定）**: `choices.test.ts`
- **TC / ID**: C-01〜04

#### 5 問 step

- **主テンプレ**: T1
- **ファイル（予定）**: `judgmentFlow.test.ts`
- **TC / ID**: JF / JR

#### 設問カード

- **主テンプレ**: T1
- **ファイル（予定）**: `sceneQuestions.test.ts`
- **TC / ID**: SQ

#### 研修コード照合

- **主テンプレ**: T1
- **ファイル（予定）**: `roomEntry.test.ts`
- **TC / ID**: ENTRY

#### 管理者コード

- **主テンプレ**: T1
- **ファイル（予定）**: `adminEntry.test.ts`
- **TC / ID**: ADM-ENTRY

#### local 保存

- **主テンプレ**: T2
- **ファイル（予定）**: `storage.test.ts`
- **TC / ID**: ST

#### Sheet API

- **主テンプレ**: T3
- **ファイル（予定）**: `sheetApi.test.ts`
- **TC / ID**: TC-001〜013、SH

#### 受講者送信形

- **主テンプレ**: T4
- **ファイル（予定）**: `submission.test.ts`
- **TC / ID**: S / CF

#### PDF

- **主テンプレ**: T1 + T5
- **ファイル**: `pdfExport.test.ts`
- **TC / ID**: PDF

#### 入室 UI

- **主テンプレ**: T6 + T1
- **ファイル（予定）**: 手動 + `roomEntry.test`
- **TC / ID**: ENTRY-M

#### iframe 25% / 40%

- **主テンプレ**: T6
- **ファイル（予定）**: —
- **TC / ID**: L-01〜08

---

## 10. 改訂

**0.1**（2026-05-21）— 初版。T1〜T6 テンプレ、API 契約型・`fetch` mock 例

**0.2**（2026-05-21）— 横並び表をやめ、縦書きブロック形式に統一

**0.3**（2026-05-21）— §1 を大→中→小の順に再構成。中粒度（`judgmentFlow` 代表）を追記

**0.4**（2026-05-21）— §1 を 6 ステップ（受け入れ条件→振る舞い→単体）に対応づけ
