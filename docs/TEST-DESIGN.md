# ExpertEye360 テスト設計書

本書は、[TECHNICAL-SPEC.md](./TECHNICAL-SPEC.md) に基づき、**実装ファイルと同じ単位でテストを置く** TDD 設計である。

**機能の洗い出し（テスト単位の一覧）**: [TDD-FEATURE-INVENTORY.md](./TDD-FEATURE-INVENTORY.md)

**永続化（本番）**: [SPREADSHEET-DATA.md](./SPREADSHEET-DATA.md) — Google スプレッドシート + Sheet API

**対応ルール**: 実装 `foo.ts` に対し、同ディレクトリに `foo.test.ts` を置く（コロケーション）。

---

## 1. 文書情報

- **対象**: `shared/src`（最優先）→ `participant-web` / `admin-web`
- **関連仕様**: [TECHNICAL-SPEC.md](./TECHNICAL-SPEC.md) §3.2.3（受講者 iframe レイアウト）、§4（F1〜F8）、§5（永続化）
- **永続化仕様**: [SPREADSHEET-DATA.md](./SPREADSHEET-DATA.md)
- **現状**: テストコード・Vitest は **未導入**。ストレージは `localStorage` のみ実装済み（Sheet API は未実装）

### 1.1 改訂履歴

**0.1**（2026-05-18）— 初版（機能 ID 別）

**0.2**（2026-05-18）— **ソースファイル対応**に再構成

**0.3**（2026-05-18）— **テスト記述の原則**（§2.2）を追加

**0.4**（2026-05-18）— 受講者 iframe レイアウトの受け入れ（§8.1）を追加

**0.5**（2026-05-19）— [TDD-FEATURE-INVENTORY.md](./TDD-FEATURE-INVENTORY.md) を追加（機能一覧の参照先）

**0.6**（2026-05-20）— ベテラン差分（`diff.ts` / F7 差分表示）をスコープ外として削除

**0.7**（2026-05-20）— 横並び表をやめ、縦書きブロック形式に統一

**0.8**（2026-05-20）— 本番永続化をスプレッドシート化（§2.3、§3、§4.2、§7 Phase 2.5）。[SPREADSHEET-DATA.md](./SPREADSHEET-DATA.md) を参照

**0.9**（2026-05-20）— §2.0 現状の問題と解決策、`sheetApi` の room 系 TC、SH 系 ID 対応

**1.0**（2026-05-20）— ブック構成確定（マスター clients + settings/rooms/responses/audit_logs）。rooms・verify の TC 追記

**1.1**（2026-05-20）— §2.4 テスト重要度（A / B / C）を追加。§3・§4・§8 にランク付与

---

## 2. 方針（要約）

**1:1 対応** — 例: `example.ts` ↔ `example.test.ts`

**ロジックの置き場** — 判定・制限は `shared/src`。UI は shared を呼ぶだけ

**5 枚制限** — 各カード配列は最大 5 件（`MAX_CHOICE_CARDS`）

### 2.0 現状の問題と解決策（テスト観点）

[SPREADSHEET-DATA.md §0](./SPREADSHEET-DATA.md) と同一。TDD では **S-01（Sheet API）を先に Red** とし、パスワード UI だけ先に作らない。

**問題 P-01** — 受講者 POST と管理者 GET が別ストレージ → `sheetApi.test.ts` で同一 `client`（+ `room`）の往復を検証

**問題 P-02** — `client` 無しで他社データに触れる → TC: 不正 `client` は 400、正しい `client` のみ settings/responses

**問題 P-03** — 研修回の混線 → TC: `room` 付き POST は他 `room` の一覧に出ない

**解決のテスト対応**

- S-01 → §4.2b TC-001〜006、Phase 2.5
- S-02 → TC-005 + TC-007（`client` クエリ）
- S-03 → §4.2b TC-008〜009、inventory SH-08〜10
- S-04 → `storage` 窓口のみ mock。GAS/シート列名はテストに出さない

### 2.3 永続化とテスト

**本番** — `storage` の裏は Sheet API → スプレッドシート（[SPREADSHEET-DATA.md](./SPREADSHEET-DATA.md)）

**開発・Unit** — `storage/local.ts`（`localStorage`）。既存 `storage.test.ts` はこの層を happy-dom で検証

**Sheet API 層** — `storage/sheet.ts` + `sheetApi.test.ts`（`fetch` を mock）。GAS 実装とは契約テスト（リクエスト URL・body・レスポンス JSON）

**切替** — `VITE_STORAGE_BACKEND=local|sheet`（名称は実装時に確定）

**非同期** — Sheet 実装導入時は `loadSettings` 等を `async` 化する想定。`useAppData` のテストはローディング・エラー表示を追加（Phase 2.5）

### 2.1 テストピラミッド

**Unit**（Vitest）

- 主な対象: `shared/src/*.ts`（storage 除く純関数）

**Integration**（Vitest + happy-dom）

- 主な対象: `storage/local` の `storage.test.ts`

**Integration**（Vitest + `fetch` mock）

- 主な対象: `sheetApi.test.ts`（スプレッドシート API 契約）

**Component**（任意・Vitest + Testing Library）

- 主な対象: `*.test.tsx`（ロジック抽出後は最小）

**E2E**（Playwright）

- 主な対象: `e2e/participant.spec.ts` 等（別フォルダ）

### 2.2 テスト記述の原則

テストコードを書く・レビューする際は、次の条件に従う。

**1. テスト名は日本語で具体的に**

- `it` / `test` の説明文は、**何をしたときに何になるか**が読める日本語にする
- 関数名や TC-ID だけの名前にしない

**2. 1 テスト = 1 振る舞い**

- 1 つの `it` / `test` では **1 つの観点だけ**を検証する
- 複数の独立した期待値を 1 本にまとめない

**3. 入出力・ユーザーから見える振る舞い**

- 内部の呼び出し回数・private 関数・実装の分岐順ではなく、**公開 API の入力と返却値**、または **画面・永続化から見える結果**を assert する

**4. mock は必要な場合だけ**

- 実オブジェクト・実 `localStorage`（happy-dom）・fixtures で足りるなら mock しない
- 外部 I/O・時刻・乱数など **制御が難しい依存だけ**を差し替える

**5. 異常系・境界値を含める**

- 正常系に加え、空配列・上限ちょうど／上限超過・破損データ・未選択など **仕様上ありうる端と失敗**をケース（§4）に載せ、テストで担保する

#### テスト名の例（`example.test.ts`）

避ける: `limitChoices works`  
推奨: `選択肢が6件のとき、先頭5件だけが残る`

避ける: `TC-001`  
推奨: `気づきカードが6件登録されているとき、保存・表示は5件に切り詰められる`

避ける: `calls slice`  
推奨: `カードが5件以下のとき、件数と内容はそのまま返る`

#### 1 テスト 1 振る舞いの例

```ts
// 悪い例: 正常系と境界を1本にまとめている
it("limitChoices", () => {
  expect(limitChoices(six)).toHaveLength(5);
  expect(limitChoices(three)).toHaveLength(3);
});

// 良い例: ケースごとに分割（§4 の TC-001 / TC-002 に対応）
it("選択肢が6件のとき、先頭5件だけが残る", () => { /* ... */ });
it("選択肢が5件以下のとき、件数と内容はそのまま返る", () => { /* ... */ });
```

#### 振る舞いベースの assert の例

**`shared` 純関数**

- 確認する: `limitChoices` の返却配列・件数
- 避ける: `slice` が呼ばれたか、内部変数名

**`storage`**

- 確認する: `loadSettings` の返却、`appendResponse` 後の一覧順
- 避ける: `JSON.parse` の呼び出し回数

**UI（任意）**

- 確認する: ラベル表示・ボタン無効・エラーメッセージ
- 避ける: 子コンポーネントの props の細部

#### mock を使う／使わないの目安

**使わない（優先）**

- `limitChoices`, `normalizeScene` など純関数
- happy-dom 上の `localStorage` による `storage`
- `test/fixtures.ts` の `makeScene` / `makeSubmission`

**使う（例外的）**

- **Sheet API** の `fetch`（`sheetApi.test.ts` でレスポンス body のみ検証。GAS 本体は E2E または手動）
- `Date.now` 固定が必要な「作成日時の表示」
- ブラウザ API がテスト環境に無い場合のみ

#### 異常系・境界値の扱い

- §4 の各ファイルの TC に、**正常・境界・異常**を明示する（既存 TC もこの観点で不足があれば追記する）
- 境界の例: カード **5 件ちょうど** / **6 件**、確信度 **1 と 5**、settings の **空 `scenes`**、responses の **破損 JSON**
- 異常系は「クラッシュしない」「デフォルトまたは空で復帰する」など、**ユーザーまたは運用者から見える結果**で書く（例外型の assert だけに閉じない）

### 2.4 テスト重要度（A / B / C）

リリース前・受け入れ時に **誰がどこまで確認するか** を分ける。§4 の各ブロック・TC に **重要度** を付与する（ファイル既定と TC 個別が異なる場合は TC を優先）。

#### ランクの定義

**A — 絶対に人間が確認する**

- 自動テスト・AI レビューだけでは不十分と判断するもの
- 目視（レイアウト・帯内収まり）、実ブラウザ 2 端末、本番に近い API＋スプレッドシート結合
- 研修運用で障害になる経路（受講者送信 → 講師が見えない、他社・他研修回への漏洩）

**B — ざっくり人間が確認する**

- Vitest で Green にしたうえで、**リリース前に一度は人間が通す**
- 主要 API 契約・送信ペイロード・管理者の回答表示など、仕様の芯
- 詳細な境界は自動、人間は代表ケース・ステージングでサンプリング

**C — AI・自動チェックに寄せる**

- 純関数・localStorage・fixtures・薄いスモーク
- CI の `npm test` と AI によるテスト追加・レビューで足りる
- 人間は **テスト失敗時** または **大きな仕様変更時** にのみ関与

#### 運用上の目安

| ランク | 実施タイミング | 担当の想定 |
| --- | --- | --- |
| A | マイルストーン完了時・本番前・3DVista 埋め込み後 | プロダクトオーナー／講師代表／開発 |
| B | Phase 完了時・PR マージ前（ステージング） | 開発＋レビュアが代表操作 |
| C | 毎コミット・CI Green | 開発＋AI（人間はログ確認） |

#### 重要度サマリ（ファイル単位）

| ファイル / 区分 | 既定 | 備考 |
| --- | --- | --- |
| `choices.test.ts` | C | 5 枚制限の純関数 |
| `storage.test.ts`（local） | C | 開発フォールバック |
| `sheetApi.test.ts` | B | TC-008〜009 のみ **A**（§4.2b） |
| `seed.test.ts` | C | デモ契約 |
| `submission.test.ts` | B | TC-002 のみ **A**（送信形） |
| `criteriaOrder.test.ts` | C | 並べ替え UI 未実装時は優先度低 |
| `normalizeScene.test.ts` | C | 管理者保存の正規化 |
| `ojtExport.test.ts` | C | F8・未実装寄り |
| `fixtures.ts` | — | 補助（ランク対象外） |
| `useAppData.test.ts` | C | 配線のみ |
| `ParticipantPage.test.tsx` | C | スモーク。5 問フローは **手動 A**（§4.11） |
| `AdminPage.test.tsx` | B | TC-002（回答表示）が芯 |
| §8.1 レイアウト L-01〜L-06 | A | すべて目視 |
| Phase 2.5 手動 SH-07 | A | 受講者→管理者の実結合 |

---

## 3. ファイル対応一覧

### 3.1 `shared/src`（ドメイン・永続化）

#### [types.ts](../shared/src/types.ts)

- **テスト**: なし（型のみ）
- **状態**: —
- **関連機能**: 全般

#### [seed.ts](../shared/src/seed.ts)

- **テスト**: [seed.test.ts](../shared/src/seed.test.ts)
- **状態**: 未
- **重要度**: **C**
- **関連機能**: F1（初期データ）

#### [choices.ts](../shared/src/choices.ts)

- **テスト**: [choices.test.ts](../shared/src/choices.test.ts)
- **状態**: 未
- **重要度**: **C**
- **関連機能**: F2〜F5（5 枚制限）

#### [storage.ts](../shared/src/storage.ts)

- **テスト**: [storage.test.ts](../shared/src/storage.test.ts)（local 実装）
- **状態**: 未（local）。Sheet 層は未実装
- **重要度**: **C**（local）
- **関連機能**: F1, F7
- **備考**: 本番は [SPREADSHEET-DATA.md](./SPREADSHEET-DATA.md)。`storage/local.ts` + `storage/sheet.ts` + `storage/index.ts` へ分割予定

#### storage/sheet.ts（新規）

- **テスト**: `sheetApi.test.ts`
- **状態**: 未
- **重要度**: **B**（TC-008〜009 は **A**）
- **関連機能**: F1, F7（本番永続化）
- **備考**: `fetch` で GAS Web App。`clientId` は URL クエリから

#### submission.ts（新規）

- **テスト**: `submission.test.ts`
- **状態**: 未
- **重要度**: **B**（TC-002 は **A**）
- **関連機能**: F2〜F6, FLOW

#### criteriaOrder.ts（新規）

- **テスト**: `criteriaOrder.test.ts`
- **状態**: 未
- **重要度**: **C**
- **関連機能**: F4

#### normalizeScene.ts（新規）

- **テスト**: `normalizeScene.test.ts`
- **状態**: 未
- **重要度**: **C**
- **関連機能**: F1

#### ojtExport.ts（新規）

- **テスト**: `ojtExport.test.ts`
- **状態**: 未
- **重要度**: **C**
- **関連機能**: F8

#### test/fixtures.ts（新規・補助）

- **テスト**: なし（各 `*.test.ts` から import）
- **状態**: 未
- **用途**: 全 test で利用

### 3.2 `participant-web/src`

#### [hooks/useAppData.ts](../participant-web/src/hooks/useAppData.ts)

- **テスト**: `hooks/useAppData.test.ts`
- **状態**: 未
- **重要度**: **C**
- **備考**: storage のラッパ。結合寄り

#### [pages/ParticipantPage.tsx](../participant-web/src/pages/ParticipantPage.tsx)

- **テスト**: `pages/ParticipantPage.test.tsx`
- **状態**: 未
- **重要度**: **C**（Vitest スモーク）。**5 問フロー手動は A**（§4.11）
- **備考**: ロジックは shared へ抽出後はスモークのみ

#### main.tsx / App.tsx

- **テスト**: なし
- **備考**: テスト対象外

### 3.3 `admin-web/src`

#### [hooks/useAppData.ts](../admin-web/src/hooks/useAppData.ts)

- **テスト**: `hooks/useAppData.test.ts`
- **状態**: 未
- **重要度**: **C**
- **備考**: participant と同型

#### [pages/AdminPage.tsx](../admin-web/src/pages/AdminPage.tsx)

- **テスト**: `pages/AdminPage.test.tsx`
- **状態**: 未
- **重要度**: **B**
- **備考**: 保存時 `normalizeScene` 利用後は薄く

#### main.tsx / App.tsx

- **テスト**: なし
- **備考**: テスト対象外

---

## 4. テストケース（ファイル別）

以下、テストケース ID は **`ファイル連番`** とする（例: `choices.test.ts` 内の `TC-001`）。

各 TC に **重要度**（§2.4）を付ける。ファイルに **重要度: X** とある場合、TC に個別指定がなければそのランクに従う。

---

### 4.1 `shared/src/choices.ts` → `choices.test.ts`

**重要度**: **C**（§2.4）

**テスト対象の公開 API**

- `MAX_CHOICE_CARDS` — 定数（値 `5`）
- `limitChoices(items)` — 関数

#### TC-001

- **内容**: 6 件 → 5 件
- **入力**: 長さ 6 の配列
- **期待**: 長さ 5、先頭 5 要素一致

#### TC-002

- **内容**: 5 件以下はそのまま
- **入力**: 長さ 3
- **期待**: 長さ 3、全要素一致

#### TC-003

- **内容**: 空配列
- **入力**: `[]`
- **期待**: `[]`

#### TC-004

- **内容**: 定数値
- **入力**: —
- **期待**: `MAX_CHOICE_CARDS === 5`

**関連仕様**: F2〜F5（表示・保存の上限）

---

### 4.2 `shared/src/storage/local.ts` → `storage.test.ts`（開発用）

**重要度**: **C**（§2.4）— 本番の正は §4.2b

**テスト対象の公開 API**（関数名は `storage.ts` 窓口経由で同一）

- `loadSettings` — happy-dom + localStorage
- `saveSettings` — 同上
- `loadResponses` — 同上
- `saveResponses` — 同上
- `appendResponse` — 同上
- `resetDemoData` — 同上

#### TC-001

- **内容**: 初回 `loadSettings`
- **期待**: デモ seed 相当が返る

#### TC-002

- **内容**: `saveSettings` → `loadSettings`
- **期待**: 保存内容が一致

#### TC-003

- **内容**: `appendResponse`
- **期待**: 先頭が最新、`loadResponses` で取得

#### TC-004

- **内容**: 破損 JSON
- **期待**: デフォルトまたは空で落ちない

#### TC-005

- **内容**: `resetDemoData`
- **期待**: settings が初期化、responses は空

#### TC-006

- **内容**: `saveSettings` 時
- **期待**: `expertEye360-storage` イベント発火

**関連仕様**: F1, F7（開発フォールバック）

---

### 4.2b `shared/src/storage/sheet.ts` → `sheetApi.test.ts`（本番）

**重要度**: ファイル既定 **B**。TC-008〜009 は **A**（研修回の漏洩防止）

契約は [SPREADSHEET-DATA.md](./SPREADSHEET-DATA.md) §4。`fetch` を mock し、**リクエストとパース結果**を検証する。

#### TC-001

- **重要度**: B
- **内容**: `GET settings?client=acme` 成功
- **期待**: `AppSettings` 形にパースできる

#### TC-002

- **重要度**: B
- **内容**: `POST settings` 成功
- **期待**: 同一 `client` で再 GET すると送信 JSON と一致

#### TC-003

- **重要度**: B
- **内容**: `GET responses?client=acme`
- **期待**: 配列・`created_at` 降順（または API がソート済みであること）

#### TC-004

- **重要度**: B
- **内容**: `POST responses`（1 件追加）
- **期待**: 返却または再 GET で先頭に新規行

#### TC-005

- **重要度**: B
- **内容**: `client` 欠落・不正
- **期待**: ユーザー向けエラー（throw または Result）。クラッシュしない

#### TC-006

- **重要度**: B
- **内容**: API 500 / ネットワーク失敗
- **期待**: 再試行可能なエラー表示用のエラー型（実装時に固定）

#### TC-007

- **重要度**: B
- **内容**: 全リクエストに `client` クエリが付く
- **期待**: `fetch` の URL に `client=...` を含む（S-02）

#### TC-008

- **重要度**: **A**
- **内容**: `GET responses?client=acme&room=room-a` と `room-b` で一覧が分離
- **期待**: room-a の POST が room-b 一覧に含まれない（S-03）

#### TC-009

- **重要度**: **A**
- **内容**: 不正 `room` または未登録コード
- **期待**: エラー。クラッシュしない（S-03 / P-03 補助）

#### TC-010

- **重要度**: B
- **内容**: `POST rooms/verify` で正しい accessCode
- **期待**: 成功し `roomId` が返る（`rooms` シート照合）

#### TC-011

- **重要度**: C
- **内容**: 管理者 `POST settings` 成功
- **期待**: `audit_logs` に `settings.save` 相当が追記される（実装時に action 名固定）

**関連仕様**: F1, F7（本番）。ST / SH 系 ID（inventory）と対応付ける。シート構成は [SPREADSHEET-DATA.md §3](./SPREADSHEET-DATA.md)

---

### 4.3 `shared/src/seed.ts` → `seed.test.ts`

**重要度**: **C**（§2.4）

**テスト対象**

- `DEFAULT_SETTINGS` — デモデータの形

#### TC-001

- **内容**: シーンが 1 件以上
- **期待**: `scenes.length >= 1`

#### TC-002

- **内容**: 各カード配列は最大 5 件
- **期待**: `attentionLabels` 等の `length <= 5`

#### TC-003

- **内容**: 必須フィールド存在
- **期待**: `veteranTemplate`, `tourUrl` 等

#### TC-004

- **内容**: 深いコピーで変異しない（任意）
- **期待**: import 元を mutate しても再 import で不変

**関連仕様**: F1（デモ）、TC-COM と整合

---

### 4.4 `shared/src/types.ts`

**現状** — 実行時テストなし（型定義のみ）

**将来** — バリデーション（Zod 等）を `schema.ts` に分離した場合 → `schema.test.ts`

---

### 4.5 `shared/src/submission.ts`（新規）→ `submission.test.ts`

**重要度**: ファイル既定 **B**。TC-002 は **A**

**抽出元（現状ロジックの所在）**

- `participant-web/src/pages/ParticipantPage.tsx`（toggle, submit, confidence）

**予定 API（例）**

- `toggleLabel(list, label)` — F2, F3, F5 複数選択
- `clampConfidence(n)` — F6（1〜5）
- `buildSubmission(state, sceneId)` — 送信ペイロード組み立て
- `anonymousName(name)` — 無記名時「（無記名）」

#### TC-001

- **内容**: トグルで追加・削除
- **関連**: F2

#### TC-002

- **重要度**: **A**
- **内容**: `buildSubmission` が `ParticipantSubmission` 形
- **関連**: FLOW

#### TC-003

- **内容**: 空名前 → 無記名
- **関連**: FLOW

#### TC-004

- **内容**: `confidenceLevel` 範囲外を拒否/補正
- **関連**: F6

#### TC-005

- **内容**: `awarenessNote` 空許容
- **関連**: F3

---

### 4.6 `shared/src/criteriaOrder.ts`（新規）→ `criteriaOrder.test.ts`

**重要度**: **C**（§2.4）

**抽出元**: `ParticipantPage.tsx` の `syncCriteriaOrder`, `move`

#### TC-001

- **内容**: 選択追加で順序末尾に追加
- **関連**: F4

#### TC-002

- **内容**: 選択解除で順序から削除
- **関連**: F4

#### TC-003

- **内容**: `moveUp` / `moveDown`
- **関連**: F4

#### TC-004

- **内容**: 境界で move 無効
- **関連**: F4

---

### 4.7 `shared/src/normalizeScene.ts`（新規）→ `normalizeScene.test.ts`

**重要度**: **C**（§2.4）

**抽出元**: `admin-web` のテキストエリア保存

#### TC-001

- **内容**: 行配列 → 各カード `limitChoices` 適用
- **関連**: F1

#### TC-002

- **内容**: 空行除去
- **関連**: F1

#### TC-003

- **内容**: `veteranTemplate` 各配列も正規化
- **関連**: F1

---

### 4.8 `shared/src/ojtExport.ts`（新規）→ `ojtExport.test.ts`

**重要度**: **C**（§2.4）

#### TC-001

- **内容**: `veteranTemplate.ojtChecklist` + 回答内容 → OJT 用テキスト配列
- **関連**: F8

#### TC-002

- **内容**: 空チェックリストでもクラッシュしない
- **関連**: F8

---

### 4.9 `shared/src/test/fixtures.ts`（補助）

- `makeScene(overrides?)` — `submission.test.ts`, `ojtExport.test.ts` で利用
- `makeSubmission(overrides?)` — 同上
- `makeSettings(overrides?)` — `storage.test.ts` で利用

テスト対象ファイルではない。各 `*.test.ts` から import する。

---

### 4.10 `participant-web/src/hooks/useAppData.ts` → `useAppData.test.ts`

**重要度**: **C**（§2.4）

#### TC-001

- **内容**: 初期 render で settings / responses が読める
- **期待**: storage mock

#### TC-002

- **内容**: `addResponse` 後に responses 更新
- **期待**: —

#### TC-003

- **内容**: `expertEye360-storage` で refresh
- **期待**: —

**方針**: ドメインは `storage.test.ts` で担保。ここは React フックの配線のみ。

---

### 4.11 `participant-web/src/pages/ParticipantPage.tsx` → `ParticipantPage.test.tsx`

**重要度**: Vitest は **C**。下記 **手動受け入れは A**

#### TC-001

- **重要度**: C
- **内容**: シーンなしで警告表示
- **方針**: スモーク

#### TC-002

- **重要度**: C
- **内容**: step 0 → 1 に進める
- **方針**: スモーク（任意）

**方針**: ステップ・選択の詳細は `submission.test.ts` / `criteriaOrder.test.ts` に寄せ、UI テストは最小。

**受講者 5 問フロー（手動・受け入れ）— 重要度: A**

[TECHNICAL-SPEC.md §4.3](TECHNICAL-SPEC.md#43-受講者回答フロー5問--4画面サイクル) に従う。**5 問 = 4 画面サイクル × 5 回**。一言メモの `next` で次ラウンドの気づきカードへ進むこと。**人間が必ず通す**（embed-preview または 3DVista 埋め込み）。

**事前（名前・所属）**

- 画面順: step 0

**1〜5 各回**

- 画面順: 気づき → 共有 → 判断基準 → 一言メモ → **次の気づき**
- 現行（2026-05-19）: 1 回分のみ・順序ずれ（TECHNICAL-SPEC §4.3.5）

**締め（確信度 → 送信）**

- 画面順: step 9〜11

---

### 4.12 `admin-web/src/pages/AdminPage.tsx` → `AdminPage.test.tsx`

**重要度**: ファイル既定 **B**

#### TC-001

- **重要度**: C
- **内容**: 保存で `normalizeScene` 経由の 5 件制限
- **方針**: `normalizeScene.test.ts` と併用

#### TC-002

- **重要度**: **B**（ステージングでは **A** とセットで受講者送信と確認）
- **内容**: 回答一覧・詳細が `getSubmissionRounds` 結果と一致
- **方針**: F7 スモーク

---

## 5. 機能 ID ↔ ファイル対応（参照用）

仕様トレース用。テスト実装の主キーは **§3・§4 のファイル** とする。

**F1** — `normalizeScene.test.ts`, `storage.test.ts`, `seed.test.ts`

**F2** — `submission.test.ts`, `choices.test.ts`

**F3** — `submission.test.ts`

**F4** — `criteriaOrder.test.ts`

**F5** — `submission.test.ts`, `choices.test.ts`

**F6** — `submission.test.ts`

**F7** — `storage.test.ts`, `sheetApi.test.ts`, `AdminPage.test.tsx`（薄）

**F8** — `ojtExport.test.ts`

---

## 6. ディレクトリ構成（完成形）

```
shared/src/
├── types.ts
├── seed.ts
├── seed.test.ts
├── choices.ts
├── choices.test.ts
├── storage.ts                 # 窓口（切替）
├── storage/
│   ├── local.ts
│   ├── sheet.ts               # 新規（本番）
│   └── index.ts
├── storage.test.ts            # local
├── sheetApi.test.ts           # 新規
├── submission.ts              # 新規
├── submission.test.ts
├── criteriaOrder.ts           # 新規
├── criteriaOrder.test.ts
├── normalizeScene.ts          # 新規
├── normalizeScene.test.ts
├── ojtExport.ts               # 新規
├── ojtExport.test.ts
└── test/
    └── fixtures.ts

participant-web/src/
├── hooks/
│   ├── useAppData.ts
│   └── useAppData.test.ts
└── pages/
    ├── ParticipantPage.tsx
    └── ParticipantPage.test.tsx

admin-web/src/
├── hooks/
│   ├── useAppData.ts
│   └── useAppData.test.ts
└── pages/
    ├── AdminPage.tsx
    └── AdminPage.test.tsx
```

---

## 7. TDD 実施順（ファイル単位）

**1.** `choices.test.ts` — 既存実装・依存なし

**2.** `test/fixtures.ts` — 以降のテストで共用

**3.** `submission.test.ts` — UI からロジック抽出と同時

**4.** `criteriaOrder.test.ts` — 同上

**5.** `storage.test.ts` — Integration（local）

**6.** `sheetApi.test.ts` — Sheet API 契約（本番永続化）

**7.** `seed.test.ts` — デモデータ契約

**8.** `normalizeScene.test.ts` — 管理者保存

**9.** `useAppData.test.ts` — 各 Web（async storage 対応後）

**10.** `*.test.tsx` — スモークのみ

**11.** `ojtExport.test.ts` — F8

---

## 8. Phase 完了チェックリスト（ファイル別）

### Phase 0 — 基盤

- [ ] ルート `vitest.config.ts` + `npm test`
- [ ] `choices.test.ts` 全 TC Green

### Phase 1 — shared 拡張

- [ ] `submission.test.ts` Green（抽出完了）
- [ ] `criteriaOrder.test.ts` Green（抽出完了）
- [ ] React が shared のみ使用（重複ロジック削除）

### Phase 2 — 永続化・管理（local）

- [ ] `storage.test.ts` Green
- [ ] `seed.test.ts` Green
- [ ] `normalizeScene.test.ts` Green

### Phase 2.5 — スプレッドシート永続化（本番）

- [ ] **B** — GAS（または API）を [SPREADSHEET-DATA.md](./SPREADSHEET-DATA.md) §0〜4 に沿って用意
- [ ] **B** — `sheetApi.test.ts` を **先に** Red → Green（TC-001〜007, TC-010〜011 は CI）
- [ ] **A** — `sheetApi` TC-008〜009 Green 後、人間が room 漏洩の代表操作を確認
- [ ] **B** — `storage/sheet.ts` + `VITE_STORAGE_BACKEND` で本番切替
- [ ] **A** — 受講者送信 → 管理者で同一 `client`（+ `room`）の回答が見える（手動・SH-07）
- [ ] **A** — 別 `client` / 別 `room` に漏れない（TC-005 の手動確認 + TC-008〜009）

### Phase 3 — UI・OJT

- [ ] `useAppData.test.ts`（両 Web）
- [ ] `ParticipantPage.test.tsx` / `AdminPage.test.tsx` スモーク
- [ ] `ojtExport.test.ts`（任意）

---

## 8.1 受講者 iframe レイアウト（手動・E2E）

**重要度**: 本節はすべて **A**（§2.4）— 人間の目視が必須。Playwright 化後もリリース前に人間が代表解像度で再確認する。

[TECHNICAL-SPEC.md](./TECHNICAL-SPEC.md) **§3.2.3** に従う。Vitest 化は Phase 3 以降の Playwright 想定（自動化後も L-01〜L-05 は **A** のサンプリング対象）。

#### L-01

- **重要度**: A
- **手順**: `embed-preview.html` を開き、ブラウザウィンドウの高さを大きく／小さく変える
- **期待**: 全 step で帯内に収まり、**帯内スクロールバーが出ない**

#### L-02

- **重要度**: A
- **手順**: 開発者ツールで iframe 要素の `height` を 80px〜400px 程度まで変更
- **期待**: 文字・カード・入力が比例して縮み、はみ出さない

#### L-03

- **重要度**: A
- **手順**: step 0（名前・所属）表示
- **期待**: 白枠の**上余白と下余白（ナビ直前）が視覚的に同程度**

#### L-04

- **重要度**: A
- **手順**: 5 問フロー（§4.3）
- **期待**: 各ラウンドで気づき→共有→判断基準→一言メモの順。一言メモの `next` で**次の気づき**（5 回目後は確信度）

#### L-05

- **重要度**: A
- **手順**: カード選択の反転
- **期待**: 選択済みカードは他カード**ホバーでは解除されない**。別カード選択時のみ切り替わる

#### L-06

- **重要度**: C（grep / CI スクリプト可。失敗時のみ人間）
- **手順**: `participant-app.css` に `vh` / `25vh` が無いこと（`cqh`/`cqw` と iframe 100% のみ）
- **期待**: 静的確認または grep

---

## 9. CI・未決定

**CI** — `npm test` = `vitest run`（`shared/**/*.test.ts` を含む）

**カバレッジ** — Phase 1 以降 `shared/src` 行 80% 目安

**F3 メモ上限** — 確定後 `submission.test.ts` に TC 追加

**E2E** — `e2e/` に別設計（本書のファイル対応外）

---

## 10. 参照

- [TECHNICAL-SPEC.md](./TECHNICAL-SPEC.md)
- [README.md](../README.md)
