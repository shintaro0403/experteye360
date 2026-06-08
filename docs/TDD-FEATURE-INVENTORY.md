# ExpertEye360 — TDD 機能一覧（テスト単位）

本書は、UI 整備後（2026-05-19 時点）の **機能面をテスト駆動で進める** ための洗い出しである。

**テスト計画（スコープ・Phase・作業順の正本）**: [TEST-DESIGN.md §1.2](./TEST-DESIGN.md#12-テストスコープとマイルストーン)  
**実装フロー（6 ステップ）**: [TEST-DESIGN.md §2.0.4](./TEST-DESIGN.md#204-機能ごとの実装フロー6-ステップ)

**テストの粒度（大→中→小で進める）**: [TEST-DESIGN.md §2.0.5](./TEST-DESIGN.md#205-テストの粒度大中小)  
**テストの書き方・TC・重要度**: [TEST-DESIGN.md](./TEST-DESIGN.md) §2〜§4・§8  
**テストコードのテンプレ（T1〜T6・API 契約の型）**: [TEST-TEMPLATES.md](./TEST-TEMPLATES.md)

**文書と実装の整合（読み方）**: [DOC-ALIGNMENT.md](./DOC-ALIGNMENT.md)

**関連**: [TECHNICAL-SPEC.md](./TECHNICAL-SPEC.md)、[SPREADSHEET-DATA.md](./SPREADSHEET-DATA.md)、[README.md](../README.md)

**現状**: **Vitest 導入済み**（ルート `npm test` は 14 files / 89 tests Green）。Phase 0 / 1 / 2 は Green。Phase 2.5 は Sheet API 契約、GAS、`VITE_STORAGE_BACKEND=sheet`、受講者・管理者画面配線、管理画面からの研修コード変更、Sheet API mock 経由の Playwright まで最小実装済み。Phase 3 は `pdfExport` / `ojtExport` の共有ロジック入口、PDF ダウンロード UI 代表テスト、開ける最小 PDF 構造、日本語対応、`pdf.html` の主要デザイン要素反映、目視フィードバック反映、長文折り返し・可変高さ、コンテンツ量に応じた複数ページ化まで Green（実 PDF 目視・OJT UI は未）。名前・所属・一言メモの文字数上限も Green

## 目次

- [0.2 実装状態の記号（README / コードと揃える）](#02-実装状態の記号)
- [0.2b 記載ルール（横並び表の禁止）](#02b-記載ルール)
- [0.3 実装フロー（6 ステップ）](#03-実装フロー)
- [0.5 テストの粒度（大 → 中 → 小）](#05-テストの粒度)
- [1.0 現状の問題と解決策（要約）](#10-現状の問題と解決策)
- [0. テストの置き場（方針）](#0-テストの置き場)
- [1. 共通ドメイン（shared/src）](#1-共通ドメイン)
  - [1.1 カード枚数制限 — choices.ts 【実装済み】](#11-カード枚数制限-—-choicests-【実装済み】)
  - [1.2 設問別カード取得・正規化 — sceneQuestions.ts 【実装済み】](#12-設問別カード取得正規化-—-sceneQuestionsts-【実装済み】)
  - [1.3 カードスロット変換 — cardSlots.ts 【実装済み】](#13-カードスロット変換-—-cardSlotsts-【実装済み】)
  - [1.4 5 問フロー step 変換 — judgmentFlow.ts 【実装済み】](#14-5-問フロー-step-変換-—-judgmentFlowts-【実装済み】)
  - [1.5 回答ラウンドの読取・集約 — judgmentFlow.ts 【実装済み】](#15-回答ラウンドの読取集約-—-judgmentFlowts-【実装済み】)
  - [1.6 単一選択トグル — selection.ts 【実装済み】](#16-単一選択トグル-—-selectionts-【実装済み】)
  - [1.7 step バリデーション — validateStep.ts 【実装済み】](#17-step-バリデーション-—-validateStepts-【実装済み】)
  - [1.8 送信ペイロード組み立て — submission.ts 【実装済み】](#18-送信ペイロード組み立て-—-submissionts-【実装済み】)
  - [1.9 確信度 — 【要抽出】](#19-確信度-—-【要抽出】)
  - [1.10 OJT 出力 — 【実装済み・入口】（README §7・F8。Phase 3）](#110-OJT-出力-—-【実装済み入口】)
- [2. 永続化](#2-永続化)
  - [2.1 storage — localStorage 【実装済み・開発用】](#21-storage-—-localStorage-【実装済み開発用】)
  - [2.2 Sheet API → スプレッドシート 【実装済み・入口】](#22-Sheet-API-スプレッドシート-【実装済み入口】)
  - [2.3 将来ストア（PostgreSQL 等）【設計のみ】](#23-将来ストア【設計のみ】)
- [3. デモデータ — seed.ts 【実装済み】](#3-デモデータ-—-seedts-【実装済み】)
- [4. 受講者アプリ（participant-web）](#4-受講者アプリ)
  - [4.1 シーン・データソース 【実装済み】](#41-シーンデータソース-【実装済み】)
  - [4.2 画面遷移（step） 【実装済み】](#42-画面遷移-【実装済み】)
  - [4.3 バリデーション連携 【実装済み・要抽出テスト】](#43-バリデーション連携-【実装済み要抽出テスト】)
  - [4.4 ラウンド独立性 【実装済み】](#44-ラウンド独立性-【実装済み】)
  - [4.5 未実装・将来](#45-未実装将来)
  - [4.6 useAppData 【実装済み】](#46-useAppData-【実装済み】)
- [5. 管理者アプリ（admin-web）](#5-管理者アプリ)
  - [5.1 ツアー URL 【実装済み】](#51-ツアー-URL-【実装済み】)
  - [5.2 シーン CRUD 【実装済み】](#52-シーン-CRUD-【実装済み】)
  - [5.3 受講者反映シーン 【実装済み】](#53-受講者反映シーン-【実装済み】)
  - [5.4 設問別カード編集 【実装済み】](#54-設問別カード編集-【実装済み】)
  - [5.5 回答一覧・詳細 【実装済み】](#55-回答一覧詳細-【実装済み】)
  - [5.6 UI から外れている（方針決定後にテスト追加）](#56-UI-から外れている)
  - [5.7 useAppData 【実装済み】](#57-useAppData-【実装済み】)
- [6. 横断・非機能](#6-横断非機能)
- [7. 仕様 ID（F3〜F8）との対応](#7-仕様-IDとの対応)
- [8. 推奨 TDD 実施順（粒度別）](#8-推奨-TDD-実施順)
  - [8.1 大（L）— 最初に通す](#81-大—-最初に通す)
  - [8.2 中（M）— Vitest で芯を固定](#82-中—-Vitest-で芯を固定)
  - [8.3 小（S）— 細分化（必要時）](#83-小—-細分化)
  - [8.4 Phase 0 の残り（いまやる順）](#84-Phase-0-の残り)
- [9. Phase 提案（参照）](#9-Phase-提案)
- [10. 機能 ID ↔ テストファイル（参照）](#10-機能-ID-↔-テストファイル)

---


#### 改訂履歴

**0.1**（2026-05-19）— 初版（UI 整備後の機能洗い出し）

**0.2**（2026-05-20）— 機能一覧の整理（未採用項目の削除）

**0.3**（2026-05-20）— 本番永続化を **Google スプレッドシート** とする方針（§2.1、§6 X、Phase 2.5）

**0.4**（2026-05-20）— §1.0 現状の問題と解決策、§2.2 SH-08〜10（room）、Postgres 移行（§2.3）

**0.5**（2026-05-20）— ブック構成確定（マスター clients + 4 シート）。SH-11〜13、AL 系

**0.6**（2026-05-20）— README 整合（同一ツアー・研修コード必須・F7 回答状況/PDF・確信度必須）

**0.7**（2026-05-21）— Phase・実施順は [TEST-DESIGN.md §1.2](./TEST-DESIGN.md#12-テストスコープとマイルストーン) を正とする（§8・§9 は参照のみ）

**0.8**（2026-05-21）— F7: 回答済み一覧・PDF（jsPDF・1 人 1 ファイル・①〜⑤）。A-53 / PDF ID。§ [TEST-DESIGN §1.4](./TEST-DESIGN.md#14-f7-講師管理者ダッシュボードと-pdf-エクスポート)

**0.9**（2026-05-21）— 入室・マルチテナント: ENTRY / ADM-ENTRY、研修コード（名前前）、管理者コード必須。§ [TEST-DESIGN §1.5](./TEST-DESIGN.md#15-入室マルチテナント)

**1.0**（2026-05-21）— 横並び表を廃止し、縦ブロック形式に統一

**1.1**（2026-05-21）— §0.5 テストの粒度（大→中→小）を追加。§8 を粒度別実施順に差し替え

**1.2**（2026-05-21）— §0.3 実装フロー（6 ステップ）を追加

**1.3**（2026-05-21）— 入室 §2.1c を実装状態に合わせて修正。[DOC-ALIGNMENT.md](./DOC-ALIGNMENT.md) 追加

**1.5**（2026-05-21）— §0.2b 記載ルール（横並び表禁止・縦ブロック）。DOC-ALIGNMENT §0 と整合

---

## 0.2 実装状態の記号（README / コードと揃える）

[DOC-ALIGNMENT.md](./DOC-ALIGNMENT.md) §3 と同じ。

## 0.2b 記載ルール（横並び表の禁止）

**Markdown の表（`| … |`）は使わない。** [DOC-ALIGNMENT.md §0](./DOC-ALIGNMENT.md#0-記載ルール) と同じく **縦ブロック**（見出し + `**ラベル** — 本文`）で書く。

- **【実装済み】** … 動くコードあり
- **【要抽出】** … ページ内ロジック。shared 移動後にテスト
- **【未実装】** … これから作る（GAS、画面配線、PDF ダウンロード UI 等）
- **【UI なし】** … ロジック・型のみ。画面・テスト対象外

---

## 0.3 実装フロー（6 ステップ）

**正本**: [TEST-DESIGN.md §2.0.4](./TEST-DESIGN.md#204-機能ごとの実装フロー6-ステップ)

1. **機能の受け入れ条件を書く**（**大** — 手動チェックリスト・README 等）
2. **機能の振る舞いテストを書く**（**中** — Vitest、少数の `it`、Red）
3. **最小実装する**（Green）
4. **実装中に複雑な内部ロジックが見えてくる**（shared へ切り出す候補）
5. **その部分だけ単体テストを書く**（**小** — C-01、JF-03 等）
6. **リファクタする**（テストは Green のまま）

§1〜§7 の ID 一覧は、主に **ステップ 5** で 1:1 に使う辞書。**ステップ 1〜2** では ID 単位から書き始めない。

---

## 0.5 テストの粒度（大 → 中 → 小）

**正本**: [TEST-DESIGN.md §2.0.5](./TEST-DESIGN.md#205-テストの粒度大中小)

§0.3 の各ステップに対応するテストのサイズ。いきなり **小** から書かない。

§1〜§7 は振る舞い ID の辞書（細かい一覧）。**どの順で進めるか**は §0.3・§0.5・§8 を見る。

#### 大（L）— まずここ

**5 問フロー一通り** — 手動 §4.12（TEST-DESIGN）。気づき→共有→判断→メモ×5→確信度→送信

**iframe 帯** — 手動 §8.1（L-01〜L-08）

**研修コード入室** — 手動 ENTRY-M（コード OK → 名前所属表示 / NG → 固定文言のみ）

**管理者コード入室** — 手動 ADM-M

**受講者→管理者で回答が見える** — 手動（SH-07）。Phase 2.5 以降は本番近似 API で実施

**E2E** — Playwright（Phase 4）

#### 中（M）— 次に Vitest

**`judgmentFlow.test.ts`** — 5 問 step の芯（JF / JR の代表。ID 単位にしない）

**`sceneQuestions.test.ts`** — 正規化・設問カード取得の代表（SQ-01, SQ-04, SQ-06 等）

**`submission.test.ts`** — 送信ペイロード一式（S-01〜S-09）

**`storage.test.ts`** — local 往復（ST-01〜ST-10）

**`sheetApi.test.ts`** — API 契約（SH-01〜SH-14）

**`roomEntry.test.ts` / `adminEntry.test.ts`** — 検証関数一式（ENTRY / ADM-ENTRY）

**`useAppData.test.ts`** — フックと storage（H-01〜H-03）

**`*.test.tsx`** — ページ配線スモーク（P-01, P-02 等）

**`pdfExport.test.ts`** — PDF 項目（Phase 3）

#### 小（S）— 細分化（回帰・境界）

**`choices.test.ts`** — C-01〜C-04（完了済み）

**`judgmentFlow` の分割** — JF-01〜JF-11、JR-01〜JR-04 を 1 ID 1 `it`（**中** が Green になってから）

**`validateStep.test.ts`** — V-01〜V-11

**`selection.test.ts`** — SS-01〜SS-03

**`cardSlots.test.ts`** — SL-01〜SL-03

**`seed.test.ts`** — SD-01〜SD-04

#### 進め方（1 機能あたり）

[§0.3](#03-実装フロー6-ステップ) に従う。

1. 受け入れ条件（**大**）
2. 振る舞いテスト（**中**）→ 最小実装
3. 内部ロジックが見えたら、その部分だけ単体（**小**）→ リファクタ

---

## 1.0 現状の問題と解決策（要約）

[SPREADSHEET-DATA.md §0](./SPREADSHEET-DATA.md) と同一。実装・テストの優先順。

**P-01** 受講者回答が講師に届かない → **S-01** Sheet API + スプレッドシート（`sheetApi.test.ts`, SH-01〜07）

**P-02** クライアント混線 → **S-02** `clientId`（SH-01, TC-007）

**P-03** 入室制限なし → **S-03** `roomId` / **研修コード必須**（SH-08〜10）。パスワードのみでは不十分

**将来** → **S-04** storage 窓口 + API 固定で Postgres 差し替え可（§2.3）

---

## 0. テストの置き場（方針）

**進める順** — [§0.3](#03-実装フロー6-ステップ)（受け入れ条件 → 振る舞いテスト → 最小実装 → 単体 → リファクタ）

**ロジックの置き場** — 判定・制限は `shared/src`。UI は shared を呼ぶだけ

**中・小の配置** — `foo.ts` と同階層に `foo.test.ts`（コロケーション）

**大** — 手動 §4.12 / §8.1 / ENTRY-M。iframe（受講者 25%×100%、管理者 40%×100%）

**記号**

記号の意味は [§0.2](#02-実装状態の記号readme--コードと揃える)。

---

## 1. 共通ドメイン（`shared/src`）

### 1.1 カード枚数制限 — `choices.ts` 【実装済み】

**C-01** — `MAX_CHOICE_CARDS` は `5`

**C-02** — 6 件入力 → 先頭 5 件だけ返る

**C-03** — 5 件以下 → 件数・順序そのまま

**C-04** — 空配列 → 空配列

### 1.2 設問別カード取得・正規化 — `sceneQuestions.ts` 【実装済み】

**SQ-01** — `questionCards` が長さ 5 → `getSceneQuestionCards(scene, n)` は `questionCards[n]` を返す

**SQ-02** — `roundIndex` が範囲外 → 空の 3 種カード

**SQ-03** — 旧形式（`awarenessCards` 等のみ）→ 全ラウンド同じレガシー 3 種を返す

**SQ-04** — `normalizeScene`: 各設問の各カード配列に `limitChoices` 適用

**SQ-05** — 旧形式シーン → レガシー 1 セットを 5 問分にコピーして `questionCards` 生成

**SQ-06** — `normalizeSettings` → 全シーンに `normalizeScene`

### 1.3 カードスロット変換 — `cardSlots.ts` 【実装済み】

現状: `shared/src/cardSlots.ts`。`admin-web/src/components/CardSlotsField.tsx` は shared の変換関数を利用。

**SL-01** — `cardsToSlots`: 最大 5 スロット、不足分は `""`

**SL-02** — `slotsToCards`: trim 後空行除去 → `limitChoices`

**SL-03** — UI は 5 スロット固定（6 件目入力経路なし）

### 1.4 5 問フロー step 変換 — `judgmentFlow.ts` 【実装済み】

**JF-01** — `JUDGMENT_ROUND_COUNT === 5`

**JF-02** — `STEP_INTRO = 0`

**JF-03** — `STEP_JUDGMENT_START = 1`、各ラウンド 4 step

**JF-04** — `STEP_CONFIDENCE = 21`、`STEP_CONFIRM = 22`、`STEP_DONE = 23`

**JF-05** — `stepToRoundPhase(1)` → round 0, awareness

**JF-06** — `stepToRoundPhase(4)` → round 0, note

**JF-07** — `stepToRoundPhase(5)` → round 1, awareness

**JF-08** — `stepToRoundPhase(20)` → round 4, note

**JF-09** — `stepToRoundPhase(0/21/22/23)` → `null`

**JF-10** — `createEmptyRounds()` → 長さ 5・各フィールド空

**JF-11** — `emptyJudgmentRound()` の初期形

### 1.5 回答ラウンドの読取・集約 — `judgmentFlow.ts` 【実装済み】

**JR-01** — `rounds` が長さ 5 → `getSubmissionRounds` はそのまま

**JR-02** — 旧形式のみ → `legacyToRounds` で 5 要素（1 問目のみ中身、2〜5 は空）

**JR-03** — `aggregateCriteriaOrdered`: 全ラウンドを走査し出現順でユニーク

**JR-04** — `aggregateAwarenessSelections` / `aggregateActionsSelected`: flatMap

### 1.6 単一選択トグル — `selection.ts` 【実装済み】

現状: `shared/src/selection.ts` の `selectSingle`。

**SS-01** — 未選択 + ラベル → `[ラベル]`

**SS-02** — 同じラベル再タップ → `[]`

**SS-03** — 別ラベル → `[新ラベル]`（1 件のみ）

### 1.7 step バリデーション — `validateStep.ts` 【実装済み】

現状: `shared/src/validateStep.ts` の `validateParticipantStep`。

**V-01** — step 0・名前空 → `名前を入力してください`

**V-02** — step 0・所属空 → `所属を入力してください`

**V-03** — step 0・両方 trim 後あり → `null`

**V-04** — 気づき step・未選択 → `気づきカードを1つ選んでください`

**V-05** — 共有 step・未選択 → `共有・行動カードを1つ選んでください`

**V-06** — 判断 step・未選択 → `判断基準カードを1つ選んでください`

**V-07** — 一言メモ step・30 文字以内 → `null`（任意）

**V-08** — 確信度 step・未選択（`confidence === null`）→ `確信度を1つ選んでください`。送信確認 step → `null`

**V-09** — 名前・所属は空白のみ不可（trim）

**V-10** — 名前・所属は各 10 文字以内。ラベルに `（10文字以内）` を表示。超過時は `10文字以内で入力してください`

**V-11** — 一言メモは 30 文字以内。ラベルに `（30文字以内）` を表示。超過時は `30文字以内で入力してください`

### 1.8 送信ペイロード組み立て — `submission.ts` 【実装済み】

現状: `shared/src/submission.ts` の `buildSubmission`。

**S-01** — `rounds` 長さ 5 をそのまま保存

**S-02** — `participantName` / `affiliation` は trim

**S-03** — `sceneId` は渡されたシーン ID

**S-04** — `confidenceLevel` は 1〜5（範囲外の補正ルールを仕様で固定）

**S-05** — レガシー `awarenessSelections` 等は全ラウンド flatMap

**S-06** — `awarenessNote` は `【設問n】本文` を改行連結（空ラウンドはスキップ）

**S-07** — `attentionSelected` は空配列（レガシー互換フィールド）

**S-08** — `criteriaNote` / `actionsNote` / `attentionNote` は空文字

**S-09** — `id` / `createdAt` が付与される

### 1.9 確信度 — 【要抽出】

**CF-01** — 1〜5 はそのまま

**CF-02** — 1 未満 → 1、5 超 → 5（または拒否。仕様で固定）

### 1.10 OJT 出力 — 【実装済み・入口】（README §7・F8。Phase 3）

現状: `shared/src/ojtExport.ts` と `ojtExport.test.ts` の最小実装は Green。現行画面・ファイル出力には **ない**。

**O-01** — 受講者回答内容から OJT 確認項目テキスト配列を生成

**O-02** — 空チェックリストでも例外にならない

**O-03** — 文言に「不正解」等のスコア表現を含めない

---

## 2. 永続化

本番の正本は **Google スプレッドシート**（[SPREADSHEET-DATA.md](./SPREADSHEET-DATA.md)）。`clientId` でクライアントを分離。

### 2.1 `storage` — localStorage 【実装済み・開発用】

**ST-01** — 初回 `loadSettings` → デモ seed 相当 + 保存

**ST-02** — `saveSettings` → `loadSettings` で一致

**ST-03** — 保存時 `normalizeSettings` が走る

**ST-04** — `scenes` 空 → デモにフォールバック

**ST-05** — settings JSON 破損 → デモにフォールバック

**ST-06** — `loadResponses` 初回 → `[]`

**ST-07** — responses JSON 破損 → `[]`

**ST-08** — `appendResponse` → 先頭が最新

**ST-09** — `saveResponses` / `appendResponse` で `expertEye360-storage` 発火

**ST-10** — `resetDemoData` → settings 初期化・responses 空（UI からは削除済み・API 残存）

### 2.2 Sheet API → スプレッドシート 【実装済み・入口】

**現状** — `sheetApi.test.ts` と `storage/sheet.ts` で TC-001〜013、`rooms/access-code` 契約、client / room / token / `rooms/verify` / `admin/token` は Green。GAS、`VITE_STORAGE_BACKEND=sheet`、`storage.ts` async 統合、画面配線、管理画面からの研修コード変更、Sheet API mock 経由の Playwright は最小実装済み。実環境分離確認は未実施。

**SH-01** — `?client={clientId}` を全 API に付与（入口 Green）

**SH-02** — `GET settings` → `AppSettings`（`settings` シート）（入口 Green）

**SH-03** — `POST settings`（body `{ token, settings }`）→ 管理者保存がシートに反映（GAS と画面配線は最小実装済み）

**SH-04** — `POST responses/query`（body `{ token }`）→ 一覧（新しい順）（フロント取得契約は入口 Green。ソート保証は未。旧 `GET responses` は後方互換）

**SH-05** — `POST responses` → 受講者 1 送信 = 1 行追加（GAS 追記と画面配線は最小実装済み）

**SH-06** — 不正 `client` / 401 → 画面でエラー（落ちない）

**SH-07** — 受講者(5173)と管理者(5174)が **同一 client の同じデータ** を見る（API 経由）

**SH-08** — 全 API に `room` クエリ（または初回コード入力後に付与）

**SH-09** — `POST responses/query` は当該 `room` の行のみ

**SH-10** — 別 `room` への POST が他 room 一覧に混ざらない

**SH-11** — マスター `clients` で `spreadsheetId` 解決・`enabled` チェック

**SH-12** — `rooms.accessCodeHash` で研修コード検証（平文をシートに保存しない）。失敗時 UI: **正しい研修コードを入力してください**（GAS hash 照合と画面配線は最小実装済み）

**SH-13** — 管理者操作で **管理者コード**（`adminTokenHash`）照合。管理者の入室に研修コードは不要

**SH-14** — 管理者コード変更は現行コード必須（`sheetApi` TC-013）

#### 2.1d コードベース分離（URL 固定）【ISOLATE 進行中】

正本: [REMAINING-IMPLEMENTATION.md §6](./REMAINING-IMPLEMENTATION.md#6-コードベース分離url-固定方針)

**ISOLATE-01** — 管理者コードから room を特定（`adminRoom.test.ts`）【実装済み】

**ISOLATE-02** — 管理者 UI が確定 room だけ表示【実装済み】

**ISOLATE-03** — GAS `rooms.adminTokenHash` + room 単位 token 照合【実装済み】

**ISOLATE-04** — E2E クロス閲覧拒否【実装済み】

#### 2.1c 入室ゲート（shared + UI）【実装済み（local / Sheet API）】

**ENTRY-01** — 研修コード検証前は名前・所属欄を出さない

**ENTRY-02** — 検証成功で `roomId` 保持・プロフィール欄表示

**ENTRY-03** — 検証失敗で固定文言「正しい研修コードを入力してください」

**ADM-ENTRY-01** — 管理者コード未検証では管理 UI をロック

**ADM-ENTRY-02** — 正しい管理者コードで `loadSettings` 等が可能

**ADM-ENTRY-03** — 管理者コード変更は旧コード不一致で拒否

正本: [TEST-DESIGN.md §1.5](./TEST-DESIGN.md#15-入室マルチテナント)

#### 2.2b `audit_logs` シート 【未実装】

**AL-01** — 管理者 `saveSettings` で `audit_logs` に 1 行追記

**AL-02** — `room` 作成・更新で追記

**AL-03** — 追記のみ（行の更新・削除は GAS 運用外）

### 2.3 将来ストア（PostgreSQL 等）【設計のみ】

**PG-01** — フロントは `storage.ts` 窓口のみ。物理 DB を直接参照しない

**PG-02** — API の JSON 形は `AppSettings` / `ParticipantSubmission` と一致

**PG-03** — `client` / `room` クエリ契約はシート時代と同一

---

## 3. デモデータ — `seed.ts` 【実装済み】

**SD-01** — `scenes.length >= 1`

**SD-02** — 各シーン `questionCards.length === 5`（または正規化後）

**SD-03** — 各カード配列 `length <= 5`

**SD-04** — `tourUrl` 存在

---

## 4. 受講者アプリ（`participant-web`）

### 4.1 シーン・データソース 【実装済み】

**P-01** — `settings.scenes[0]` のみ使用（シーン切替なし）

**P-02** — `scenes` 空 → 警告文表示・フォーム非表示

**P-03** — 各ラウンドの choices は `getSceneQuestionCards(scene, round)` + `limitChoices`

### 4.2 画面遷移（step） 【実装済み】

**P-10** — intro → 設問1 気づき（step 0→1）

**P-11** — 各ラウンド: 気づき→共有→判断→一言（4 step）

**P-12** — 設問5 一言の next → 確信度（20→21）

**P-13** — 確信度 → 送信確認 → 送信完了

**P-14** — `back` で step 減少、intro で back 非表示

**P-15** — 送信確認の next で保存（ラベル「回答を送信」）

### 4.3 バリデーション連携 【実装済み・要抽出テスト】

**P-20** — `tryNext` 失敗時 step 不変

**P-21** — 警告表示後、入力/選択で警告クリア

**P-22** — `goBack` で警告クリア

### 4.4 ラウンド独立性 【実装済み】

**P-30** — ラウンド2 以降、前ラウンドの選択は引き継がない

**P-31** — 各ラウンドの `roundNote` は独立

### 4.5 未実装・将来

**P-42** — シーン ID の URL 連携（3DVista 同期・要決定）

### 4.6 `useAppData` 【実装済み】

**H-01** — 初期 state が `loadSettings` / `loadResponses` と一致

**H-02** — `addResponse` 後 `responses` 更新

**H-03** — `expertEye360-storage` で refresh

---

## 5. 管理者アプリ（`admin-web`）

### 5.1 ツアー URL 【実装済み】

**A-01** — ツアー URL 表示・編集

**A-02** — 保存で `settings.tourUrl` 更新・永続化

### 5.2 シーン CRUD 【実装済み】

**A-10** — シーン追加 → 空の 5 問カード

**A-11** — シーン削除（確認ダイアログ）

**A-12** — シーン保存 → `editorDraftToScene` + 正規化（`questionCards` 5 件）

**A-13** — 一覧でアクティブシーン選択

### 5.3 受講者反映シーン 【実装済み】

**A-20** — 一覧先頭のみ「受講者UI」

**A-21** — `promoteSceneToParticipant` → 対象を `scenes[0]` に移動

**A-22** — 先頭以外編集中は警告表示

### 5.4 設問別カード編集 【実装済み】

**A-30** — 設問 1〜5 タブ切替

**A-31** — 各設問で気づき・判断・共有を 5 スロット入力

**A-32** — 保存後 `questionCards[n]` が受講者設問 n に対応

### 5.5 回答一覧・詳細 【実装済み】

**A-40** — 回答一覧（新しい順）

**A-41** — 名前・所属（無ければ —）・シーン名表示

**A-42** — 詳細で 5 設問分（気づき/共有/判断/一言）

**A-43** — 旧形式回答 → `getSubmissionRounds` で表示

**A-44** — 全回答削除

### 5.6 UI から外れている（方針決定後にテスト追加）

**A-52** — デモリセットボタン  
備考: `resetDemoData` は storage に残存

**A-53** — 回答済み一覧から PDF エクスポート（F7・1 人 1 ファイル）
備考: 管理者回答詳細からの PDF ダウンロード UI 代表テスト、PDF 生成入口、開ける最小 PDF 構造、日本語対応、`pdf.html` の主要デザイン要素反映、目視フィードバック反映、長文折り返し・可変高さ、コンテンツ量に応じた複数ページ化は Green。実 PDF 目視確認は未。§ [TEST-DESIGN §1.4](./TEST-DESIGN.md#14-f7-講師管理者ダッシュボードと-pdf-エクスポート)

**A-54** — OJT エクスポート UI（F8）  
備考: 未実装

### 5.7 `useAppData` 【実装済み】

受講者と同型（H-01〜H-03）。

---

## 6. 横断・非機能

**X-01** — 開発時: 5173/5174 は localStorage 非共有。本番: Sheet API で共有（SH-07）  
テスト化: `sheetApi.test.ts` + 手動

**X-02** — 同一オリジン + local 時は storage イベントで refresh  
テスト化: `useAppData` 結合

**X-03** — 複数クライアント: `clientId` ごとにスプレッドシート分離  
テスト化: [SPREADSHEET-DATA.md](./SPREADSHEET-DATA.md) §2

**X-04** — Sheet API `token`（管理者書込）。token は **POST ボディ**送信（SEC-SECRET-01）  
テスト化: `sheetApi.test.ts`（token がクエリに出ない・ボディに含む）・E2E

**X-05** — セキュリティ実装（[SECURITY.md](./SECURITY.md)）: 管理者 token のボディ送信（SEC-SECRET-01）、HTTPS 必須（SEC-NET-01）、数式インジェクション対策（SEC-INPUT-01）。ハッシュは単純 SHA-256（SEC-SECRET-02 は本番開始時に再導入予定）  
テスト化: `sheetApi.test.ts`・`security/sanitizeCell.test.ts`

---

## 7. 仕様 ID（F3〜F8）との対応

**F3** — 気づき＋一言  
現行 MVP: 5 問×単一選択＋メモ  
主なテスト ID: V, S, P-11

**F4** — 判断基準カード  
現行: **単一選択のみ**
主なテスト ID: V, S, P-11 相当

**F5** — 共有・行動  
現行 MVP: 単一選択  
主なテスト ID: V, S

**F6** — 確信度  
現行 MVP: 1〜5 ボタン・必須  
主なテスト ID: CF, S

**F7** — 講師・管理者画面（README §6）  
現行: **回答済み**一覧・詳細（実装済み）。保存順表示。PDF 生成ロジック入口は `pdfExport.ts` / `pdfExport.test.ts` で Green。管理者回答詳細からの PDF ダウンロード UI 代表テスト、開ける最小 PDF 構造、日本語対応、`pdf.html` の主要デザイン要素反映、目視フィードバック反映、長文折り返し・可変高さ、コンテンツ量に応じた複数ページ化も Green。実 PDF 目視確認は **未実装**
主なテスト ID: A-40, A-53, PDF, ST

**F8** — OJT 引き継ぎ  
現行 MVP: 未実装  
主なテスト ID: O, A-54

---

## 8. 推奨 TDD 実施順（粒度別）

**Phase の正本**: [TEST-DESIGN.md §1.2](./TEST-DESIGN.md#12-テストスコープとマイルストーン)  
**粒度の正本**: [§0.5](#05-テストの粒度大--中--小)

### 8.1 大（L）— 最初に通す

**L-1** — 手動 5 問フロー（§4.12）

**L-2** — 手動 iframe（§8.1）

**L-3** — 手動 研修コード → 名前所属（ENTRY-M）

**L-4** — 手動 管理者コード（ADM-M）

**L-5** — 手動 受講者送信 → 管理者で回答確認（Phase 2.5〜、SH-07）

### 8.2 中（M）— Vitest で芯を固定

**M-1** — `judgmentFlow.test.ts`（JF, JR の代表）

**M-2** — `sceneQuestions.test.ts`（SQ の代表）

**M-3** — `submission.test.ts`（S, CF 一式）

**M-4** — `storage.test.ts`（ST）

**M-5** — `sheetApi.test.ts`（SH）（Phase 2.5）

**M-6** — `roomEntry.test.ts` / `adminEntry.test.ts`（ENTRY, ADM-ENTRY）

**M-7** — `useAppData.test.ts`（H）

**M-8** — `pdfExport.test.ts`（PDF）（Phase 3）

**M-9** — `*.test.tsx`（P の配線スモーク）

### 8.3 小（S）— 細分化（必要時）

**S-1** — `choices.test.ts`（C）— 完了済み

**S-2** — `judgmentFlow` を JF-*/JR-* 単位に分割

**S-3** — `sceneQuestions` を SQ-* 単位に分割

**S-4** — `cardSlots.test.ts`（SL）

**S-5** — `selection.test.ts`（SS）

**S-6** — `validateStep.test.ts`（V）

**S-7** — `seed.test.ts`（SD）

**S-8** — `ojtExport.test.ts`（O）（Phase 3）

### 8.4 Phase 0 の残り（いまやる順）

1. **M-1** `judgmentFlow.test.ts` — 完了済み
2. **M-2** `sceneQuestions.test.ts` — 完了済み
3. **S-2 / S-3**（任意）— 上記を ID 単位に分割

---

## 9. Phase 提案（参照）

**正本は [TEST-DESIGN.md §1.2](./TEST-DESIGN.md#12-テストスコープとマイルストーン)** および **§8 Phase 完了チェックリスト**。

**Phase 0** — Vitest + 既存 `shared` ロジック固定

**Phase 1** — 受講者コアの shared 抽出 + テスト

**Phase 2** — localStorage 永続化・管理者正規化（完了）

**Phase 2.5** — Sheet API 契約 + 本番切替（最小実装済み、Sheet API mock Playwright は Green。実環境分離確認は継続）

**Phase 3** — F7 PDF・UI 配線・OJT（F8）。PDF は `pdf.html` の主要デザイン要素、目視フィードバック、長文折り返し・可変高さ、コンテンツ量に応じた複数ページ化まで Green。OJT UI・ファイル出力は継続

**Phase 4** — Playwright・回帰

未決定事項は [TEST-DESIGN.md §1.3](./TEST-DESIGN.md#13-未決定事項)。

---

## 10. 機能 ID ↔ テストファイル（参照）

**F3** — `validateStep.test.ts`, `submission.test.ts`, `choices.test.ts`

**F4** — `validateStep` / `choices` 等（単一選択）

**F5** — `validateStep.test.ts`, `submission.test.ts`, `choices.test.ts`

**F6** — `submission.test.ts`

**F7** — `storage.test.ts`, `sheetApi.test.ts`, `AdminPage.test.tsx`（薄）

**F8** — `ojtExport.test.ts`

---

*公式プロダクト仕様は [README.md](../README.md) および [TECHNICAL-SPEC.md](./TECHNICAL-SPEC.md) を優先すること。*
