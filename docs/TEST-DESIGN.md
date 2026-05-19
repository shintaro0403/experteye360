# ExpertEye360 テスト設計書

本書は、[TECHNICAL-SPEC.md](./TECHNICAL-SPEC.md) に基づき、**実装ファイルと同じ単位でテストを置く** TDD 設計である。

**対応ルール**: 実装 `foo.ts` に対し、同ディレクトリに `foo.test.ts` を置く（コロケーション）。

---

## 1. 文書情報

| 項目 | 内容 |
| --- | --- |
| 対象 | `shared/src`（最優先）→ `participant-web` / `admin-web` |
| 関連仕様 | [TECHNICAL-SPEC.md](./TECHNICAL-SPEC.md) §3.2.3（受講者 iframe レイアウト）、§4（F1〜F9）、§4.1（差分の非スコア化） |
| 現状 | テストコード・Vitest は **未導入** |

### 1.1 改訂履歴

| 版 | 日付 | 内容 |
| --- | --- | --- |
| 0.1 | 2026-05-18 | 初版（機能 ID 別） |
| 0.2 | 2026-05-18 | **ソースファイル対応**に再構成 |
| 0.3 | 2026-05-18 | **テスト記述の原則**（§2.2）を追加 |
| 0.4 | 2026-05-18 | 受講者 iframe レイアウトの受け入れ（§3）を追加 |

---

## 2. 方針（要約）

| 原則 | 内容 |
| --- | --- |
| 1:1 対応 | 例: `example.ts` ↔ `example.test.ts` |
| ロジックの置き場 | 判定・差分・制限は `shared/src`。UI は shared を呼ぶだけ |
| 差分 | スコア化しない（§4.1）。期待値は配列・文言 |
| 5 枚制限 | 各カード配列は最大 5 件（`MAX_CHOICE_CARDS`） |

### 2.1 テストピラミッド

| 層 | ツール（予定） | 主な対象ファイル |
| --- | --- | --- |
| Unit | Vitest | `shared/src/*.ts`（storage 除く純関数） |
| Integration | Vitest + happy-dom | `storage.test.ts` |
| Component（任意） | Vitest + Testing Library | `*.test.tsx`（ロジック抽出後は最小） |
| E2E | Playwright | `e2e/participant.spec.ts` 等（別フォルダ） |

### 2.2 テスト記述の原則

テストコードを書く・レビューする際は、次の条件に従う。

| # | 条件 | 内容 |
| --- | --- | --- |
| 1 | **テスト名は日本語で具体的に** | `it` / `test` の説明文は、**何をしたときに何になるか**が読める日本語にする。関数名や TC-ID だけの名前にしない。 |
| 2 | **1 テスト = 1 振る舞い** | 1 つの `it` / `test` では **1 つの観点だけ**を検証する。複数の独立した期待値を 1 本にまとめない。 |
| 3 | **入出力・ユーザーから見える振る舞い** | 内部の呼び出し回数・private 関数・実装の分岐順ではなく、**公開 API の入力と返却値**、または **画面・永続化から見える結果**を assert する。 |
| 4 | **mock は必要な場合だけ** | 実オブジェクト・実 `localStorage`（happy-dom）・fixtures で足りるなら mock しない。外部 I/O・時刻・乱数など **制御が難しい依存だけ**を差し替える。 |
| 5 | **異常系・境界値を含める** | 正常系に加え、空配列・上限ちょうど／上限超過・破損データ・未選択・比較不能など **仕様上ありうる端と失敗**をケース表（§4）に載せ、テストで担保する。 |

#### テスト名の例（`example.test.ts`）

| 避ける | 推奨 |
| --- | --- |
| `limitChoices works` | `選択肢が6件のとき、先頭5件だけが残る` |
| `TC-001` | `気づきカードが6件登録されているとき、保存・表示は5件に切り詰められる` |
| `calls slice` | `カードが5件以下のとき、件数と内容はそのまま返る` |

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

| 層 | 確認するもの（例） | 避けるもの（例） |
| --- | --- | --- |
| `shared` 純関数 | `computeDiff` の返却オブジェクトの配列・文言 | `slice` が呼ばれたか、内部変数名 |
| `storage` | `loadSettings` の返却、`appendResponse` 後の一覧順 | `JSON.parse` の呼び出し回数 |
| UI（任意） | ラベル表示・ボタン無効・エラーメッセージ | 子コンポーネントの props の細部 |

#### mock を使う／使わないの目安

| 使わない（優先） | 使う（例外的） |
| --- | --- |
| `limitChoices`, `computeDiff`, `normalizeScene` など純関数 | 未実装の HTTP クライアント（将来 API 化時） |
| happy-dom 上の `localStorage` による `storage` | `Date.now` 固定が必要な「作成日時の表示」 |
| `test/fixtures.ts` の `makeScene` / `makeSubmission` | ブラウザ API がテスト環境に無い場合のみ |

#### 異常系・境界値の扱い

- §4 の各ファイルの TC 表に、**正常・境界・異常**を明示する（既存 TC もこの観点で不足があれば追記する）。
- 境界の例: カード **5 件ちょうど** / **6 件**、確信度 **1 と 5**、差分で **共通判断基準が 0 件**、settings の **空 `scenes`**、responses の **破損 JSON**。
- 異常系は「クラッシュしない」「デフォルトまたは空で復帰する」など、**ユーザーまたは運用者から見える結果**で書く（例外型の assert だけに閉じない）。

---

## 3. ファイル対応一覧

### 3.1 `shared/src`（ドメイン・永続化）

| 実装ファイル | テストファイル | 状態 | 関連機能 |
| --- | --- | --- | --- |
| [types.ts](../shared/src/types.ts) | —（型のみ） | — | 全般 |
| [seed.ts](../shared/src/seed.ts) | [seed.test.ts](../shared/src/seed.test.ts) | 未 | F1（初期データ） |
| [choices.ts](../shared/src/choices.ts) | [choices.test.ts](../shared/src/choices.test.ts) | 未 | F2〜F5（5 枚制限） |
| [diff.ts](../shared/src/diff.ts) | [diff.test.ts](../shared/src/diff.test.ts) | 未 | F7 |
| [storage.ts](../shared/src/storage.ts) | [storage.test.ts](../shared/src/storage.test.ts) | 未 | F1, F8 |
| `submission.ts`（新規） | `submission.test.ts` | 未 | F2〜F6, FLOW |
| `criteriaOrder.ts`（新規） | `criteriaOrder.test.ts` | 未 | F4 |
| `normalizeScene.ts`（新規） | `normalizeScene.test.ts` | 未 | F1 |
| `ojtExport.ts`（新規） | `ojtExport.test.ts` | 未 | F9 |
| `test/fixtures.ts`（新規） | —（テスト補助） | 未 | 全 test で利用 |

### 3.2 `participant-web/src`

| 実装ファイル | テストファイル | 状態 | 備考 |
| --- | --- | --- | --- |
| [hooks/useAppData.ts](../participant-web/src/hooks/useAppData.ts) | `hooks/useAppData.test.ts` | 未 | storage のラッパ。結合寄り |
| [pages/ParticipantPage.tsx](../participant-web/src/pages/ParticipantPage.tsx) | `pages/ParticipantPage.test.tsx` | 未 | ロジックは shared へ抽出後はスモークのみ |
| `main.tsx` / `App.tsx` | — | — | テスト対象外 |

### 3.3 `admin-web/src`

| 実装ファイル | テストファイル | 状態 | 備考 |
| --- | --- | --- | --- |
| [hooks/useAppData.ts](../admin-web/src/hooks/useAppData.ts) | `hooks/useAppData.test.ts` | 未 | participant と同型 |
| [pages/AdminPage.tsx](../admin-web/src/pages/AdminPage.tsx) | `pages/AdminPage.test.tsx` | 未 | 保存時 `normalizeScene` 利用後は薄く |
| `main.tsx` / `App.tsx` | — | — | テスト対象外 |

---

## 4. テストケース（ファイル別）

以下、テストケース ID は **`ファイル連番`** とする（例: `choices.test.ts` 内の `TC-001`）。

---

### 4.1 `shared/src/choices.ts` → `choices.test.ts`

**テスト対象の公開 API**

| シンボル | 種別 |
| --- | --- |
| `MAX_CHOICE_CARDS` | 定数（値 `5`） |
| `limitChoices(items)` | 関数 |

| ID | 内容 | 入力 | 期待 |
| --- | --- | --- | --- |
| TC-001 | 6 件 → 5 件 | 長さ 6 の配列 | 長さ 5、先頭 5 要素一致 |
| TC-002 | 5 件以下はそのまま | 長さ 3 | 長さ 3、全要素一致 |
| TC-003 | 空配列 | `[]` | `[]` |
| TC-004 | 定数値 | — | `MAX_CHOICE_CARDS === 5` |

**関連仕様**: F2〜F5（表示・保存の上限）

---

### 4.2 `shared/src/diff.ts` → `diff.test.ts`

**テスト対象の公開 API**

| シンボル | 種別 |
| --- | --- |
| `DiffSummary` | 型 |
| `computeDiff(scene, sub)` | 関数 |

**fixtures**: `test/fixtures.ts` の `makeScene`, `makeSubmission`

| ID | 内容 | 期待 |
| --- | --- | --- |
| TC-001 | ベテラン注目の未選択 | `missedAttention` に未選択分のみ |
| TC-002 | 受講者のみの注目 | `extraAttention` に余剰分のみ |
| TC-003 | ベテラン判断の未選択 | `missedCriteria` |
| TC-004 | 判断順が同一 | `criteriaOrderHint` に「同じ並び」を含む |
| TC-005 | 判断順が異なる | テンプレ順・受講者順の両方をヒントに含む |
| TC-006 | 推奨行動の未選択 | `missedRecommendedActions` |
| TC-007 | 返却にスコアフィールドなし | キーは `DiffSummary` 定義のみ |

**関連仕様**: F7、§4.1（非スコア化）

---

### 4.3 `shared/src/storage.ts` → `storage.test.ts`

**テスト対象の公開 API**

| シンボル | 備考 |
| --- | --- |
| `loadSettings` | happy-dom + localStorage |
| `saveSettings` | 同上 |
| `loadResponses` | 同上 |
| `saveResponses` | 同上 |
| `appendResponse` | 同上 |
| `resetDemoData` | 同上 |

| ID | 内容 | 期待 |
| --- | --- | --- |
| TC-001 | 初回 `loadSettings` | デモ seed 相当が返る |
| TC-002 | `saveSettings` → `loadSettings` | 保存内容が一致 |
| TC-003 | `appendResponse` | 先頭が最新、`loadResponses` で取得 |
| TC-004 | 破損 JSON | デフォルトまたは空で落ちない |
| TC-005 | `resetDemoData` | settings が初期化、responses は空 |
| TC-006 | `saveSettings` 時 | `expertEye360-storage` イベント発火 |

**関連仕様**: F1, F8

---

### 4.4 `shared/src/seed.ts` → `seed.test.ts`

**テスト対象**

| シンボル | 備考 |
| --- | --- |
| `DEFAULT_SETTINGS` | デモデータの形 |

| ID | 内容 | 期待 |
| --- | --- | --- |
| TC-001 | シーンが 1 件以上 | `scenes.length >= 1` |
| TC-002 | 各カード配列は最大 5 件 | `attentionLabels` 等の `length <= 5` |
| TC-003 | 必須フィールド存在 | `veteranTemplate`, `tourUrl` 等 |
| TC-004 | 深いコピーで変異しない | import 元を mutate しても再 import で不変（任意） |

**関連仕様**: F1（デモ）、TC-COM と整合

---

### 4.5 `shared/src/types.ts`

| 方針 | 内容 |
| --- | --- |
| 現状 | 実行時テストなし（型定義のみ） |
| 将来 | バリデーション（Zod 等）を `schema.ts` に分離した場合 → `schema.test.ts` |

---

### 4.6 `shared/src/submission.ts`（新規）→ `submission.test.ts`

**抽出元（現状ロジックの所在）**

- `participant-web/src/pages/ParticipantPage.tsx`（toggle, submit, confidence）

**予定 API（例）**

| シンボル | 用途 |
| --- | --- |
| `toggleLabel(list, label)` | F2, F3, F5 複数選択 |
| `clampConfidence(n)` | F6（1〜5） |
| `buildSubmission(state, sceneId)` | 送信ペイロード組み立て |
| `anonymousName(name)` | 無記名時「（無記名）」 |

| ID | 内容 | 関連 |
| --- | --- | --- |
| TC-001 | トグルで追加・削除 | F2 |
| TC-002 | `buildSubmission` が `ParticipantSubmission` 形 | FLOW |
| TC-003 | 空名前 → 無記名 | FLOW |
| TC-004 | `confidenceLevel` 範囲外を拒否/補正 | F6 |
| TC-005 | `awarenessNote` 空許容 | F3 |

---

### 4.7 `shared/src/criteriaOrder.ts`（新規）→ `criteriaOrder.test.ts`

**抽出元**: `ParticipantPage.tsx` の `syncCriteriaOrder`, `move`

| ID | 内容 | 関連 |
| --- | --- | --- |
| TC-001 | 選択追加で順序末尾に追加 | F4 |
| TC-002 | 選択解除で順序から削除 | F4 |
| TC-003 | `moveUp` / `moveDown` | F4 |
| TC-004 | 境界で move 無効 | F4 |

---

### 4.8 `shared/src/normalizeScene.ts`（新規）→ `normalizeScene.test.ts`

**抽出元**: `admin-web` のテキストエリア保存

| ID | 内容 | 関連 |
| --- | --- | --- |
| TC-001 | 行配列 → 各カード `limitChoices` 適用 | F1 |
| TC-002 | 空行除去 | F1 |
| TC-003 | `veteranTemplate` 各配列も正規化 | F1 |

---

### 4.9 `shared/src/ojtExport.ts`（新規）→ `ojtExport.test.ts`

| ID | 内容 | 関連 |
| --- | --- | --- |
| TC-001 | `DiffSummary` → OJT 用テキスト配列 | F9 |
| TC-002 | 空差分でもクラッシュしない | F9 |

---

### 4.10 `shared/src/test/fixtures.ts`（補助）

| 関数 | 用途 |
| --- | --- |
| `makeScene(overrides?)` | `diff.test.ts`, `submission.test.ts` |
| `makeSubmission(overrides?)` | 同上 |
| `makeSettings(overrides?)` | `storage.test.ts` |

テスト対象ファイルではない。各 `*.test.ts` から import する。

---

### 4.11 `participant-web/src/hooks/useAppData.ts` → `useAppData.test.ts`

| ID | 内容 | 期待 |
| --- | --- | --- |
| TC-001 | 初期 render で settings / responses が読める | storage mock |
| TC-002 | `addResponse` 後に responses 更新 | — |
| TC-003 | `expertEye360-storage` で refresh | — |

**方針**: ドメインは `storage.test.ts` で担保。ここは React フックの配線のみ。

---

### 4.12 `participant-web/src/pages/ParticipantPage.tsx` → `ParticipantPage.test.tsx`

| ID | 内容 | 方針 |
| --- | --- | --- |
| TC-001 | シーンなしで警告表示 | スモーク |
| TC-002 | step 0 → 1 に進める | スモーク（任意） |

**方針**: ステップ・選択の詳細は `submission.test.ts` / `criteriaOrder.test.ts` に寄せ、UI テストは最小。

**受講者 5 問フロー（手動・受け入れ）**: [TECHNICAL-SPEC.md §4.3](TECHNICAL-SPEC.md#43-受講者回答フロー5問--4画面サイクル) に従う。**5 問 = 4 画面サイクル × 5 回**。一言メモの `next` で次ラウンドの気づきカードへ進むこと。

| 設問（ラウンド） | 1 サイクル内の画面順（各 `next`） | 現行（2026-05-19） |
| --- | --- | --- |
| 事前 | 名前・所属 | step 0 |
| 1〜5 各回 | 気づき → 共有 → 判断基準 → 一言メモ → **次の気づき** | 1 回分のみ・順序ずれ（§4.3.5） |
| 締め | 確信度 → 送信 | step 9〜11 |

---

### 4.13 `admin-web/src/pages/AdminPage.tsx` → `AdminPage.test.tsx`

| ID | 内容 | 方針 |
| --- | --- | --- |
| TC-001 | 保存で `normalizeScene` 経由の 5 件制限 | `normalizeScene.test.ts` と併用 |
| TC-002 | 差分表示が `computeDiff` 結果と一致 | F7・F8 スモーク |

---

## 5. 機能 ID ↔ ファイル対応（参照用）

仕様トレース用。テスト実装の主キーは **§3・§4 のファイル** とする。

| 機能 ID | 主なテストファイル |
| --- | --- |
| F1 | `normalizeScene.test.ts`, `storage.test.ts`, `seed.test.ts` |
| F2 | `submission.test.ts`, `choices.test.ts` |
| F3 | `submission.test.ts` |
| F4 | `criteriaOrder.test.ts` |
| F5 | `submission.test.ts`, `choices.test.ts` |
| F6 | `submission.test.ts` |
| F7 | `diff.test.ts` |
| F8 | `storage.test.ts`, `AdminPage.test.tsx`（薄） |
| F9 | `ojtExport.test.ts` |

---

## 6. ディレクトリ構成（完成形）

```
shared/src/
├── types.ts
├── seed.ts
├── seed.test.ts
├── choices.ts
├── choices.test.ts
├── diff.ts
├── diff.test.ts
├── storage.ts
├── storage.test.ts
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

| 順 | ファイル | 理由 |
| --- | --- | --- |
| 1 | `choices.test.ts` | 既存実装・依存なし |
| 2 | `diff.test.ts` | 既存実装・F7 コア |
| 3 | `test/fixtures.ts` | 以降のテストで共用 |
| 4 | `submission.test.ts` | UI からロジック抽出と同時 |
| 5 | `criteriaOrder.test.ts` | 同上 |
| 6 | `storage.test.ts` | Integration |
| 7 | `seed.test.ts` | デモデータ契約 |
| 8 | `normalizeScene.test.ts` | 管理者保存 |
| 9 | `useAppData.test.ts` | 各 Web |
| 10 | `*.test.tsx` | スモークのみ |
| 11 | `ojtExport.test.ts` | F9 |

---

## 8. Phase 完了チェックリスト（ファイル別）

### Phase 0 — 基盤

- [ ] ルート `vitest.config.ts` + `npm test`
- [ ] `choices.test.ts` 全 TC Green
- [ ] `diff.test.ts` 全 TC Green

### Phase 1 — shared 拡張

- [ ] `submission.test.ts` Green（抽出完了）
- [ ] `criteriaOrder.test.ts` Green（抽出完了）
- [ ] React が shared のみ使用（重複ロジック削除）

### Phase 2 — 永続化・管理

- [ ] `storage.test.ts` Green
- [ ] `seed.test.ts` Green
- [ ] `normalizeScene.test.ts` Green

### Phase 3 — UI・OJT

- [ ] `useAppData.test.ts`（両 Web）
- [ ] `ParticipantPage.test.tsx` / `AdminPage.test.tsx` スモーク
- [ ] `ojtExport.test.ts`（任意）

---

## 8.1 受講者 iframe レイアウト（手動・E2E）

[TECHNICAL-SPEC.md](./TECHNICAL-SPEC.md) **§3.2.3** に従う。Vitest 化は Phase 3 以降の Playwright 想定。

| ID | 手順 | 期待結果 |
| --- | --- | --- |
| L-01 | `embed-preview.html` を開き、ブラウザウィンドウの高さを大きく／小さく変える | 全 step で帯内に収まり、**帯内スクロールバーが出ない** |
| L-02 | 開発者ツールで iframe 要素の `height` を 80px〜400px 程度まで変更 | 文字・カード・入力が比例して縮み、はみ出さない |
| L-03 | step 0（名前・所属）表示 | 白枠の**上余白と下余白（ナビ直前）が視覚的に同程度** |
| L-04 | 5 問フロー（§4.3） | 各ラウンドで気づき→共有→判断基準→一言メモの順。一言メモの `next` で**次の気づき**（5 回目後は確信度） |
| L-05 | カード選択の反転 | 選択済みカードは他カード**ホバーでは解除されない**。別カード選択時のみ切り替わる |
| L-04 | `participant-app.css` に `vh` / `25vh` が無いこと（`cqh`/`cqw` と iframe 100% のみ） | 静的確認または grep |

---

## 9. CI・未決定

| 項目 | 方針 |
| --- | --- |
| CI | `npm test` = `vitest run`（`shared/**/*.test.ts` を含む） |
| カバレッジ | Phase 1 以降 `shared/src` 行 80% 目安 |
| F3 メモ上限 | 確定後 `submission.test.ts` に TC 追加 |
| E2E | `e2e/` に別設計（本書のファイル対応外） |

---

## 10. 参照

- [TECHNICAL-SPEC.md](./TECHNICAL-SPEC.md)
- [README.md](../README.md)
