# 文書と実装の整合（読み方の正本）

README・各 `docs/*.md`・コードの食い違いをなくすための **参照順** と **現状の一言** をまとめる。更新したら本ファイルの **最終確認日** も直す。

**最終確認日**: 2026-05-26（Sheet backend 研修コード変更 API/UI と 14 files / 80 tests Green を反映）

---

## 目次

- [0. 記載ルール](#0-記載ルール)
- [1. どれが「正」か（優先順）](#1-どれが「正」か)
- [2. 現状サマリー（実装 × テスト）](#2-現状サマリー)
- [3. 記号（INVENTORY と同じ）](#3-記号)
- [4. よくある食い違い（解消済みの整理）](#4-よくある食い違い)
- [5. ドキュメント更新時のチェックリスト](#5-ドキュメント更新時のチェックリスト)
- [6. 改訂](#6-改訂)

---


## 0. 記載ルール

**正本を増やさない。** 読みやすさのためだけに `TEST-OVERVIEW.md` や `HUMAN-CHECKLIST.md` のような要約ファイルを作らない。同じ Phase・人間チェック・TC を複数ファイルに置くと、片方だけ古くなるため。

**入口は正本の先頭に置く。** テスト設計を読みやすくしたい場合は [TEST-DESIGN.md §0](./TEST-DESIGN.md#0-読み方) を更新する。AI が作業する詳細は同じ文書の §3・§4・§8 と INVENTORY に残す。

**横ブロック（Markdown の表形式 `| … |`）は使わない。** 一覧・対応は **縦ブロック** で書く。

**縦ブロックの型**

- 見出し `###` / `####` で項目を分ける
- 各項目は **太字ラベル — 本文**（例: `**実装** — あり`）
- 手順・優先順は **番号リスト**
- コード・コマンドは **フェンスコードブロック**

他ドキュメント（TEST-DESIGN、INVENTORY、TECHNICAL-SPEC 等）も同じ。改訂履歴に「横並び表を廃止」とあるものが正。

---

## 1. どれが「正」か（優先順）

**1 — [README.md](../README.md)**

- **役割**: **プロダクト要件**（ユーザー向け機能・フロー）

**2 — [TECHNICAL-SPEC.md](./TECHNICAL-SPEC.md)**

- **役割**: **技術・画面・step・機能 ID（F3〜F8）**

**3 — [SPREADSHEET-DATA.md](./SPREADSHEET-DATA.md)**

- **役割**: **本番 DB・API 契約**（未実装の API もここが設計の正）

**4 — [TEST-DESIGN.md](./TEST-DESIGN.md) §1.2**

- **役割**: **いつ何をテストするか（Phase）**

**5 — [TEST-DESIGN.md](./TEST-DESIGN.md) §2.0.4**

- **役割**: **1 機能の進め方（6 ステップ）**

**6 — [TEST-DESIGN.md](./TEST-DESIGN.md) §0**

- **役割**: **人間と AI の読み方**。別要約を作らず、入口だけを短く保つ

**7 — [TDD-FEATURE-INVENTORY.md](./TDD-FEATURE-INVENTORY.md)**

- **役割**: **振る舞い ID の辞書**（C-01 等）。実装状態ラベル付き

**8 — [TEST-TEMPLATES.md](./TEST-TEMPLATES.md)**

- **役割**: **テストの書き方**

**9 — `shared/src/types.ts` 等のコード**

- **役割**: 実行時の真実。ドキュメントと矛盾したら **ドキュメントを直す**（コードを勝手に変えない）

**Phase の作業順**は TEST-DESIGN §1.2 が正。INVENTORY の §8・§9 は参照のみ。

**実装状況の要約（README 向け）**: [README.md §実装状況（一覧）](../README.md#実装状況一覧) は本節 §2 の抜粋。

---

## 2. 現状サマリー（実装 × テスト）

**5 問フロー・カード**

- **実装** — あり
- **自動テスト** — `choices.test` / `judgmentFlow.test` / `sceneQuestions.test` / `cardSlots.test` / `selection.test` / `validateStep.test` / `submission.test`
- **備考** — Phase 0 の中核、Phase 1 の shared 抽出、Phase 2 の local 永続化・seed は Green

**判断基準**

- **実装** — 単一選択のみ
- **自動テスト** — 同上
**研修コード入室**

- **実装** — あり（local 平文照合 / Sheet API hash 照合）
- **自動テスト** — `roomEntry.test` あり
- **備考** — local と Sheet API の代表疎通は Green。Sheet backend の Playwright は mock 経由で Green。実 GAS での複数 `client` / `room` 確認は未

**管理者コード入室**

- **実装** — あり（local / Sheet API token）
- **自動テスト** — `sheetApi.test` で token 契約、`AdminPage.test.tsx` で Sheet backend 管理操作の代表を確認。専用 `adminEntry.test` は未

**本番 Sheet API**

- **実装** — 最小実装あり（GAS、`shared/src/storage/sheet.ts`、`VITE_STORAGE_BACKEND=sheet`、受講者・管理者画面配線）
- **自動テスト** — `sheetApi.test` あり（client / room / token / `rooms/verify` / `admin/token` / `rooms/access-code` 契約）。`storage.test` と `AdminPage.test.tsx` で Sheet backend 研修コード変更の UI 配線まで Green。ライブ GAS 手動疎通は `settings`、`rooms/verify`、`responses` 追加・取得まで確認済み
- **備考** — Sheet API mock 経由の Playwright は Green。複数 `client` / 複数 `room` の実環境分離確認、本番運用 hardening は未

**講師・管理者 一覧・詳細（F7）**

- **実装** — あり
- **自動テスト** — なし
- **備考** — 並び・フィルタ UI なし

**F7 PDF**

- **実装** — 共有ロジックの最小実装あり（`shared/src/pdfExport.ts`）
- **自動テスト** — `pdfExport.test` あり
- **備考** — jsPDF 本レイアウト、管理者ダウンロード UI、実 PDF 目視は未

**F8 OJT**

- **実装** — 共有ロジックの最小実装あり（`shared/src/ojtExport.ts`）
- **自動テスト** — `ojtExport.test` あり
- **備考** — UI・ファイル出力は未

```bash
npm test          # ルート Vitest（shared + admin-web）。現状 14 files / 80 tests Green
npm run test:watch
```

**ローカル永続化** — `localStorage`。5173 / 5174 は **別オリジンで非共有**（README・SPEC と一致）。

**本番永続化** — 研修コード・管理者コードは **ハッシュのみ**シート保存（SPREADSHEET-DATA）。local は平文照合。

---

## 3. 記号（INVENTORY と同じ）

**【実装済み】** — 画面または `shared` に動くコードがある

**【要抽出】** — `ParticipantPage` / `AdminPage` 内。shared 移動後にテスト

**【未実装】** — 仕様のみ。これから作る

**【UI なし】** — ロジックや型だけ残る。画面・受け入れ・テストの対象外

---

## 4. よくある食い違い（解消済みの整理）

**入室**

- **誤りやすい** — INVENTORY「§2.1c 未実装」
- **正しい現状** — **local と Sheet API の最小実装済み**。管理画面からの研修コード変更も API / GAS / UI 配線は実装・Vitest Green。Sheet API mock 経由の Playwright も Green。未なのは **複数 `client` / 複数 `room` の実環境分離確認、本番運用 hardening**（Phase 2.5 継続）

**Phase 0**

- **誤りやすい** — 「研修コード UI を含めない」
- **正しい現状** — **UI はある**。Phase 0 でテストするのは `roomEntry` 等。**API** は 2.5

**§6 PDF**

- **誤りやすい** — README が実装済みに見える
- **正しい現状** — PDF 生成ロジックの入口と `pdfExport.test` は Green。未なのは **jsPDF 本レイアウト、管理者ダウンロード UI、実 PDF 目視確認**

**OJT**

- **誤りやすい** — README §7 がある
- **正しい現状** — 共有ロジックとテストは **Phase 3 入口として Green**。未なのは **管理者 UI・ファイル出力**

**テストの書き方**

- **誤りやすい** — いきなり C-01 から
- **正しい現状** — **6 ステップ**: 受け入れ条件 → 振る舞いテスト → … → 単体

**Vitest**

- **誤りやすい** — D-16 未決
- **正しい現状** — **ルート 1 本**（`vitest.config.ts`）

---

## 5. ドキュメント更新時のチェックリスト

1. 機能を増減したら **README → TECHNICAL-SPEC → INVENTORY** の順に直す
2. INVENTORY の見出し **【実装済み】等** を実コードと合わせる
3. TEST-DESIGN §1.2 と Phase 0 チェックリスト（§8）を合わせる
4. 本ファイル §2 と [README 実装状況](../README.md#実装状況一覧) を見直す
5. **新規・追記は縦ブロックのみ**（§0）。横並び表は入れない

---

## 6. 改訂

**0.1**（2026-05-21）— 初版（整合の正本）

**0.2**（2026-05-21）— §2 拡充（PDF・local/本番）。README 実装状況へのリンク

**0.3**（2026-05-21）— 横並び表を廃止し縦ブロックに統一。§0 記載ルールを追加
