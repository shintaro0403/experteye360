# ExpertEye360 テスト設計書

本書は、[TECHNICAL-SPEC.md](./TECHNICAL-SPEC.md) に基づき、**実装ファイルと同じ単位でテストを置く** TDD 設計である。

**スコープ・Phase・作業順の正本**: [§1.2 テストスコープとマイルストーン](#12-テストスコープとマイルストーン)（未決定は [§1.3](#13-未決定事項)）

**機能の洗い出し（テスト単位の一覧）**: [TDD-FEATURE-INVENTORY.md](./TDD-FEATURE-INVENTORY.md)

**テストコードの書き方・テンプレ（種別ごとの型）**: [TEST-TEMPLATES.md](./TEST-TEMPLATES.md)

**文書と実装の整合**: [DOC-ALIGNMENT.md](./DOC-ALIGNMENT.md)

**記載形式**: 横並び表（`| … |`）は使わない。[DOC-ALIGNMENT.md §0](./DOC-ALIGNMENT.md#0-記載ルール) の縦ブロックに従う。

**機能ごとの実装フロー（6 ステップ）**: [§2.0.4](#204-機能ごとの実装フロー6-ステップ)

**テストの粒度（大→中→小で進める）**: [§2.0.5](#205-テストの粒度大中小)

**永続化（本番）**: [SPREADSHEET-DATA.md](./SPREADSHEET-DATA.md) — Google スプレッドシート + Sheet API

**対応ルール**: 実装 `foo.ts` に対し、同ディレクトリに `foo.test.ts` を置く（コロケーション）。

## 目次

- [0. 読み方（人間と AI）](#0-読み方)
- [1. 文書情報](#1-文書情報)
  - [1.1 改訂履歴](#11-改訂履歴)
  - [1.2 テストスコープとマイルストーン](#12-テストスコープとマイルストーン)
  - [1.4 講師・管理者ダッシュボードと PDF エクスポート（機能 ID: F7）](#14-講師管理者ダッシュボードと-PDF-エクスポート)
  - [1.5 入室・マルチテナント](#15-入室マルチテナント)
  - [1.3 未決定事項](#13-未決定事項)
- [2. 方針（要約）](#2-方針)
  - [2.0 現状の問題と解決策（テスト観点）](#20-現状の問題と解決策)
  - [2.3 永続化とテスト](#23-永続化とテスト)
  - [2.1 テストピラミッド（技術分類）](#21-テストピラミッド)
  - [2.2 テスト記述の原則](#22-テスト記述の原則)
  - [2.4 テスト重要度（A / B / C）](#24-テスト重要度)
- [3. ファイル対応一覧](#3-ファイル対応一覧)
  - [3.1 shared/src（ドメイン・永続化）](#31-shared/src)
  - [3.2 participant-web/src](#32-participant-web/src)
  - [3.3 admin-web/src](#33-admin-web/src)
- [4. テストケース（ファイル別）](#4-テストケース)
  - [4.1 shared/src/choices.ts → choices.test.ts](#41-shared/src/choicests-choicestestts)
  - [4.2 shared/src/storage/local.ts → storage.test.ts（開発用）](#42-shared/src/storage/localts-storagetestts)
  - [4.3 shared/src/seed.ts → seed.test.ts](#43-shared/src/seedts-seedtestts)
  - [4.4 shared/src/types.ts](#44-shared/src/typests)
  - [4.5 shared/src/submission.ts（新規）→ submission.test.ts](#45-shared/src/submissionts-submissiontestts)
  - [4.6 shared/src/sceneQuestions.ts の normalizeScene → sceneQuestions.test.ts](#46-sharedsrcscenequestionsts-の-normalizescene--scenequestionstestts)
  - [4.7 shared/src/pdfExport.ts → pdfExport.test.ts](#47-shared/src/pdfExportts-pdfExporttestts)
  - [4.8 shared/src/ojtExport.ts → ojtExport.test.ts](#48-shared/src/ojtExportts-ojtExporttestts)
  - [4.9 shared/src/test/fixtures.ts（補助）](#49-shared/src/test/fixturests)
  - [4.10 participant-web/src/hooks/useAppData.ts → useAppData.test.ts](#410-participant-web/src/hooks/useAppDatats-useAppDatatestts)
  - [4.11 participant-web/src/pages/ParticipantPage.tsx → ParticipantPage.test.tsx](#411-participant-web/src/pages/ParticipantPagetsx-ParticipantPagetesttsx)
  - [4.12 admin-web/src/pages/AdminPage.tsx → AdminPage.test.tsx](#412-admin-web/src/pages/AdminPagetsx-AdminPagetesttsx)
- [5. 機能 ID ↔ ファイル対応（参照用）](#5-機能-ID-↔-ファイル対応)
- [6. ディレクトリ構成（完成形）](#6-ディレクトリ構成)
- [7. TDD 実施順（ファイル単位）](#7-TDD-実施順)
- [8. Phase 完了チェックリスト（ファイル別）](#8-Phase-完了チェックリスト)
- [8.1 iframe レイアウト（手動・E2E）](#81-iframe-レイアウト)
- [9. CI・未決定](#9-CI未決定)
- [10. 参照](#10-参照)

---


## 0. 読み方（人間と AI）

この文書は **正本** であり、同じ内容の要約ファイルを別に増やさない。読みやすくするための入口は本節に置き、詳細は後続の節に残す。

#### 人間がまず読む範囲

**1 — Phase**

- **見る場所** — [§1.2 テストスコープとマイルストーン](#12-テストスコープとマイルストーン)
- **見る内容** — いま何をやる段階か。Phase 0 / 1 / 2 / 2.5 / 3 / 4 のどこか

**2 — 人間チェック**

- **見る場所** — [§2.4 テスト重要度（A / B / C）](#24-テスト重要度)
- **見る内容** — A は必ず人間が確認、B は代表ケースだけ、C は自動テスト・AI に寄せる

**3 — 手動で見る画面**

- **見る場所** — [§1.5 入室・マルチテナント](#15-入室マルチテナント)、[§8.1 iframe レイアウト（手動・E2E）](#81-iframe-レイアウト)
- **見る内容** — 研修コード、管理者コード、画面幅、受講者送信から管理者表示、client / room 漏洩

**4 — 完了判定**

- **見る場所** — [§8 Phase 完了チェックリスト（ファイル別）](#8-Phase-完了チェックリスト)
- **見る内容** — その Phase を次へ進めてよいか

#### AI が作業するときの入口

**1 — 作業順**

- **見る場所** — [§2.0.4 機能ごとの実装フロー（6 ステップ）](#204-機能ごとの実装フロー6-ステップ)
- **使い方** — 受け入れ条件 → 振る舞いテスト → 実装 → 単体 → リファクタの順を崩さない

**2 — 対象ファイル**

- **見る場所** — [§3 ファイル対応一覧](#3-ファイル対応一覧)、[§4 テストケース（ファイル別）](#4-テストケース)
- **使い方** — `foo.ts` と `foo.test.ts` を同じ粒度で扱う

**3 — 振る舞い ID**

- **見る場所** — [TDD-FEATURE-INVENTORY.md](./TDD-FEATURE-INVENTORY.md)
- **使い方** — C-01、V-04、SH-07 などの ID は辞書として検索する。目次に全 ID を並べない

#### 更新ルール

**重複禁止** — `TEST-OVERVIEW.md` や `HUMAN-CHECKLIST.md` のような別要約を作らない。同じチェックリストを複数ファイルに置くと片方だけ古くなるため。

**入口は短く、正本は一つ** — 読みやすさが必要な場合は本節・§1.2・§2.4・§8 の先頭を直す。詳細 TC は §4 と INVENTORY に残す。

**人間向けと AI 向けを混ぜない** — 人間に読ませる文は「どこを見るか」「何を判断するか」に絞る。AI 向けにはファイル名・関数名・ID を明記する。

---

## 1. 文書情報

- **対象**: `shared/src`（最優先）→ `participant-web` / `admin-web`
- **関連仕様**: [TECHNICAL-SPEC.md](./TECHNICAL-SPEC.md) §3.2.3・§3.2.4（iframe レイアウト）、§4（F3〜F8）、§5（永続化）
- **永続化仕様**: [SPREADSHEET-DATA.md](./SPREADSHEET-DATA.md)
- **現状**: **Vitest 導入済み**（ルート `npm test` は 14 files / 89 tests Green）。Phase 0 / 1 / 2 は Green。Sheet API は GAS、`storage/sheet.ts`、`VITE_STORAGE_BACKEND=sheet`、受講者・管理者画面配線、管理画面からの研修コード変更まで最小実装済み。入室 UI（研修コード・管理者コード）は **local / sheet** 対応。Phase 3 は `pdfExport` / `ojtExport` の共有ロジック入口、PDF ダウンロード UI 代表テスト、開ける最小 PDF 構造、日本語対応、`pdf.html` の主要デザイン要素反映、目視フィードバック反映、長文折り返し・可変高さ、コンテンツ量に応じた複数ページ化まで Green（実 PDF 目視・OJT UI は未）。名前・所属・一言メモの文字数上限も Green

### 1.1 改訂履歴

**0.1**（2026-05-18）— 初版（機能 ID 別）

**0.2**（2026-05-18）— **ソースファイル対応**に再構成

**0.3**（2026-05-18）— **テスト記述の原則**（§2.2）を追加

**0.4**（2026-05-18）— 受講者 iframe レイアウトの受け入れ（§8.1）を追加

**0.5**（2026-05-19）— [TDD-FEATURE-INVENTORY.md](./TDD-FEATURE-INVENTORY.md) を追加（機能一覧の参照先）

**0.6**（2026-05-20）— 機能一覧・手動テスト節との参照整合

**0.7**（2026-05-20）— 横並び表をやめ、縦書きブロック形式に統一

**0.8**（2026-05-20）— 本番永続化をスプレッドシート化（§2.3、§3、§4.2、§7 Phase 2.5）。[SPREADSHEET-DATA.md](./SPREADSHEET-DATA.md) を参照

**0.9**（2026-05-20）— §2.0 現状の問題と解決策、`sheetApi` の room 系 TC、SH 系 ID 対応

**1.0**（2026-05-20）— ブック構成確定（マスター clients + settings/rooms/responses/audit_logs）。rooms・verify の TC 追記

**1.2**（2026-05-20）— README 準拠で 5 問手動（§4.12）・入室（研修コード）・管理者 iframe 手動（§8.1）を整理

**1.3**（2026-05-21）— **§1.2 テストスコープとマイルストーン**・**§1.3 未決定事項**を追加。Phase 定義と実施順の正本を本書に集約（旧 §7 は §1.2 へ統合）

**1.4**（2026-05-21）— **§1.4 F7 ダッシュボード・PDF** を追加。回答済み定義・jsPDF 項目を確定（D-05 決定）

**1.5**（2026-05-21）— **§1.5 入室・マルチテナント** を追加。研修コード（受講者・名前前）・管理者コード（管理者・研修コード不要）・ローカル本番近似（D-06 / D-07 / D-08 決定）

**1.6**（2026-05-21）— **§2.0.5 テストの粒度（大→中→小）** を追加。Phase 0 作業順を中粒度優先に更新

**1.7**（2026-05-21）— **§2.0.4 機能ごとの実装フロー（6 ステップ）** を正本として追加

**1.8**（2026-05-21）— 旧機能 ID の記述削除。OJT TC 整理

**1.9**（2026-05-25）— **§0 読み方（人間と AI）** を追加。目次は章・主要節中心にし、細かい TC/ID は本文検索用に整理

**2.0**（2026-05-25）— Phase 2 の `storage` / `seed` テスト追加と、Phase 2.5 の Sheet API 契約入口・`storage/sheet.ts` 最小実装を反映

**2.1**（2026-05-26）— Sheet API 契約 TC-005〜013、`rooms/access-code`、管理画面の研修コード変更 UI テスト、PDF ダウンロード UI 代表テスト、開ける最小 PDF 構造・日本語対応・`pdf.html` デザイン参照テスト・目視フィードバック反映テスト・長文折り返しテスト、14 files / 86 tests Green を反映

**2.2**（2026-05-26）— 名前・所属 10 文字、一言メモ 30 文字の上限制御と `validateStep.test.ts` 境界値テスト、14 files / 88 tests Green を反映

**2.3**（2026-05-26）— PDF のコンテンツ量に応じた複数ページ化と `pdfExport.test.ts` のページ数・ページ番号テスト、14 files / 89 tests Green を反映

### 1.2 テストスコープとマイルストーン

**本節がテスト計画の正本**である。Phase の意味・含める／含めない範囲・作業順はここを優先する。

#### [README.md](../README.md) / [TECHNICAL-SPEC.md](./TECHNICAL-SPEC.md)

**役割** — プロダクト要件の正

#### [SPREADSHEET-DATA.md](./SPREADSHEET-DATA.md)

**役割** — 本番永続化・API 契約の正

#### [TDD-FEATURE-INVENTORY.md](./TDD-FEATURE-INVENTORY.md)

**役割** — 振る舞い ID（C-01、V-04 等）とファイル対応の辞書。**Phase は書かない**

**現在のマイルストーン**: **Phase 2.5 継続 + Phase 3 入口 Green**（本番永続化は Sheet API 契約・GAS・画面配線・研修コード変更 UI・Sheet API mock Playwright まで Green。実環境分離確認は継続。Phase 3 は `pdfExport` / `ojtExport` の共有ロジック入口まで Green）

**2 つの優先軸**（混同しない）

#### **Phase**

**意味** — **いつやるか**（マイルストーン・作業順）
**例** — Phase 0 で `choices.test.ts`

#### **A / B / C**（§2.4）

**意味** — **人間がどこまで確認するか**（受け入れの厳しさ）
**例** — room 漏洩は A、`choices` は C

#### マイルストーン一覧

#### 0

**Phase** — **0**
**ゴール（1行）** — テスト基盤＋既存ドメインロジックの固定
**含めるもの** — ルート Vitest、`choices` / `judgmentFlow` / `sceneQuestions` のテスト、`roomEntry.test`、`test/fixtures.ts`
**含めないもの** — UI 抽出、Sheet API、GAS、**研修コード API 照合**
**完了条件** — §8「Phase 0」のチェックリストがすべて [x]

#### 1

**Phase** — **1**
**ゴール（1行）** — 受講者コアを `shared` に集約してテスト
**含めるもの** — `selection` / `validateStep` / `buildSubmission`（`ParticipantPage` から抽出）、`cardSlots` の shared 移動
**含めないもの** — F7 PDF
**完了条件** — §8「Phase 1」のチェックリストがすべて [x]

#### 2

**Phase** — **2**
**ゴール（1行）** — 開発用永続化・管理者保存の契約
**含めるもの** — `storage`（local）、`seed`、`sceneQuestions`（管理者正規化）
**含めないもの** — Sheet API、**rooms/verify API**
**完了条件** — §8「Phase 2」のチェックリストがすべて [x]

#### 2.5

**Phase** — **2.5**
**ゴール（1行）** — 本番永続化（スプレッドシート）
**含めるもの** — `storage/sheet.ts`、`sheetApi.test.ts`（`fetch` mock）、`VITE_STORAGE_BACKEND`、研修コード検証 API、管理者 token 変更、研修コード変更 API
**含めないもの** — GAS の実装詳細を Unit に載せない（契約のみ）
**完了条件** — §8「Phase 2.5」のチェックリストがすべて [x]

#### 3

**Phase** — **3**
**ゴール（1行）** — F7 PDF・UI 配線・OJT
**含めるもの** — `pdfExport`（入口実装済み。`pdf.html` の主要デザイン要素、目視フィードバック、長文折り返し・可変高さ、コンテンツ量に応じた複数ページ化まで Green。実 PDF 目視確認は継続）、`AdminPage` エクスポート UI、薄い `*.test.tsx`、`ojtExport`（F8・入口実装済み）
**含めないもの** — Playwright 本格（Phase 4）
**完了条件** — §8「Phase 3」

#### 4

**Phase** — **4**
**ゴール（1行）** — E2E・回帰
**含めるもの** — Playwright（5 問フロー）、§8.1 の自動化（任意）
**含めないもの** — —
**完了条件** — リリース前の代表 E2E Green

**方針**

- **Phase 0〜2**: いま動いている実装を正としてテストで固定する（リファクタ＋テスト追加）。
- **Phase 2.5 以降**: 契約テストを先に Red → Green。UI は §1.3 の未決定が解消してから本格実装。

#### 機能スコープ（README 対応）

#### §1 気づきカード

**README / 機能** — §1 気づきカード
**現行実装** — あり（5 問・単一選択）
**今回マイルストーン** — Phase 0〜1
**主なテスト** — `choices`, `validateStep`, 手動 §4.12
**備考** — —

#### §2 共有・行動カード

**README / 機能** — §2 共有・行動カード
**現行実装** — あり（単一選択）
**今回マイルストーン** — Phase 0〜1
**主なテスト** — 同上
**備考** — 単一選択で固定（仕様済み）

#### §3 判断基準

**README / 機能** — §3 判断基準
**現行実装** — **単一選択のみ**
**今回マイルストーン** — Phase 0〜1
**主なテスト** — `choices`, `validateStep` 等
**備考** — —

#### §4 一言メモ

**README / 機能** — §4 一言メモ
**現行実装** — あり（任意）
**今回マイルストーン** — Phase 0〜1
**主なテスト** — `validateStep`
**備考** — —

#### §5 確信度（5 段階・必須）

**README / 機能** — §5 確信度（5 段階・必須）
**現行実装** — あり
**今回マイルストーン** — Phase 0〜1
**主なテスト** — `buildSubmission`, `validateStep`
**備考** — §1.3 **D-11**

#### 5 問フロー（4 画面×5）

**README / 機能** — 5 問フロー（4 画面×5）
**現行実装** — あり
**今回マイルストーン** — Phase 0 + 手動 A
**主なテスト** — `judgmentFlow`, §4.12
**備考** — step 0〜23

#### §6 講師・管理者画面（F7）

**README / 機能** — §6 講師・管理者画面（F7）
**現行実装** — 回答済み一覧・詳細のみ
**今回マイルストーン** — 一覧は現状、PDF 共有ロジック入口と管理者 UI は Phase 3 で Green。PDF は `pdf.html` の主要デザイン要素、目視フィードバック、長文折り返し・可変高さ、コンテンツ量に応じた複数ページ化まで Green。実 PDF 目視確認は Phase 3 継続
**主なテスト** — `sheetApi`, `AdminPage`, `pdfExport`
**備考** — §1.4。一覧は回答済みのみ・保存順表示

#### §7 OJT 整理

**README / 機能** — §7 OJT 整理
**現行実装** — 共有ロジック入口あり（`ojtExport.ts` / `ojtExport.test.ts` は Green）
**今回マイルストーン** — Phase 3（F8）。UI / ファイル出力は継続
**主なテスト** — `ojtExport`
**備考** — PDF（F7）とは別機能

#### 研修コード入室（受講者）

**README / 機能** — 研修コード入室（受講者）
**現行実装** — **あり**（UI + `roomEntry`・local 平文照合 / Sheet API `rooms/verify`）
**今回マイルストーン** — Phase 0（`roomEntry.test`）〜2.5（API）
**主なテスト** — `roomEntry`, `sheetApi` TC-010, `ParticipantPage` ENTRY
**備考** — §1.5

#### 管理者コード入室

**README / 機能** — 管理者コード入室
**現行実装** — **あり**（UI + `adminEntry`・local / Sheet API token）
**今回マイルストーン** — 同上
**主なテスト** — `adminEntry`, `sheetApi` TC-012〜013, `AdminPage` ADM-ENTRY
**備考** — §1.5

#### clientId / room 分離

**README / 機能** — `clientId` / `room` 分離
**現行実装** — `sheetApi.test.ts` と `storage/sheet.ts` で、`?client=`、`room`、`token`、`rooms/verify`、`admin/token`、`rooms/access-code` の契約を固定済み。GAS と `VITE_STORAGE_BACKEND=sheet` の画面配線も最小実装済み。Sheet API mock 経由の Playwright は Green
**今回マイルストーン** — Phase 2.5
**主なテスト** — `sheetApi` TC-005〜009
**備考** — §1.5・**D-07** 本番近似・**D-09**

#### 受講者 scenes[0] 固定

**README / 機能** — 受講者 `scenes[0]` 固定
**現行実装** — あり
**今回マイルストーン** — Phase 0〜2（現状維持）
**主なテスト** — `sceneQuestions`
**備考** — §1.3 **D-12**

#### iframe レイアウト

**README / 機能** — iframe レイアウト
**現行実装** — あり
**今回マイルストーン** — 手動 **A**（全 Phase）
**主なテスト** — §8.1 L-01〜L-08
**備考** — Vitest 化は Phase 4

#### Phase 0 — 作業順

**進め方の正本**: [§2.0.5](#205-テストの粒度大中小)（いきなり JF-01 単体から書かず、**中**で芯を固定してから **小** に分割）

1. ルート `vitest.config.ts` + `npm test`（`@shared` エイリアス・happy-dom）— 完了済み
2. `shared/src/test/fixtures.ts` — 完了済み
3. **中** — `judgmentFlow.test.ts`（5 問 step の代表経路。JF/JR の芯を少数の `it` にまとめる）
4. **中** — `sceneQuestions.test.ts`（正規化・取得の代表。SQ-01 / SQ-04 / SQ-06 等）
5. **小** — `choices.test.ts`（ID: C）— 完了済み。境界の追加分のみ
6. **小** — `roomEntry.test.ts`（ENTRY）— 完了済み
7. デバッグ・回帰で必要になったら、上記 **中** を JF-01 等の **小** に分割（inventory の ID 単位）

#### Phase 1 — 作業順

1. `shared/src/cardSlots.ts` へ `CardSlotsField` ロジックを移動 → `cardSlots.test.ts`（ID: SL）
2. `shared/src/selection.ts`（`selectSingle` 抽出）→ `selection.test.ts`（ID: SS）
3. `shared/src/validateStep.ts` 抽出 → `validateStep.test.ts`（ID: V）
4. `shared/src/submission.ts`（`buildSubmission` 等）→ `submission.test.ts`（ID: S, CF）
5. `ParticipantPage.tsx` が上記 shared のみを呼ぶことを確認（重複ロジック削除）

#### Phase 2 — 作業順（概要）

1. `storage.test.ts`（local・ID: ST）
2. `seed.test.ts`（ID: SD）
3. 管理者保存は `sceneQuestions.test.ts` で `normalizeScene` / `normalizeSettings` を継続検証

#### Phase 2.5 — 作業順（概要）

1. `sheetApi.test.ts` を **先に** Red → Green（§4.2b TC-001〜013 と `rooms/access-code`。TC-008〜009 は **A**）
2. `storage/sheet.ts` + `storage/index.ts` + `VITE_STORAGE_BACKEND`
3. 受講者: 研修コード UI → `rooms/verify`（§1.5）。管理者: 管理者コードゲート（§1.5）
4. ローカル結合は **本番近似**（§1.5・D-07）：`sheet` mock または dev GAS。入室スキップしない
5. 手動 **A**: 受講者（研修コード→送信）→ 管理者（管理者コードのみ）で同一 `client` の回答確認（SH-07）

#### Phase 3 — 作業順（F7 PDF・F8 OJT）

1. `shared/src/pdfExport.ts`（入口実装済み。`pdf.html` の主要デザイン要素、目視フィードバック、長文折り返し・可変高さ、コンテンツ量に応じた複数ページ化まで Green。実 PDF 目視確認は継続。§1.4）→ `pdfExport.test.ts`（ID: PDF）
2. `admin-web` 回答済み一覧から **1 件選択 → PDF ダウンロード**（手動 **B**、代表ケース **A**）
3. `useAppData.test.ts`（両 Web）
4. `ojtExport.test.ts`（F8・OJT 用。F7 PDF とは別ファイル。入口実装済み）
5. 薄い `*.test.tsx` スモーク

#### Phase 4 — 概要

- Playwright、§8.1 の一部自動化

### 1.4 講師・管理者ダッシュボードと PDF エクスポート（機能 ID: F7）

**利用者向けの説明**: [README.md §6](../README.md)（「講師・管理者向け画面」）。本節はテスト・実装用の ID **F7** で整理する。

**関連**: [TECHNICAL-SPEC.md §4](./TECHNICAL-SPEC.md)

#### 回答済みの定義（一覧の対象）

#### **回答済み**

**仕様** — `appendResponse` 済みの `ParticipantSubmission` **1 件 = 1 行**（本番は `POST responses` で `responses` シートに 1 行追記）。管理者の回答一覧は **この行だけ**を表示する

一覧は **回答済みのみ**、**保存順**で表示する。`AdminPage` / `sheetApi` のテストは件数一致・詳細表示を中心とする。

#### PDF エクスポート（回答済み 1 件につき 1 ファイル）

#### 単位

**仕様** — **受講者 1 人 × 送信完了 1 件 = PDF 1 ファイル**

#### トリガー

**仕様** — 管理者ダッシュボードの回答済み一覧から選択しエクスポート

#### 生成

**仕様** — ブラウザ側の `shared/src/pdfExport.ts` で PDF バイナリを生成する（サーバー／GAS で PDF 生成しない）

#### ページ分割

**仕様** — 設問カードの高さが残り領域を超える場合は次ページへ送る。各ページの `PAGE n / total` と PDF の `/Pages /Count` は実ページ数に合わせる。

#### 入力データ

**仕様** — `ParticipantSubmission` + 当該 `Scene`（`sceneId` で紐づけ。マスタは `settings.scenes` から解決）

**PDF に含める項目（必須）**

#### ①

**内容** — **どのシーンか**
**データソース（テストで固定する例）** — `Scene.displayName`（および必要なら `vistaSceneName` / `processArea`）

#### ②

**内容** — **出題された選択肢と実際の選択**
**データソース（テストで固定する例）** — 設問 1〜5 それぞれについて、マスタ（`getSceneQuestionCards(scene, n)` の気づき・共有・判断基準）と、`rounds[n]` の `awarenessSelection` / `actionSelection` / `criteriaOrdered` の **選択ラベル**

#### ③

**内容** — **確信度**
**データソース（テストで固定する例）** — `confidenceLevel`（1〜5）と [CONFIDENCE_LABELS](../shared/src/confidence.ts) の表示文言

#### ④

**内容** — **名前・所属**
**データソース（テストで固定する例）** — `participantName` / `affiliation`（trim 後）

#### ⑤

**内容** — **一言メモ**
**データソース（テストで固定する例）** — 各ラウンドの `roundNote`（空ラウンドは省略または「—」表示。実装で固定しテストする）

**②のテスト観点（設問ごと）**

- マスタに存在するが **未選択**のカードは PDF 上で「出題のみ」または未選択であることが分かる表現にする（実装詳細は `pdfExport.ts` で固定）。
- 実際の選択がマスタ外ラベル（データ不整合）のときは **エラーにせず** PDF にそのまま出すか、テストで「フォールバック表示」を 1 パターンに固定する。

#### テストファイル・TC（予定）

#### `pdfExport.test.ts`

**重要度** — **B**（代表ダウンロード 1 件は **A**・手動）
**関連 ID** — PDF

#### `AdminPage.test.tsx`

**重要度** — B
**関連 ID** — A-40, A-53

**`pdfExport.test.ts` — TC 案**

### PDF-01

**内容** — 回答済み 1 件 + シーンを渡すと `Blob` または `Uint8Array` が返る
**期待** — サイズ > 0

### PDF-02

**内容** — PDF 生成用ペイロードに ①シーン名が含まれる
**期待** — 文字列 assert

### PDF-03

**内容** — ② 設問 1 のマスタカード一覧と選択ラベルが含まれる
**期待** — 5 問分は PDF-04 でまとめても可

### PDF-04

**内容** — ③ 確信度ラベルが含まれる
**期待** — `confidenceLevel` と一致

### PDF-05

**内容** — ④ 名前・所属が含まれる
**期待** — trim 後の値

### PDF-06

**内容** — ⑤ 一言メモ（`roundNote`）が含まれる
**期待** — 記載ありのラウンドのみでも可

### PDF-07

**内容** — `rounds` が 5 未満・破損時
**期待** — クラッシュせずエラーまたは空扱い（実装方針を 1 つに固定）

**`AdminPage` — TC 案（F7）**

#### A-40

**重要度** — B
**内容** — 回答一覧が `loadResponses` の件数と一致（local / mock API）

#### A-53

**重要度** — B
**内容** — 一覧の 1 件から PDF エクスポートを呼び出せる（`pdfExport` を mock 可）

**含めないもの（F7）**

- 複数受講者を 1 PDF にまとめる一括出力（将来必要なら別 ID で追加）
- OJT 用の確認項目リスト PDF（**F8** / `ojtExport.ts`）

### 1.5 入室・マルチテナント

**関連**: [README.md §入室とマルチテナント](../README.md#入室とマルチテナント)、[SPREADSHEET-DATA.md §2](./SPREADSHEET-DATA.md)、[TECHNICAL-SPEC.md §5.0](./TECHNICAL-SPEC.md)

#### 用語（混同しない）

#### **`clientId`**

**誰が使う** — 受講者・管理者
**役割** — 契約組織（マルチテナントの最上位）。埋め込み URL の `?client=`
**永続化（本番）** — マスター `clients`

#### **研修コード**

**誰が使う** — **受講者のみ**
**役割** — 当該研修回への入室。管理者が `rooms` に設定したコードと照合
**永続化（本番）** — `rooms.accessCodeHash`（平文はシートに保存しない）

#### **管理者コード**

**誰が使う** — **管理者のみ**
**役割** — 管理者 API・管理画面への入室。研修コードとは **別物**
**永続化（本番）** — `clients.adminTokenHash`（API では `token` を **POST ボディ**で送る／SEC-SECRET-01）

#### **`roomId`**

**誰が使う** — 受講者（検証後）・API
**役割** — 研修回 ID。受講者は研修コード検証成功後に保持し、以降 `room` クエリに付与
**永続化（本番）** — `rooms.roomId`

#### 受講者の入室フロー（UI）

#### 1

**画面** — **研修コード入力**（**名前・所属より前**。専用ステップ）
**仕様** — 受講者がコードを入力し `POST rooms/verify`（または local 模倣）で検証

#### 2a

**画面** — 検証 **成功**
**仕様** — 返却された `roomId` を `sessionStorage` 等に保持。**名前・所属**の入力欄を表示し step 0 へ進める

#### 2b

**画面** — 検証 **失敗**
**仕様** — 警告 **「正しい研修コードを入力してください」**（文言固定）。名前・所属は **表示しない**

#### 3

**画面** — 名前・所属 → 5 問フロー
**仕様** — 名前・所属は各 10 文字以内。§4.12。送信時は `client` + `room`（検証済み `roomId`）必須

**照合の意味** — 入力した研修コードは、管理者が当該 `client` の `rooms` シート（または管理者 UI）で設定した **研修コード（入室コード）** と一致すること。管理者画面に表示する「研修回」識別子（`roomId` / 表示名）と、受講者が知る **平文の研修コード** は別表現だが、検証 API で 1:1 に結びつく。

#### 管理者の入室フロー（UI）

#### **必須入力**

**仕様** — **管理者コード**（初回表示時。未検証では設定・回答一覧等の本体 UI を出さない）

#### **不要**

**仕様** — **研修コード** — 管理者は研修コードを **設定する側**であり、自分の入室に研修コードは **不要**

#### **URL**

**仕様** — `?client={clientId}` は従来どおり（`room` を URL に載せない方針は受講者側と同様）

#### **研修回の操作**

**仕様** — `rooms` の追加・`accessCode`（研修コード）の設定・有効化は、**管理者コード検証済み**のセッションでのみ。回答閲覧は `client` 配下。`room` 単位の絞り込みは UI の研修回選択（一覧）で行い、**研修コードの再入力は不要**（§1.3 **D-21** で詳細を詰めても可）

#### Sheet backend の研修コード変更

**目的** — 管理者が受講者向けの研修コードを変更でき、変更後は旧コードで入室できず、新コードだけで対象 `roomId` に入室できるようにする。

**受け入れ条件** — 管理者操作には `client` と現行の管理者 `token` が必須。対象 room は body の `roomId` で指定する。新しい研修コードは body の `nextAccessCode` で送る。平文の研修コードはシートに保存せず、GAS 側で `rooms.accessCodeHash` だけを更新する。

**成功条件** — 正しい `token` では API が成功し、以降 `rooms/verify` は新コードだけを受け付ける。不正 `token` では 401 相当のエラーになり、既存コードは変更されない。存在しない `roomId` では 403 または 404 相当のエラーになる。

**どのようにテストするか** — まず `sheetApi.test.ts` で fetch mock を使い、`POST ?path=rooms/access-code&client=...`、body `{ token, roomId, nextAccessCode }`（token はクエリに出さない／SEC-SECRET-01）、不正 token のエラー処理を Red → Green で固定する。その後 GAS 側を同じ契約に合わせる。画面 UI は API 契約が Green になってから別テストで扱う。

**コード上の期待値** — `changeTrainingCodeViaApi({ apiBaseUrl, clientId, adminToken, roomId, nextAccessCode })` が `text/plain;charset=utf-8` で JSON body を POST する。呼び出し側は HTTP エラーと GAS の `{ ok: false, status }` JSON エラーを例外として扱う。

#### 管理画面 UI からの研修コード変更

**目的** — Sheet backend 利用時も、管理者が管理画面の「研修コードを保存」から既存 room の研修コードを変更できるようにする。

**受け入れ条件** — 管理者ログイン済みで、保存対象は `primaryTrainingRoom(settings).roomId`。入力値は前後空白を除いて `nextAccessCode` として送る。空文字は送信せず「研修コードを入力してください」を表示する。Sheet backend では現行の管理者 token を使って `changeTrainingCodeAsync` を呼ぶ。local backend では従来どおり `settings.rooms[].accessCode` を更新する。

**成功条件** — Sheet backend で保存に成功したら `refresh()` を呼び、成功メッセージ「研修コードを保存しました。受講者に新しいコードを案内してください。」を表示する。失敗時は成功扱いにせず、ユーザーに保存失敗を伝える。未実装 alert は残さない。

**どのようにテストするか** — まず `storage.test.ts` で `changeTrainingCodeAsync` が Sheet backend 時に env の API 設定・管理者 token・`roomId`・`nextAccessCode` で API を呼び、保存後に storage event を発火することを Red → Green で固定する。次に `AdminPage.test.tsx` で Sheet backend の管理者ログイン済み状態を作り、入力変更 → 「研修コードを保存」で `changeTrainingCodeAsync` が呼ばれ、`refresh()` と成功メッセージに進むことを Red → Green で固定する。

**コード上の期待値** — `changeTrainingCodeAsync({ adminToken, roomId, nextAccessCode })` を `@shared/storage` から export する。`AdminPage` は Sheet backend の場合、未実装 alert ではなくこの関数を await し、成功時のみ `refresh()` する。

#### **管理者コードの変更**

**仕様** — **現在の管理者コードを知っている者のみ**変更可能（変更 API／画面は旧コード（現行 `token`）の再入力を必須とする）

#### ローカル開発（本番近似）

#### 方針

**仕様** — **本番に近い形**で開発・結合する。研修コードゲート・管理者コードゲートを **省略しない**

#### 推奨

**仕様** — `VITE_STORAGE_BACKEND=sheet` + GAS dev、または `sheetApi.test.ts` と同型の **fetch mock** で `rooms/verify` と管理者 `token` 照合を再現

#### `client`

**仕様** — 各 `*-web/.env.development` で `VITE_CLIENT_ID`（名称は実装時に確定）を固定し、本番と同様 `?client=` を付与

#### 避ける

**仕様** — 「local だから step 0 から開始」「room 無視で全回答表示」など、本番と乖離したショートカットを **結合確認の正** にしない

#### Phase 0〜2

**仕様** — `localStorage` は **Unit（`storage.test.ts`）** 用。入室 E2E は Phase 2.5 以降

#### テストファイル・TC（予定）

#### `roomEntry.test.ts`（`shared/src/roomEntry.ts` 新規）

**重要度** — B
**関連 ID** — ENTRY, SH-12

#### `adminEntry.test.ts`（`shared/src/adminEntry.ts` 新規）

**重要度** — B
**関連 ID** — ADM-ENTRY, SH-13

#### `sheetApi.test.ts`

**重要度** — B / A
**関連 ID** — TC-010, TC-012〜013

#### `ParticipantPage.test.tsx`

**重要度** — B（ENTRY は **A** 手動）
**関連 ID** — ENTRY

#### `AdminPage.test.tsx`

**重要度** — B
**関連 ID** — ADM-ENTRY

**`roomEntry.test.ts` — TC 案**

### ENTRY-01

**内容** — 検証前
**期待** — `canShowProfileFields === false`

### ENTRY-02

**内容** — `verify` 成功
**期待** — `roomId` 保持・プロフィール欄表示可

### ENTRY-03

**内容** — `verify` 失敗
**期待** — エラーメッセージが **「正しい研修コードを入力してください」**（完全一致）

**`adminEntry.test.ts` — TC 案**

### ADM-ENTRY-01

**内容** — 管理者コード未設定
**期待** — 管理 UI ロック

### ADM-ENTRY-02

**内容** — 正しいコード
**期待** — `isAdminAuthenticated === true`

### ADM-ENTRY-03

**内容** — コード変更リクエスト
**期待** — 旧コード不一致なら拒否

**`sheetApi.test.ts` — 追記 TC**

### TC-012

**重要度** — B
**内容** — 管理者 `GET settings` に不正 `token` → 401 相当

### TC-013

**重要度** — B
**内容** — 管理者コード変更 API が旧 `token` 必須（成功／失敗）

**手動受け入れ（A）**

### SH-07

**内容** — 受講者: 研修コード → 名前所属 → 送信。管理者: **管理者コードのみ**で入室し、同一 `client` の回答が見える

### ENTRY-M

**内容** — 不正研修コードで名前欄が出ないこと・警告文言

### ADM-M

**内容** — 管理者コードなしで本体 UI が出ないこと

### 1.3 未決定事項

**決定日が空の行については、新規 TC を増やさない**（Red のみ・`it.skip` / `describe.skip` で明示は可）。決定後は §1.2 の表と §4 の TC を更新する。

#### D-01

**ID** — D-01
**論点** — 最初のゴール
**候補（要約）** — A: Phase 0 のみ / B: 〜 Phase 1 / C: 〜 Phase 2.5
**影響** — 全体・スケジュール
**決定** — —

#### D-05

**ID** — D-05
**論点** — PDF（F7）
**候補（要約）** — **1 人 1 PDF**、項目 ①〜⑤。現行は `shared/src/pdfExport.ts` のブラウザ側生成を正とする
**影響** — F7、`pdfExport`
**決定** — 2026-05-21

#### D-06

**ID** — D-06
**論点** — 研修コード UI のタイミング
**候補（要約）** — **名前・所属の前**の専用ステップ。成功後のみプロフィール表示。§1.5
**影響** — 受講者 UI、`roomEntry`
**決定** — 2026-05-21

#### D-07

**ID** — D-07
**論点** — local 開発の `client` / `room`
**候補（要約）** — **本番近似**。入室検証を省略しない。`.env` で `client` 固定 + sheet mock または dev GAS
**影響** — 5173/5174 結合
**決定** — 2026-05-21

#### D-08

**ID** — D-08
**論点** — 管理者入室
**候補（要約）** — **管理者コード必須**。研修コードは **不要**（設定側）。§1.5
**影響** — 管理者 URL、API
**決定** — 2026-05-21

#### D-21

**ID** — D-21
**論点** — 管理者の回答一覧と `room`
**候補（要約）** — 全 room 一覧 / UI で room 選択のみ（研修コード再入力なし）
**影響** — `AdminPage`、`POST responses/query`
**決定** — —

#### D-09

**ID** — D-09
**論点** — `ParticipantSubmission.roomId`
**候補（要約）** — **型 + POST ボディ + クエリ `room` の両方**（同値。クエリは API 検証、ボディは行・PDF 用）
**影響** — 型、シート `room_id`、`sheetApi`
**決定** — 2026-05-21

#### D-11

**ID** — D-11
**論点** — 確信度範囲外
**候補（要約）** — クランプ 1〜5 / バリデーション拒否
**影響** — CF-02、`buildSubmission`
**決定** — —

#### D-12

**ID** — D-12
**論点** — シーン切替
**候補（要約）** — `scenes[0]` 固定継続 / URL 連携
**影響** — P-42
**決定** — —

#### D-13

**ID** — D-13
**論点** — `legacyToRounds`
**候補（要約）** — 設問1のみ中身・2〜5 空で固定
**影響** — JR-02
**決定** — —

#### D-14

**ID** — D-14
**論点** — `resetDemoData`
**候補（要約）** — API 残す / 削除
**影響** — ST-10、`POST reset`
**決定** — —

#### D-16

**ID** — D-16
**論点** — Vitest の置き場
**候補（要約）** — **ルート 1 本**（`vitest.config.ts` + `npm test` / `npm run test:watch`）
**影響** — `vitest.config`
**決定** — 2026-05-21

#### D-17

**ID** — D-17
**論点** — `cardSlots` 移動
**候補（要約）** — Phase 1 前に必須 / 後回し
**影響** — SL、管理者 UI
**決定** — —

#### D-18

**ID** — D-18
**論点** — Playwright
**候補（要約）** — Phase 4 まで不要 / 早めに導入
**影響** — E2E
**決定** — —

#### D-19

**ID** — D-19
**論点** — `attentionLabels`
**候補（要約）** — 削除 / 空固定 / 将来用
**影響** — 型、管理者
**決定** — —

#### D-20

**ID** — D-20
**論点** — `rooms` 期間外拒否
**候補（要約）** — MVP 必須 / 2.5 以降
**影響** — GAS、`startsAt`/`endsAt`
**決定** — —

**優先して決めると Phase 0 を始めやすい項目**: D-01、D-13（D-16 は決定済み）。

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

#### 2.0.4 機能ごとの実装フロー（6 ステップ）

**本リポジトリでテストを実装していくときの正本。** 1 機能（または 1 ユーザーストーリー）ごとに、次の順で繰り返す。

#### ステップ一覧

**1. 機能の受け入れ条件を書く**

- **何を書くか**: ユーザー／講師から見て「できていれば OK」の条件（Given / When / Then でも、チェックリストでもよい）
- **置き場**: [README.md](../README.md)、[TECHNICAL-SPEC.md](./TECHNICAL-SPEC.md)、本書 §1.4 / §1.5、手動節（§4.12、§8.1）、[TDD-FEATURE-INVENTORY.md](./TDD-FEATURE-INVENTORY.md) の該当節
- **粒度**: **大（L）**。この段階では `it` は書かない
- **例**: 「研修コードが正しければ名前・所属が表示される」「5 問すべて回答後、送信すると管理者一覧に 1 件増える」

**2. 機能の振る舞いテストを書く**

- **何を書くか**: 受け入れ条件を満たすかどうかを検証するテスト（最初は **Red**）
- **置き場**: `*.test.ts`（Vitest）。UI 全体ではなく **振る舞いの芯**（モジュール・API・ペイロード）
- **粒度**: **中（M）**。1 ファイルに **少数の `it`**（inventory の ID を最初から 1:1 にしない）
- **テンプレ**: [TEST-TEMPLATES.md](./TEST-TEMPLATES.md) T3〜T5、または `judgmentFlow` 代表のようなモジュール中粒度
- **例**: `roomEntry.test.ts` の verify 一式、`judgmentFlow.test.ts` で step 0→23 の代表

**3. 最小実装する**

- **何をするか**: ステップ 2 のテストが **Green** になるまでの最少コード（UI にベタ書きでも可。のちに shared へ）
- **原則**: テストに合わせて足すだけ。先回りの抽象化や全境界の Unit は書かない

**4. 実装中に複雑な内部ロジックが見えてくる**

- **何が起きるか**: 分岐・変換・正規化などが `ParticipantPage` 等に残り、`shared` へ切り出した方がよい部分がはっきりする
- **この段階では**: まだテストを増やさなくてよい。切り出し候補をメモ（inventory の【要抽出】と対応）

**5. その部分だけ単体テストを書く**

- **何を書くか**: ステップ 4 で分離した **純関数・小さなモジュール** だけを対象にしたテスト
- **粒度**: **小（S）**。1 振る舞い 1 `it`（C-01、JF-03、V-04 等）
- **テンプレ**: T1（[TEST-TEMPLATES.md](./TEST-TEMPLATES.md) §3）
- **いつ書くか**: 振る舞いテスト（**中**）が Green のあと。**最初から全体を小テストにしない**

**6. リファクタする**

- **何をするか**: 重複削除・命名・`shared` への移動。ステップ 2・5 のテストは **すべて Green のまま**
- **繰り返し**: 次の受け入れ条件／次の振る舞いへ 1 に戻る

#### 6 ステップと粒度（大・中・小）の対応

#### 1

**内容** — 受け入れ条件
**粒度** — **大**

#### 2

**内容** — 振る舞いテスト
**粒度** — **中**

#### 3

**内容** — 最小実装
**粒度** — （実装）

#### 4

**内容** — 内部ロジックの発見
**粒度** — （設計メモ）

#### 5

**内容** — 単体テスト（その部分だけ）
**粒度** — **小**

#### 6

**内容** — リファクタ
**粒度** — （実装・テストは維持）

**Red → Green → Refactor** は、主に **2 → 3 → 6** の中で回す。ステップ 5 は **4 のあと**に追加する第二の Red → Green。

#### 既存コードとの関係

- `choices.test.ts` / `roomEntry.test.ts` は、すでに存在するロジックに対する **小**／**中** の固定（ステップ 5 相当から入ったもの）。**新規機能**では 1→2→3 を先に回す
- Phase 0 の残り（`judgmentFlow`）も **2（中の振る舞いテスト）→ 3（既存実装の確認）→ 5（必要なら JF-* 分割）→ 6** の順がよい

#### 2.0.5 テストの粒度（大→中→小）

§2.0.4 の各ステップで使う **テストの大きさ**の定義。いきなり **小**（C-01、JF-03 単体など）から書き始めない。

**Phase**（§1.2）= **いつ**リリース単位で何を含めるか。**§2.0.4** = **1 機能をどう進めるか**。**本節** = そのときのテストのサイズ感。

#### 大（L）— ユーザーが触る一連の流れ

**目的**: 「この研修は動くか」を最初に確認する。自動化は後回しでもよい。

**含むもの**

- 手動 §4.12（5 問フロー一通り）
- 手動 §8.1（iframe 帯内収まり）
- 手動 ENTRY-M / ADM-M（研修コード・管理者コード）
- 手動 受講者送信 → 管理者で同一 `client` の回答が見える（SH-07）
- Phase 4: Playwright 代表シナリオ

**テンプレ**: [TEST-TEMPLATES.md](./TEST-TEMPLATES.md) **T6**  
**重要度**: 多くは **A**（§2.4）

**書き方の目安**: チェックリスト 1 本。「研修コード OK → 名前所属 → 5 問 → 送信 → 管理者で 1 件見える」程度の粒度でよい。

#### 中（M）— モジュール・契約・フロー単位

**目的**: 1 ファイル（または 1 API）で「主要経路が壊れていない」ことを Vitest で固定する。inventory の ID を **1 `it` 1 点**にしない。

**含むもの**

- `judgmentFlow.test.ts` — step 0〜23 の変換の芯（`stepToRoundPhase` の代表、`createEmptyRounds` 等を **少数の `it`** に）
- `sceneQuestions.test.ts` — `normalizeSettings` / `getSceneQuestionCards` の代表
- `submission.test.ts` — 送信ペイロード一式（S-01〜S-09 をまとめても可）
- `storage.test.ts` — 保存→読込の往復（ST）
- `sheetApi.test.ts` — fetch mock で API 契約（SH）
- `roomEntry.test.ts` / `adminEntry.test.ts` — 検証関数一式（ENTRY / ADM-ENTRY）
- `useAppData.test.ts` — フックと storage の結合（H）
- `*.test.tsx` — 配線スモーク（T5）

**テンプレ**: **T3**（API）、**T2**（local 永続化）、**T4**（ペイロード）、**T5**（薄い UI）  
**重要度**: **B** が多い（room 漏洩などは **A**）

**書き方の目安**: 1 `describe` あたり 3〜8 本の `it`。「6 件入力→5 件」と「空配列」を別 `it` にするのは **小** の段階でよい。

#### 小（S）— 関数・境界の 1 点

**目的**: **中** で Green にしたあと、バグ再発・仕様の端だけを高速に固定する。

**含むもの**

- `choices.test.ts`（C-01〜C-04）
- `judgmentFlow` の JF-01〜JF-11 を **1 ID 1 `it`** に分割したもの
- `validateStep` の V-01〜V-11 各 step
- `selection` の SS-01〜SS-03

**テンプレ**: **T1**（純関数 Unit）  
**重要度**: **C**（CI で毎回）

**いつ書くか**

- **中** のテストが失敗し、原因が 1 関数に特定できたとき
- 境界値（6 件目、step 範囲外など）を明示的に残したいとき
- すでに **小** が存在するモジュール（`choices`）への追加分

#### 推奨の進め方（新規・未テスト領域）

[§2.0.4](#204-機能ごとの実装フロー6-ステップ) の 1〜6 に従う。粒度だけ抜き出すと次のとおり。

1. **大** — ステップ 1（受け入れ条件）
2. **中** — ステップ 2（振る舞いテスト）→ ステップ 3（最小実装）
3. **小** — ステップ 5（見えた内部だけ単体テスト）→ ステップ 6（リファクタ）

#### T1〜T6 との対応

**T6** → **大**　**T3, T2, T4, T5** → **中**　**T1** → **小**

詳細なコード例は [TEST-TEMPLATES.md](./TEST-TEMPLATES.md)。

#### Phase 0 の位置づけ（現状）

- `choices.test.ts` / `roomEntry.test.ts` は **小** から着手済み（問題なし。以降は **中** 優先）
- 残りは `judgmentFlow` / `sceneQuestions` を **中** で先に Green → 必要なら **小** へ分割

### 2.3 永続化とテスト

**本番** — `storage` の裏は Sheet API → スプレッドシート（[SPREADSHEET-DATA.md](./SPREADSHEET-DATA.md)）

**開発・Unit** — `storage.ts` 内の localStorage 実装。既存 `storage.test.ts` はこの層を happy-dom で検証（将来 `storage/local.ts` に分割しても同型）

**Sheet API 層** — `storage/sheet.ts` + `sheetApi.test.ts`（`fetch` を mock）。GAS 実装とは契約テスト（リクエスト URL・body・レスポンス JSON）

**切替** — `VITE_STORAGE_BACKEND=local|sheet`（名称は実装時に確定）

**非同期** — Sheet 実装導入時は `loadSettings` 等を `async` 化する想定。`useAppData` のテストはローディング・エラー表示を追加（Phase 2.5）

### 2.1 テストピラミッド（技術分類）

§2.0.5 の **大→中→小** と併用する。下は **実行環境・ツール** による分類。

**大（L）**

- 手動（§4.12、§8.1、§1.5 手動）
- E2E（Playwright・Phase 4）

**中（M）**

- Vitest + `fetch` mock — `sheetApi.test.ts`
- Vitest + happy-dom — `storage.test.ts`、`useAppData.test.ts`
- Vitest 純関数だが **1 モジュール少数 `it`** — `judgmentFlow.test.ts`、`sceneQuestions.test.ts`、`submission.test.ts`
- Vitest + Testing Library — 薄い `*.test.tsx`

**小（S）**

- Vitest 純関数 — `choices.test.ts`、`validateStep.test.ts` 等（**1 振る舞い 1 `it`**）

**件数の目安**: リポジトリ全体では **小** が多くてよい（ピラミッド下辺）。**書く順序**は **大 → 中 → 小**（§2.0.5）。

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

#### A

**実施タイミング** — マイルストーン完了時・本番前・3DVista 埋め込み後
**担当の想定** — プロダクトオーナー／講師代表／開発

#### B

**実施タイミング** — Phase 完了時・PR マージ前（ステージング）
**担当の想定** — 開発＋レビュアが代表操作

#### C

**実施タイミング** — 毎コミット・CI Green
**担当の想定** — 開発＋AI（人間はログ確認）

#### 重要度サマリ（ファイル単位）

#### `choices.test.ts`

**既定** — C
**備考** — 5 枚制限の純関数

#### `storage.test.ts`（local）

**既定** — C
**備考** — 開発フォールバック

#### `sheetApi.test.ts`

**既定** — B
**備考** — TC-008〜009 のみ **A**（§4.2b）。TC-012〜013 は管理者コード

#### `roomEntry.test.ts`

**既定** — B
**備考** — ENTRY。ENTRY-M は **A**（§1.5）

#### `adminEntry.test.ts`

**既定** — B
**備考** — ADM-ENTRY。ADM-M は **A**（§1.5）

#### `seed.test.ts`

**既定** — C
**備考** — デモ契約

#### `submission.test.ts`

**既定** — B
**備考** — TC-002 のみ **A**（送信形）

#### `normalizeScene.test.ts`

**既定** — C
**備考** — 管理者保存の正規化

#### `pdfExport.test.ts`

**既定** — B
**備考** — F7・PDF。代表 DL は **A**（§1.4）

#### `ojtExport.test.ts`

**既定** — C
**備考** — F8・OJT（F7 PDF とは別）

#### `fixtures.ts`

**既定** — —
**備考** — 補助（ランク対象外）

#### `useAppData.test.ts`

**既定** — C
**備考** — 配線のみ

#### `ParticipantPage.test.tsx`

**既定** — C
**備考** — スモーク。5 問フローは **手動 A**（§4.12）

#### `AdminPage.test.tsx`

**既定** — B
**備考** — TC-002（回答表示）が芯

#### §8.1 レイアウト L-01〜L-06

**既定** — A
**備考** — すべて目視

#### Phase 2.5 手動 SH-07

**既定** — A
**備考** — 受講者→管理者の実結合

---

## 3. ファイル対応一覧

### 3.1 `shared/src`（ドメイン・永続化）

#### [types.ts](../shared/src/types.ts)

- **テスト**: なし（型のみ）
- **状態**: —
- **関連機能**: 全般

#### [seed.ts](../shared/src/seed.ts)

- **テスト**: [seed.test.ts](../shared/src/seed.test.ts)
- **状態**: Green
- **重要度**: **C**
- **関連機能**: デモ初期データ

#### [choices.ts](../shared/src/choices.ts)

- **テスト**: [choices.test.ts](../shared/src/choices.test.ts)
- **状態**: Green
- **重要度**: **C**
- **関連機能**: F3〜F5（5 枚制限）

#### [storage.ts](../shared/src/storage.ts)

- **テスト**: [storage.test.ts](../shared/src/storage.test.ts)（local 実装）
- **状態**: local は Green。Sheet 層は `storage/sheet.ts` の最小実装あり
- **重要度**: **C**（local）
- **関連機能**: F7、settings / responses
- **備考**: 本番は [SPREADSHEET-DATA.md](./SPREADSHEET-DATA.md)。`storage/local.ts` + `storage/sheet.ts` + `storage/index.ts` へ分割予定

#### storage/sheet.ts（新規）

- **テスト**: `sheetApi.test.ts`
- **状態**: 契約 Green（TC-001〜013 と `rooms/access-code`）。GAS、`storage.ts` async 統合、`VITE_STORAGE_BACKEND=sheet`、管理画面からの研修コード変更は最小実装済み。Sheet API mock 経由の Playwright は Green。実環境分離確認は未
- **重要度**: **B**（TC-008〜009 は **A**）
- **関連機能**: F7（本番永続化）
- **備考**: `fetch` で GAS Web App。`clientId` は URL クエリから

#### [cardSlots.ts](../shared/src/cardSlots.ts)

- **テスト**: [cardSlots.test.ts](../shared/src/cardSlots.test.ts)
- **状態**: Green
- **重要度**: **C**
- **関連機能**: 管理者カード入力、F3〜F5（5 枚制限）

#### [selection.ts](../shared/src/selection.ts)

- **テスト**: [selection.test.ts](../shared/src/selection.test.ts)
- **状態**: Green
- **重要度**: **C**
- **関連機能**: F3〜F5（単一選択）

#### [validateStep.ts](../shared/src/validateStep.ts)

- **テスト**: [validateStep.test.ts](../shared/src/validateStep.test.ts)
- **状態**: Green
- **重要度**: **C**
- **関連機能**: 受講者5問フロー、F3〜F6

#### [submission.ts](../shared/src/submission.ts)

- **テスト**: [submission.test.ts](../shared/src/submission.test.ts)
- **状態**: Green
- **重要度**: **B**（TC-002 は **A**）
- **関連機能**: F3〜F6, FLOW

#### `sceneQuestions.ts` 内の `normalizeScene`

- **テスト**: [sceneQuestions.test.ts](../shared/src/sceneQuestions.test.ts)
- **状態**: Green
- **重要度**: **C**
- **関連機能**: F3（シーン・設問カード正規化）

#### [roomEntry.ts](../shared/src/roomEntry.ts)

- **テスト**: `roomEntry.test.ts`
- **状態**: Green
- **重要度**: **B**（手動 ENTRY-M は **A**）
- **関連機能**: マルチテナント・受講者入室（§1.5）

#### [adminEntry.ts](../shared/src/adminEntry.ts)

- **テスト**: `adminEntry.test.ts`
- **状態**: 実装あり。専用 `adminEntry.test.ts` は未（Sheet token 契約は `sheetApi.test.ts`、管理画面代表操作は `AdminPage.test.tsx`）
- **重要度**: **B**（手動 ADM-M は **A**）
- **関連機能**: マルチテナント・管理者入室（§1.5）

#### pdfExport.ts

- **テスト**: `pdfExport.test.ts`
- **状態**: Green（生成用 payload、開ける最小 PDF 構造、日本語対応、`pdf.html` の主要デザイン要素反映、目視フィードバック反映、長文折り返し・可変高さ、コンテンツ量に応じた複数ページ化を持つ `Uint8Array`。管理者回答詳細からの PDF ダウンロード UI 代表テストも Green。実 PDF 目視は未）
- **重要度**: **B**（代表 DL は **A**・§1.4）
- **関連機能**: F7
- **備考**: 依存 `jspdf`。入力は `ParticipantSubmission` + `Scene`

#### ojtExport.ts

- **テスト**: `ojtExport.test.ts`
- **状態**: 入口 Green（OJT 確認項目テキスト生成。UI・ファイル出力は未）
- **重要度**: **C**
- **関連機能**: F8

#### test/fixtures.ts（新規・補助）

- **テスト**: なし（各 `*.test.ts` から import）
- **状態**: あり
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
- **重要度**: **C**（Vitest スモーク）。**5 問フロー手動は A**（§4.12）
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
- **状態**: Green（Sheet backend の研修コード変更 UI、回答詳細からの PDF ダウンロード UI）。OJT UI のスモークは未
- **重要度**: **B**
- **備考**: 保存正規化は `sceneQuestions.test.ts`

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

**関連仕様**: F3〜F5（表示・保存の上限）

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

**関連仕様**: F7（開発フォールバック）

---

#### 4.2b `shared/src/storage/sheet.ts` → `sheetApi.test.ts`（本番）

**重要度**: ファイル既定 **B**。TC-008〜009 は **A**（研修回の漏洩防止）

契約は [SPREADSHEET-DATA.md](./SPREADSHEET-DATA.md) §4。`fetch` を mock し、**リクエストとパース結果**を検証する。

**セキュリティ契約（実装済み・[SECURITY.md](./SECURITY.md)）** — 管理者操作は `token` を **URL クエリに出さず POST ボディ**で送る（SEC-SECRET-01）。回答取得は `GET responses` ではなく **`POST responses/query`**（token はボディ）。`VITE_SHEET_API_BASE` が `https://` 以外なら送信前に例外（SEC-NET-01。`localhost`/`127.0.0.1` の http のみ許可）。これらは `sheetApi.test.ts` で固定。シート書き込みの数式インジェクション対策（SEC-INPUT-01）は `shared/src/security/sanitizeCell.test.ts` で固定。

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
- **内容**: `POST responses/query?client=acme`（管理者 token はボディ）
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
- **内容**: `POST responses/query?client=acme&room=room-a` と `room-b` で一覧が分離
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

#### TC-012

- **重要度**: B
- **内容**: 管理者 `GET settings` に **不正な管理者コード**（`token`）
- **期待**: 401 相当。本体データを返さない（§1.5）

#### TC-013

- **重要度**: B
- **内容**: 管理者コード変更 API（名称は実装時に確定）
- **期待**: **現行の管理者コード**が一致したときのみ新コードを受け付ける。不一致は拒否（§1.5）

### TC-010 補足（受講者）

- 検証失敗時、フロントは **「正しい研修コードを入力してください」** を表示（ENTRY-03 と一致）

**関連仕様**: F7（本番）。入室は §1.5。ST / SH 系 ID（inventory）と対応付ける。シート構成は [SPREADSHEET-DATA.md §3](./SPREADSHEET-DATA.md)

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
- **期待**: `tourUrl`, `scenes`, `rooms` 等

#### TC-004

- **内容**: 深いコピーで変異しない（任意）
- **期待**: import 元を mutate しても再 import で不変

**関連仕様**: デモ seed、TC-COM と整合

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

- `toggleLabel(list, label)` — F3, F5（単一選択トグル相当・抽出後）
- `buildSubmission(state, sceneId)` — 送信ペイロード組み立て
- `clampConfidence(n)` — F6（1〜5）

#### TC-001

- **内容**: トグルで単一選択の切替
- **関連**: F3 / F5

#### TC-002

- **重要度**: **A**
- **内容**: `buildSubmission` が `ParticipantSubmission` 形
- **関連**: FLOW

#### TC-003

- **内容**: 名前・所属が trim 後空ならバリデーションエラー（無記名フォールバックなし）
- **関連**: FLOW

#### TC-003b

- **内容**: 名前・所属が 10 文字を超えるとバリデーションエラー
- **関連**: FLOW

#### TC-004

- **内容**: `confidenceLevel` 範囲外を拒否/補正
- **関連**: F6

#### TC-005

- **内容**: `awarenessNote` 空許容
- **関連**: F3

---

### 4.6 `shared/src/sceneQuestions.ts` の `normalizeScene` → `sceneQuestions.test.ts`

**重要度**: **C**（§2.4）

**現状**: `normalizeScene` / `normalizeSettings` は `sceneQuestions.ts` に実装済み。テストは `sceneQuestions.test.ts` で Green。

#### TC-001

- **内容**: 行配列 → 各カード `limitChoices` 適用
- **関連**: F3

#### TC-002

- **内容**: 空行除去
- **関連**: F3

### 4.7 `shared/src/pdfExport.ts` → `pdfExport.test.ts`

**重要度**: ファイル既定 **B**（§2.4）。代表 1 件のダウンロード確認は **A**（手動）

**関連仕様**: [§1.4 F7 ダッシュボード・PDF](#14-f7-講師管理者ダッシュボードと-pdf-エクスポート)、F7

**依存**: 現状は `shared/src/pdfExport.ts` で **生成関数の戻り値**（`Uint8Array` / ヘッダ `%PDF` 相当）、生成用 payload、`pdf.html` の主要デザイン要素反映、目視フィードバック反映、長文折り返し・可変高さ、コンテンツ量に応じた複数ページ化を assert している。実ファイルの目視は手動 **A**。

### TC-001（PDF-01）

- **重要度**: B
- **内容**: 回答済み 1 件とシーンを渡すと PDF バイナリが生成される
- **期待**: 先頭が PDF シグネチャ相当、またはサイズ > 0

### TC-002（PDF-02）

- **重要度**: B
- **内容**: 生成ペイロードにシーン表示名（①）が含まれる

### TC-003（PDF-03）

- **重要度**: B
- **内容**: 設問 1 で、マスタの気づきカードと `rounds[0].awarenessSelection` のラベルが対応して出力される（②）

### TC-004（PDF-04）

- **重要度**: B
- **内容**: 5 問分の共有・判断基準選択も同様に出力される（②）

### TC-005（PDF-05）

- **重要度**: B
- **内容**: 確信度（③）がラベル付きで含まれる

### TC-006（PDF-06）

- **重要度**: B
- **内容**: 名前・所属（④）が含まれる

### TC-007（PDF-07）

- **重要度**: B
- **内容**: 一言メモ（⑤）が含まれる（`roundNote` ありの設問）

### TC-008（PDF-07 異常）

- **重要度**: C
- **内容**: `rounds` 欠損・長さ不足でもクラッシュしない

### TC-009（PDF 複数ページ）

- **重要度**: B
- **内容**: 設問カードが 1 ページに収まらない場合は次ページへ送る
- **期待**: `/Pages /Count` と `PAGE n / total` が実ページ数に一致し、次ページの設問カードがページ下端ではなく上部に描画される

---

### 4.8 `shared/src/ojtExport.ts` → `ojtExport.test.ts`

**重要度**: **C**（§2.4）

**関連**: **F8**（OJT）。F7 の受講者結果 PDF（`pdfExport`）とは別。

#### TC-001

- **内容**: 受講者回答から OJT 用テキスト配列を生成
- **関連**: F8

#### TC-002

- **内容**: 空チェックリストでもクラッシュしない
- **関連**: F8

---

### 4.9 `shared/src/test/fixtures.ts`（補助）

- `makeScene(overrides?)` — `submission.test.ts`, `pdfExport.test.ts`, `ojtExport.test.ts` で利用
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

**重要度**: Vitest は **C**。入室（ENTRY）は **B**（手動 **A**）。下記 **5 問フロー手動は A**

**関連仕様**: [§1.5 入室・マルチテナント](#15-入室マルチテナント)

### TC-ENTRY-01（ENTRY）

- **重要度**: B（手動 **A**）
- **内容**: 初回は研修コードのみ。未検証時は名前・所属欄が **非表示**
- **期待**: `roomEntry` / `verify` 成功後にプロフィール欄表示

### TC-ENTRY-02（ENTRY）

- **重要度**: B（手動 **A**）
- **内容**: 不正な研修コードで進もうとする
- **期待**: **「正しい研修コードを入力してください」**。名前・所属は出ない

#### TC-001

- **重要度**: C
- **内容**: シーンなしで警告表示
- **方針**: スモーク

#### TC-002

- **重要度**: C
- **内容**: step 0 → 1 に進める
- **方針**: スモーク（任意）

**方針**: ステップ・選択の詳細は `submission.test.ts` に寄せ、UI テストは最小。

**受講者 5 問フロー（手動・受け入れ）— 重要度: A**

[README.md](../README.md) の「受講者回答フロー（5問）」および [TECHNICAL-SPEC.md §4.3.5](TECHNICAL-SPEC.md#435-プロトタイプ実装participant-web) に従う。

- **5 問** = 同じ 4 画面（気づき → 共有 → 判断基準 → 一言メモ）を **5 回**。一言メモの `next` で次ラウンドの気づきへ。**人間が必ず通す**（`participant-web/public/embed-preview.html` または 3DVista 埋め込み）。

#### 入室（研修コード）

**step（§4.3.5）** — 専用（0 より前）
**画面順** — 研修コード入力 → 検証成功後のみ次へ

#### 事前（名前・所属）

**step（§4.3.5）** — 0
**画面順** — 名前 → 所属（各 10 文字以内）

#### 設問 1

**step（§4.3.5）** — 1〜4
**画面順** — 気づき → 共有 → 判断基準 → 一言メモ

#### 設問 2

**step（§4.3.5）** — 5〜8
**画面順** — 同上

#### 設問 3

**step（§4.3.5）** — 9〜12
**画面順** — 同上

#### 設問 4

**step（§4.3.5）** — 13〜16
**画面順** — 同上

#### 設問 5

**step（§4.3.5）** — 17〜20
**画面順** — 同上

#### 締め

**step（§4.3.5）** — 21〜23
**画面順** — 確信度（必須）→ 送信確認 → 送信完了

---

### 4.12 `admin-web/src/pages/AdminPage.tsx` → `AdminPage.test.tsx`

**重要度**: ファイル既定 **B**

**関連仕様**: F7（§1.4）。入室は §1.5。一覧は **回答済みのみ**（`appendResponse` 済み件数と一致）。

### TC-ADM-ENTRY-01（ADM-ENTRY）

- **重要度**: B（手動 **A**）
- **内容**: 管理者コード未入力では本体 UI（シーン編集・回答一覧）を出さない
- **期待**: `adminEntry` 検証成功後に表示

### TC-ADM-ENTRY-02（ADM-ENTRY）

- **重要度**: B
- **内容**: 管理者コード変更 UI
- **期待**: 現行コード不一致では保存拒否（§1.5）

#### TC-001

- **重要度**: C
- **内容**: 保存で `normalizeScene` 経由の 5 件制限
- **方針**: `sceneQuestions.test.ts` と併用

### TC-002（A-40）

- **重要度**: **B**（ステージングでは **A** とセットで受講者送信と確認）
- **内容**: 回答一覧・詳細が `getSubmissionRounds` 結果と一致
- **方針**: F7 スモーク

### TC-003（A-53）

- **重要度**: B
- **内容**: 回答済み 1 件を選び PDF エクスポート（`pdfExport`）を呼び出せる
- **期待**: `pdfExport` を mock し、ダウンロード用の `Blob` が得られる

---

## 5. 機能 ID ↔ ファイル対応（参照用）

仕様トレース用。テスト実装の主キーは **§3・§4 のファイル** とする。

**F3** — `submission.test.ts`, `choices.test.ts`

**F4** — `validateStep` / `submission` / `choices`（単一選択）

**F5** — `submission.test.ts`, `choices.test.ts`

**F6** — `submission.test.ts`

**F7** — `storage.test.ts`, `sheetApi.test.ts`, `pdfExport.test.ts`, `AdminPage.test.tsx`（薄）

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
├── sheetApi.test.ts           # API 契約（token ボディ・responses/query・HTTPS 強制）
├── security/
│   ├── sanitizeCell.ts        # 数式インジェクション対策（SEC-INPUT-01）
│   └── sanitizeCell.test.ts
├── cardSlots.ts
├── cardSlots.test.ts
├── selection.ts
├── selection.test.ts
├── validateStep.ts
├── validateStep.test.ts
├── submission.ts
├── submission.test.ts
├── sceneQuestions.ts          # normalizeScene 含む
├── sceneQuestions.test.ts
├── roomEntry.ts               # 新規（受講者・研修コード）
├── roomEntry.test.ts
├── adminEntry.ts              # 新規（管理者コード）
├── adminEntry.test.ts
├── pdfExport.ts               # F7・PDF 生成入口
├── pdfExport.test.ts
├── ojtExport.ts               # F8・OJT 生成入口
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

**§1.2 に統合済み。** Phase ごとの作業順・マイルストーン定義は **[§1.2 テストスコープとマイルストーン](#12-テストスコープとマイルストーン)** を正とする。振る舞い ID の一覧は [TDD-FEATURE-INVENTORY.md](./TDD-FEATURE-INVENTORY.md) §8 を参照。

---

## 8. Phase 完了チェックリスト（ファイル別）

**§1.2 マイルストーン表と対応する。** 完了したら [§1.2](#12-テストスコープとマイルストーン) の「現在のマイルストーン」を次 Phase に更新する。

#### Phase 0 — 基盤

- [x] ルート `vitest.config.ts` + `npm test`
- [x] `shared/src/test/fixtures.ts`
- [x] **小** — `choices.test.ts` 全 TC Green
- [x] **小** — `roomEntry.test.ts`（ENTRY-01〜03 相当）Green
- [x] **中** — `judgmentFlow.test.ts`（5 問 step の芯・代表 `it` で Green）
- [x] **中** — `sceneQuestions.test.ts`（正規化・取得の代表で Green）
- [ ] **小**（任意）— 上記 **中** を JF-*/SQ-* 単位に分割（回帰用）

#### Phase 1 — shared 拡張

- [x] `cardSlots.test.ts` Green（`CardSlotsField` ロジックを shared へ移動後）
- [x] `selection.test.ts` Green
- [x] `validateStep.test.ts` Green
- [x] `submission.test.ts` Green（抽出完了）
- [x] `ParticipantPage` が shared のみ使用（重複ロジック削除）

#### Phase 2 — 永続化・管理（local）

- [x] `storage.test.ts` Green
- [x] `seed.test.ts` Green
- [x] `sceneQuestions.test.ts`（`normalizeScene` / `normalizeSettings`）Green

#### Phase 2.5 — スプレッドシート永続化（本番）

- [x] **B** — GAS（または API）を [SPREADSHEET-DATA.md](./SPREADSHEET-DATA.md) §0〜4 に沿って用意（最小 API）
- [x] **B** — `sheetApi.test.ts` を **先に** Red → Green（TC-001〜013 と `rooms/access-code` 契約）
- [x] **B** — `storage/sheet.ts` の最小 fetch 実装
- [x] **B** — `sheetApi.test.ts` の TC-005〜009、TC-011〜013 を追加
- [ ] **B** — 専用 `adminEntry.test.ts` Green。`roomEntry.test.ts` は local Green、Sheet token 契約は `sheetApi.test.ts` Green（§1.5）
- [x] **B** — 受講者: 研修コード → 名前所属。管理者: **管理者コードのみ**（§1.5）の実装と代表契約
- [ ] **A** — `sheetApi` TC-008〜009 Green 後、人間が room 漏洩の代表操作を確認
- [ ] **A** — ENTRY-M / ADM-M（§1.5 手動）
- [x] **B** — `storage/sheet.ts` + `VITE_STORAGE_BACKEND` で本番切替（最小実装済み。Sheet API mock Playwright は Green）
- [x] **A** — 受講者送信 → 管理者（管理者コード）で同一 `client` の回答が見える（手動・SH-07）。**2026-06-05 別端末・GitHub Pages・実 GAS で確認**（[MOCK-TO-PRODUCTION.md §6.1](./MOCK-TO-PRODUCTION.md#61-フェーズ-2-実施記録2026-06-05)）
- [ ] **A** — 別 `client` / 別 `room` に漏れない（TC-005 の手動確認 + TC-008〜009）。**デモのため 2026-06-05 ステイ**

#### Phase 3 — F7 PDF・UI・OJT

- [x] `pdfExport.test.ts` 入口 Green（§4.7 / §1.4。生成用 payload、開ける最小 PDF 構造、日本語対応、`pdf.html` の主要デザイン要素反映、目視フィードバック反映、長文折り返し・可変高さ、コンテンツ量に応じた複数ページ化を持つ `Uint8Array`）
- [x] **B** — `pdf.html` のブランド・タイトル・サマリー・設問カード風レイアウト・濃紺アクセントを PDF に反映
- [x] **B** — 副題削除、設問番号の太字相当化、灰色ラベルの濃度・サイズ調整、DOC/DATE/PAGE の分割配置を PDF に反映
- [x] **B** — ヘッダーの `EXPERT EYE 360` / `DOC` / `DATE` / `PAGE` を太字相当にし、DATE/PAGE の重なりを防止
- [x] **B** — `DOC EE360-RR-0428` を削除し、`DATE` / `PAGE` を同一行に整列、件数表示の数字を太字相当にする
- [x] **B** — 研修結果レポート上の短いアクセント線を削除
- [x] **B** — 名前・所属・一言メモの長文を折り返し、設問カード高さを行数に合わせて増やす
- [x] **B** — コンテンツ量に応じて PDF を複数ページ化し、ページ番号を実ページ数に合わせる
- [x] **B** — 管理者画面から回答済み 1 件の PDF ダウンロード（代表 UI テスト Green）
- [ ] **A** — 代表 1 件の PDF を目視し ①〜⑤ が含まれること
- [ ] `useAppData.test.ts`（両 Web）
- [ ] `ParticipantPage.test.tsx` スモーク、`AdminPage.test.tsx` の回答一覧・OJT スモーク（研修コード変更 UI と PDF ダウンロード UI の `AdminPage.test.tsx` は Green）
- [x] `ojtExport.test.ts`（F8・共有ロジック入口）

---

## 8.1 iframe レイアウト（手動・E2E）

**重要度**: 本節の **A** ランクは人間の目視が必須（§2.4）。Playwright 化後もリリース前に代表解像度で再確認する。

#### 受講者（§3.2.3）

[TECHNICAL-SPEC.md](./TECHNICAL-SPEC.md) **§3.2.3** に従う。Vitest 化は Phase 3 以降の Playwright 想定（自動化後も L-01〜L-05 は **A** のサンプリング対象）。

#### L-01

- **重要度**: A
- **手順**: `participant-web/public/embed-preview.html` を開き、ブラウザウィンドウの高さを大きく／小さく変える
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

#### 管理者（§3.2.4）

[TECHNICAL-SPEC.md](./TECHNICAL-SPEC.md) **§3.2.4** に従う。README の「管理者の見た目確認」と同じ URL（`admin-web/public/embed-preview.html`）。

#### L-07

- **重要度**: A
- **手順**: `http://localhost:5174/admin/embed-preview.html` を開き、ブラウザウィンドウの幅を大きく／小さく変える
- **期待**: 管理 UI が **右側 40% 相当のモック枠内**に収まる（縦スクロールは一覧用途で可）

#### L-08

- **重要度**: C
- **手順**: 外側モックが **40vw**、アプリ本体 iframe が **100%×100%** であること（`40vw` をアプリ CSS に使っていないこと）
- **期待**: grep または目視

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
