# ExpertEye360 — TDD 機能一覧（テスト単位）

本書は、UI 整備後（2026-05-19 時点）の **機能面をテスト駆動で進める** ための洗い出しである。  
テストの書き方・ファイル対応・実施順は [TEST-DESIGN.md](./TEST-DESIGN.md) を参照。

| 項目 | 内容 |
| --- | --- |
| 関連 | [TECHNICAL-SPEC.md](./TECHNICAL-SPEC.md)、[README.md](../README.md) |
| 現状 | Vitest **未導入**。受講者 5 問フロー・管理者シーン/カード/回答一覧は **UI 実装済み** |

### 改訂履歴

| 版 | 日付 | 内容 |
| --- | --- | --- |
| 0.1 | 2026-05-19 | 初版（UI 整備後の機能洗い出し） |

---

## 0. テストの置き場（方針）

| 層 | 方針 |
| --- | --- |
| **最優先** | `shared/src/*.ts` の純関数（`foo.ts` ↔ `foo.test.ts`） |
| **次** | `storage.ts`（happy-dom + `localStorage`） |
| **薄く** | React ページはスモークのみ。ロジックは shared へ抽出してからテスト |
| **手動** | iframe レイアウト（受講者 25%×100%、管理者 40%×100%） |

**記号**

- **【実装済み】** … コードあり。TDD では挙動をテストで固定する
- **【要抽出】** … `ParticipantPage` / `AdminPage` 内。shared 移動後にテスト
- **【未実装】** … 仕様・型のみ。テスト先行で追加

---

## 1. 共通ドメイン（`shared/src`）

### 1.1 カード枚数制限 — `choices.ts` 【実装済み】

| ID | 振る舞い |
| --- | --- |
| C-01 | `MAX_CHOICE_CARDS` は `5` |
| C-02 | 6 件入力 → 先頭 5 件だけ返る |
| C-03 | 5 件以下 → 件数・順序そのまま |
| C-04 | 空配列 → 空配列 |

### 1.2 設問別カード取得・正規化 — `sceneQuestions.ts` 【実装済み】

| ID | 振る舞い |
| --- | --- |
| SQ-01 | `questionCards` が長さ 5 → `getSceneQuestionCards(scene, n)` は `questionCards[n]` を返す |
| SQ-02 | `roundIndex` が範囲外 → 空の 3 種カード |
| SQ-03 | 旧形式（`awarenessCards` 等のみ）→ 全ラウンド同じレガシー 3 種を返す |
| SQ-04 | `normalizeScene`: 各設問の各カード配列に `limitChoices` 適用 |
| SQ-05 | 旧形式シーン → レガシー 1 セットを 5 問分にコピーして `questionCards` 生成 |
| SQ-06 | `normalizeSettings` → 全シーンに `normalizeScene` |

### 1.3 カードスロット変換 — `CardSlotsField` 相当 【実装済み・要抽出】

現状: `admin-web/src/components/CardSlotsField.tsx`。TDD 前に `shared/src/cardSlots.ts` 等へ移動推奨。

| ID | 振る舞い |
| --- | --- |
| SL-01 | `cardsToSlots`: 最大 5 スロット、不足分は `""` |
| SL-02 | `slotsToCards`: trim 後空行除去 → `limitChoices` |
| SL-03 | UI は 5 スロット固定（6 件目入力経路なし） |

### 1.4 5 問フロー step 変換 — `judgmentFlow.ts` 【実装済み】

| ID | 振る舞い |
| --- | --- |
| JF-01 | `JUDGMENT_ROUND_COUNT === 5` |
| JF-02 | `STEP_INTRO = 0` |
| JF-03 | `STEP_JUDGMENT_START = 1`、各ラウンド 4 step |
| JF-04 | `STEP_CONFIDENCE = 21`、`STEP_CONFIRM = 22`、`STEP_DONE = 23` |
| JF-05 | `stepToRoundPhase(1)` → round 0, awareness |
| JF-06 | `stepToRoundPhase(4)` → round 0, note |
| JF-07 | `stepToRoundPhase(5)` → round 1, awareness |
| JF-08 | `stepToRoundPhase(20)` → round 4, note |
| JF-09 | `stepToRoundPhase(0/21/22/23)` → `null` |
| JF-10 | `createEmptyRounds()` → 長さ 5・各フィールド空 |
| JF-11 | `emptyJudgmentRound()` の初期形 |

### 1.5 回答ラウンドの読取・集約 — `judgmentFlow.ts` 【実装済み】

| ID | 振る舞い |
| --- | --- |
| JR-01 | `rounds` が長さ 5 → `getSubmissionRounds` はそのまま |
| JR-02 | 旧形式のみ → `legacyToRounds` で 5 要素（1 問目のみ中身、2〜5 は空） |
| JR-03 | `aggregateCriteriaOrdered`: 全ラウンドを走査し出現順でユニーク |
| JR-04 | `aggregateAwarenessSelections` / `aggregateActionsSelected`: flatMap |

### 1.6 単一選択トグル — 【要抽出】

現状: `participant-web/src/pages/ParticipantPage.tsx` の `selectSingle`。

| ID | 振る舞い |
| --- | --- |
| SS-01 | 未選択 + ラベル → `[ラベル]` |
| SS-02 | 同じラベル再タップ → `[]` |
| SS-03 | 別ラベル → `[新ラベル]`（1 件のみ） |

### 1.7 step バリデーション — 【要抽出】

現状: `ParticipantPage.tsx` の `validateStep`。

| ID | 振る舞い |
| --- | --- |
| V-01 | step 0・名前空 → `名前を入力してください` |
| V-02 | step 0・所属空 → `所属を入力してください` |
| V-03 | step 0・両方 trim 後あり → `null` |
| V-04 | 気づき step・未選択 → `気づきカードを1つ選んでください` |
| V-05 | 共有 step・未選択 → `共有・行動カードを1つ選んでください` |
| V-06 | 判断 step・未選択 → `判断基準カードを1つ選んでください` |
| V-07 | 一言メモ step → 常に `null`（任意） |
| V-08 | 確信度・送信確認 step → `null` |
| V-09 | 名前・所属は空白のみ不可（trim） |

### 1.8 送信ペイロード組み立て — 【要抽出】

現状: `ParticipantPage.tsx` の `submit`。

| ID | 振る舞い |
| --- | --- |
| S-01 | `rounds` 長さ 5 をそのまま保存 |
| S-02 | `participantName` / `affiliation` は trim |
| S-03 | `sceneId` は渡されたシーン ID |
| S-04 | `confidenceLevel` は 1〜5（範囲外の補正ルールを仕様で固定） |
| S-05 | レガシー `awarenessSelections` 等は全ラウンド flatMap |
| S-06 | `awarenessNote` は `【設問n】本文` を改行連結（空ラウンドはスキップ） |
| S-07 | `attentionSelected` は空配列（F2 未実装） |
| S-08 | `criteriaNote` / `actionsNote` / `attentionNote` は空文字 |
| S-09 | `id` / `createdAt` が付与される |

### 1.9 確信度 — 【要抽出】

| ID | 振る舞い |
| --- | --- |
| CF-01 | 1〜5 はそのまま |
| CF-02 | 1 未満 → 1、5 超 → 5（または拒否。仕様で固定） |

### 1.10 ベテラン差分 — `diff.ts` 【実装済み・UI 未使用】

| ID | 振る舞い |
| --- | --- |
| D-01 | テンプレ注目に無い受講者選択 → `extraAttention` |
| D-02 | 受講者が選ばなかったテンプレ注目 → `missedAttention` |
| D-03 | テンプレ判断基準の未選択 → `missedCriteria` |
| D-04 | 共通判断基準の順序一致 → `criteriaOrderHint` に「同じ並び」 |
| D-05 | 順序不一致 → テンプレ順・受講者順の両方を含むヒント |
| D-06 | 共通項目なし → 「比較できる共通の判断基準が少ない」 |
| D-07 | 推奨行動の未選択 → `missedRecommendedActions` |
| D-08 | 返却にスコア・正誤フラグなし（`DiffSummary` キーのみ） |
| D-09 | 5 問分の `rounds` を `aggregate*` 経由で比較 |

### 1.11 OJT 出力 — 【未実装】

新規: `shared/src/ojtExport.ts`（予定）。

| ID | 振る舞い |
| --- | --- |
| O-01 | `DiffSummary` + `veteranTemplate.ojtChecklist` → 確認項目テキスト配列 |
| O-02 | 空差分でも例外にならない |
| O-03 | 文言に「不正解」等のスコア表現を含めない |

### 1.12 判断基準の並べ替え — 【未実装】（将来 F4）

新規: `shared/src/criteriaOrder.ts`（予定）。MVP は単一選択。

| ID | 振る舞い |
| --- | --- |
| CO-01 | 選択追加で順序末尾 |
| CO-02 | 選択解除で順序から削除 |
| CO-03 | moveUp / moveDown |
| CO-04 | 先頭/末尾での move 無効 |

---

## 2. 永続化 — `storage.ts` 【実装済み】

| ID | 振る舞い |
| --- | --- |
| ST-01 | 初回 `loadSettings` → デモ seed 相当 + 保存 |
| ST-02 | `saveSettings` → `loadSettings` で一致 |
| ST-03 | 保存時 `normalizeSettings` が走る |
| ST-04 | `scenes` 空 → デモにフォールバック |
| ST-05 | settings JSON 破損 → デモにフォールバック |
| ST-06 | `loadResponses` 初回 → `[]` |
| ST-07 | responses JSON 破損 → `[]` |
| ST-08 | `appendResponse` → 先頭が最新 |
| ST-09 | `saveResponses` / `appendResponse` で `expertEye360-storage` 発火 |
| ST-10 | `resetDemoData` → settings 初期化・responses 空（UI からは削除済み・API 残存） |

---

## 3. デモデータ — `seed.ts` 【実装済み】

| ID | 振る舞い |
| --- | --- |
| SD-01 | `scenes.length >= 1` |
| SD-02 | 各シーン `questionCards.length === 5`（または正規化後） |
| SD-03 | 各カード配列 `length <= 5` |
| SD-04 | `veteranTemplate` 必須フィールド存在 |
| SD-05 | `tourUrl` 存在 |

---

## 4. 受講者アプリ（`participant-web`）

### 4.1 シーン・データソース 【実装済み】

| ID | 振る舞い |
| --- | --- |
| P-01 | `settings.scenes[0]` のみ使用（シーン切替なし） |
| P-02 | `scenes` 空 → 警告文表示・フォーム非表示 |
| P-03 | 各ラウンドの choices は `getSceneQuestionCards(scene, round)` + `limitChoices` |

### 4.2 画面遷移（step） 【実装済み】

| ID | 振る舞い |
| --- | --- |
| P-10 | intro → 設問1 気づき（step 0→1） |
| P-11 | 各ラウンド: 気づき→共有→判断→一言（4 step） |
| P-12 | 設問5 一言の next → 確信度（20→21） |
| P-13 | 確信度 → 送信確認 → 送信完了 |
| P-14 | `back` で step 減少、intro で back 非表示 |
| P-15 | 送信確認の next で保存（ラベル「回答を送信」） |
| P-16 | 完了後「別の回答」で `resetForm`（step 0・入力クリア） |

### 4.3 バリデーション連携 【実装済み・要抽出テスト】

| ID | 振る舞い |
| --- | --- |
| P-20 | `tryNext` 失敗時 step 不変 |
| P-21 | 警告表示後、入力/選択で警告クリア |
| P-22 | `goBack` で警告クリア |

### 4.4 ラウンド独立性 【実装済み】

| ID | 振る舞い |
| --- | --- |
| P-30 | ラウンド2 以降、前ラウンドの選択は引き継がない |
| P-31 | 各ラウンドの `roundNote` は独立 |

### 4.5 未実装・将来

| ID | 振る舞い |
| --- | --- |
| P-40 | 注目箇所選択（F2）step の追加 |
| P-41 | 判断基準のドラッグ並べ替え（F4 本番） |
| P-42 | シーン ID の URL 連携（3DVista 同期・要決定） |

### 4.6 `useAppData` 【実装済み】

| ID | 振る舞い |
| --- | --- |
| H-01 | 初期 state が `loadSettings` / `loadResponses` と一致 |
| H-02 | `addResponse` 後 `responses` 更新 |
| H-03 | `expertEye360-storage` で refresh |

---

## 5. 管理者アプリ（`admin-web`）

### 5.1 ツアー URL 【実装済み】

| ID | 振る舞い |
| --- | --- |
| A-01 | ツアー URL 表示・編集 |
| A-02 | 保存で `settings.tourUrl` 更新・永続化 |

### 5.2 シーン CRUD 【実装済み】

| ID | 振る舞い |
| --- | --- |
| A-10 | シーン追加 → 空の 5 問カード・`veteranTemplate` 空テンプレ |
| A-11 | シーン削除（確認ダイアログ） |
| A-12 | シーン保存 → `editorDraftToScene` + 正規化（`questionCards` 5 件） |
| A-13 | 一覧でアクティブシーン選択 |

### 5.3 受講者反映シーン 【実装済み】

| ID | 振る舞い |
| --- | --- |
| A-20 | 一覧先頭のみ「受講者UI」 |
| A-21 | `promoteSceneToParticipant` → 対象を `scenes[0]` に移動 |
| A-22 | 先頭以外編集中は警告表示 |

### 5.4 設問別カード編集 【実装済み】

| ID | 振る舞い |
| --- | --- |
| A-30 | 設問 1〜5 タブ切替 |
| A-31 | 各設問で気づき・判断・共有を 5 スロット入力 |
| A-32 | 保存後 `questionCards[n]` が受講者設問 n に対応 |

### 5.5 回答一覧・詳細 【実装済み】

| ID | 振る舞い |
| --- | --- |
| A-40 | 回答一覧（新しい順） |
| A-41 | 名前・所属（無ければ —）・シーン名表示 |
| A-42 | 詳細で 5 設問分（気づき/共有/判断/一言） |
| A-43 | 旧形式回答 → `getSubmissionRounds` で表示 |
| A-44 | 全回答削除 |

### 5.6 UI から外れている（方針決定後にテスト追加）

| ID | 機能 | 備考 |
| --- | --- | --- |
| A-50 | ベテラン模板の編集 UI | 型・seed は残存 |
| A-51 | `computeDiff` 表示 | `diff.ts` のみ。UI 復活時に結合 |
| A-52 | デモリセットボタン | `resetDemoData` は storage に残存 |
| A-53 | ダッシュボード集計（F8） | 未実装 |
| A-54 | OJT エクスポート UI（F9） | 未実装 |

### 5.7 `useAppData` 【実装済み】

受講者と同型（H-01〜H-03）。

---

## 6. 横断・非機能

| ID | 項目 | テスト化 |
| --- | --- | --- |
| X-01 | 受講者(5173)/管理者(5174)は別オリジンで localStorage 非共有 | ドキュメント + E2E |
| X-02 | 同一オリジン時 storage イベントで双方 refresh | `useAppData` 結合 |
| X-03 | 認証・API | 将来（現 MVP は localStorage のみ） |

---

## 7. 仕様 ID（F1〜F9）との対応

| 機能 ID | 内容 | 現行 MVP | 主なテスト ID |
| --- | --- | --- | --- |
| F1 | ベテラン判断テンプレート | UI なし（空テンプレ保持） | SQ, SD, A-50 |
| F2 | 注目箇所 | 未実装 | P-40, S-07 |
| F3 | 気づき＋一言 | 5 問×単一選択＋メモ | V, S, P-11 |
| F4 | 判断基準（並べ替え） | 単一選択のみ | CO, D |
| F5 | 共有・行動 | 単一選択 | V, S |
| F6 | 確信度 | 1〜5 ボタン | CF, S |
| F7 | 差分表示 | `computeDiff` のみ | D, A-51 |
| F8 | ダッシュボード | 回答一覧のみ | A-40, ST |
| F9 | OJT 引き継ぎ | 未実装 | O, A-54 |

---

## 8. 推奨 TDD 実施順

| 順 | テストファイル（予定） | 主な ID |
| --- | --- | --- |
| 1 | `choices.test.ts` | C |
| 2 | `judgmentFlow.test.ts` | JF, JR |
| 3 | `sceneQuestions.test.ts` | SQ |
| 4 | `cardSlots.test.ts`（shared へ移動後） | SL |
| 5 | `selection.test.ts` | SS |
| 6 | `validateStep.test.ts` | V |
| 7 | `buildSubmission.test.ts` | S, CF |
| 8 | `diff.test.ts` | D |
| 9 | `storage.test.ts` | ST |
| 10 | `seed.test.ts` | SD |
| 11 | `useAppData.test.ts` | H |
| 12 | `ojtExport.test.ts` | O |
| 13 | `*.test.tsx`（スモーク） | P-01,02 等 |

---

## 9. Phase 提案

| Phase | スコープ | 目的 |
| --- | --- | --- |
| **0** | Vitest 導入 + choices / judgmentFlow / sceneQuestions | 既存ロジックの固定 |
| **1** | selection / validateStep / buildSubmission の shared 抽出 + テスト | 受講者コアを TDD 化 |
| **2** | storage / seed / cardSlots | 永続化・管理者保存の契約 |
| **3** | diff +（方針後）管理画面への差分 or OJT | F7 / F9 |
| **4** | UI スモーク + Playwright（5 問フロー） | 回帰 |

**Phase 0〜2**: 今の実装を正としてテストで固定。  
**Phase 3 以降**: 先にテストを書いてから UI/API を足す。

---

## 10. 機能 ID ↔ テストファイル（参照）

| 機能 ID | 主なテストファイル |
| --- | --- |
| F1 | `sceneQuestions.test.ts`, `storage.test.ts`, `seed.test.ts` |
| F2 | `buildSubmission.test.ts`, `choices.test.ts` |
| F3 | `validateStep.test.ts`, `buildSubmission.test.ts` |
| F4 | `criteriaOrder.test.ts`（将来） |
| F5 | `validateStep.test.ts`, `buildSubmission.test.ts` |
| F6 | `buildSubmission.test.ts` |
| F7 | `diff.test.ts` |
| F8 | `storage.test.ts`, `AdminPage.test.tsx`（薄） |
| F9 | `ojtExport.test.ts` |

---

*公式プロダクト仕様は [README.md](../README.md) および [TECHNICAL-SPEC.md](./TECHNICAL-SPEC.md) を優先すること。*
