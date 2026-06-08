# ExpertEye360 — セキュリティ要件

本書は、ExpertEye360（3DVista 埋め込み研修用 Web + GAS Sheet API + Google スプレッドシート）の **セキュリティ要件と現状のギャップ** を整理する。実装着手前の設計・受け入れ条件の入口とする。

**位置づけ**: セキュリティの正本。プロダクト要件は [README.md](../README.md)、API 契約は [SPREADSHEET-DATA.md](./SPREADSHEET-DATA.md)、GAS 実装は [gas/Code.gs](../gas/Code.gs)・[gas/README.md](../gas/README.md)、テスト計画は [TEST-DESIGN.md](./TEST-DESIGN.md)。

**最終確認日**: 2026-06-05（フェーズ 1〜4 完了時点の実装に基づく初版）

**記載形式**: 横並び表（`| … |`）は使わない。[DOC-ALIGNMENT.md §0](./DOC-ALIGNMENT.md#0-記載ルール) の縦ブロックに従う。

---

## 目次

- [0. 読み方・前提](#0-読み方前提)
- [1. 守るべき資産](#1-守るべき資産)
- [2. 脅威モデル](#2-脅威モデル)
- [3. 現状のセキュリティ実装（事実）](#3-現状のセキュリティ実装)
- [4. セキュリティ要件（優先度付き）](#4-セキュリティ要件)
  - [4.1 認証・認可](#41-認証認可)
  - [4.2 秘密情報の保存・送信](#42-秘密情報の保存送信)
  - [4.3 通信・トランスポート・CORS](#43-通信トランスポートcors)
  - [4.4 入力検証・インジェクション対策](#44-入力検証インジェクション対策)
  - [4.5 レート制限・総当たり対策](#45-レート制限総当たり対策)
  - [4.6 監査ログ](#46-監査ログ)
  - [4.7 個人情報・プライバシー](#47-個人情報プライバシー)
  - [4.8 埋め込み（iframe・CSP）](#48-埋め込みiframecsp)
  - [4.9 フロント配信・ビルド・秘密の管理](#49-フロント配信ビルド秘密の管理)
- [5. 既知のギャップ一覧（優先順）](#5-既知のギャップ一覧)
- [6. テストとの対応](#6-テストとの対応)
- [7. 改訂履歴](#7-改訂履歴)

---

## 0. 読み方・前提

#### 想定環境

**フロント** — 静的ホスト（現状 GitHub Pages）。受講者・管理者は別アプリ・別 iframe（[README.md §埋め込み構成](../README.md#埋め込み構成)）。

**API** — GAS Web App（アクセス範囲「全員」で公開）。`Code.gs` がスプレッドシートを読み書き。

**データストア** — Google スプレッドシート（マスター `clients` + クライアント別 `settings` / `rooms` / `responses` / `audit_logs`）。

#### セキュリティの基本方針

1. **多層で守る** — 1 つの対策（研修コード等）に依存しない。共有ストア・テナント分離・認可・監査を重ねる。
2. **平文の秘密を置かない** — 研修コード・管理者コードはハッシュのみ保存（現状実装済み。ただし §4.2 の強化が必要）。
3. **最小権限** — スプレッドシートの共有範囲・GAS 実行アカウントを最小化する。
4. **本番とデモを区別** — `demo-2026` / `admin-demo-2026` は **デモ専用の弱い値**。本番運用では使わない。

#### 優先度ラベル（本書）

**高** — 本番運用前に必須。未対応ならリリースしない。

**中** — 本番運用開始後すぐ、または初期の本番で対応。

**低** — 望ましいが、リスク・運用規模に応じて判断。

> デモ（社内・限定 URL・単一研修）と、本番（複数クライアント・外部公開）で要求水準が変わる。各要件に「デモでの扱い」を併記する。

---

## 1. 守るべき資産

#### 受講者の個人情報（PII）

**内容** — 氏名・所属（`responses` シートの `participant_name` / `affiliation`）。

**リスク** — 漏洩時に個人特定。契約・国内法（個人情報保護法）上の責任。

#### 受講者の回答内容

**内容** — 5 問の選択・一言メモ・確信度（`submission_json`）。

**リスク** — 研修評価情報。他社・他研修回への漏洩は信頼喪失。

#### 管理者コード（adminToken）

**内容** — 設定変更・回答閲覧・全回答削除の権限を持つ。`clients.adminTokenHash`。

**リスク** — 漏洩すると設定改ざん・回答閲覧・**全回答削除**（`responses/clear`）が可能。

#### 研修コード（accessCode）

**内容** — 受講者の研修回入室。`rooms.accessCodeHash`。

**リスク** — 漏洩で部外者が回答投入（データ汚染）。

#### テナント分離の正しさ

**内容** — `clientId` / `roomId` によるデータ分離。

**リスク** — 分離の破れは他社データ閲覧という重大事故（[TEST-DESIGN.md §2.4 A ランク](./TEST-DESIGN.md#24-テスト重要度)）。

---

## 2. 脅威モデル

#### T-01 — 秘密情報の URL 漏洩

**脅威** — 管理者 token・研修コードがログ・履歴・Referer から漏れる。

**経路** — GAS 実行トランスクリプト（`e.parameter`）、ブラウザ履歴、プロキシ・アクセスログ、`Referer` ヘッダ。

**現状** — **解消済み（SEC-SECRET-01・2026-06-05）**。`token` は **POST ボディ**で送信し（`storage/sheet.ts`）、回答取得は `POST responses/query` に変更。GAS は `tokenFromRequest_` でボディ優先・クエリはフォールバック（旧クライアント互換）。後方互換で旧 `GET responses?token=` を残す間は、その経路のみ T-01 が残存。

#### T-02 — 秘密コードの総当たり・推測

**脅威** — 短い研修コード・管理者コードを総当たりで破る。

**現状** — レート制限なし。`demo-2026` 等は辞書・推測に弱い。**該当する。**

#### T-03 — ハッシュからの逆算

**脅威** — シート（`adminTokenHash` / `accessCodeHash`）を入手した攻撃者が、ソルトなし SHA-256 をレインボーテーブル・GPU 総当たりで逆算。

**現状** — `hashSecret_` は **ソルト・ストレッチなしの単純 SHA-256**。**該当する。**

#### T-04 — 任意オリジンからの API 悪用

**脅威** — 攻撃者サイトから受講者の回答 POST を偽造投入、または管理者 API を試行。

**現状** — POST は `text/plain` で **CORS preflight を回避**しており、オリジン制限が効かない。GAS 公開は「全員」。**該当する（特に `POST responses` は無認証）。**

#### T-05 — スプレッドシート式インジェクション

**脅威** — `participant_name` 等に `=IMPORTDATA(...)` / `=HYPERLINK(...)` を入れ、シートを開いた管理者の環境で式実行・情報送出。

**現状** — **解消済み（SEC-INPUT-01・2026-06-05）**。`=` `+` `-` `@` `タブ` `CR` `LF` 始まりの文字列は書き込み時に `'` を前置（`sanitizeSpreadsheetCell` / GAS `sanitizeCell_`、`appendObject_` / `updateRow_` で適用）。

#### T-06 — テナント越境

**脅威** — 別 `client` / 別 `room` のデータ取得。

**現状** — `resolveClient_` + `verifyRoomId_` + `room_id` フィルタで分離（実装済み）。**自動テストは Green。実環境の複数 client/room 確認は未（デモのためステイ）。**

#### T-07 — 過大ペイロード / DoS

**脅威** — 巨大な `submission_json` 連投でシート肥大・クォータ消費・遅延。

**現状** — サイズ・件数制限なし。**該当する。**

#### T-08 — PII の不必要な露出・保持

**脅威** — 退会・研修終了後も個人情報が残り続ける。保持期間・削除手順が未定義。

**現状** — 保持期間ポリシー未定（[SPREADSHEET-DATA.md §6](./SPREADSHEET-DATA.md#6-セキュリティ運用)「要決定」）。**該当する。**

#### T-09 — クリックジャッキング・不正埋め込み

**脅威** — 第三者サイトがアプリを iframe 化し、受講者・管理者を誘導。

**現状** — `frame-ancestors` / CSP 未設定。GitHub Pages はヘッダ設定が限定的。**該当する。**

---

## 3. 現状のセキュリティ実装（事実）

実装済みの良い点と、設計上の弱点を事実として記録する（推測と区別する）。

#### 実装済み（良い点）

1. **秘密はハッシュのみ保存** — `adminTokenHash` / `accessCodeHash`。平文の研修コード・管理者コードはシートに無い（`Code.gs`・[gas/README.md](../gas/README.md)）。
2. **テナント・研修回分離** — `resolveClient_`（不明 client は 400、`enabled=false` は 403）、`verifyRoomId_`、`POST responses/query`（旧 `GET responses`）は `room_id` 一致のみ返す。
3. **管理者操作の認可** — `verifyAdminToken_` を `POST settings` / `POST responses/query`（旧 `GET responses`）/ `responses/clear` / `rooms/access-code` / `admin/token` に適用。
4. **コード変更は現行 token 必須** — `handleChangeAdminToken_` / `handleChangeRoomAccessCode_` は現行 token 照合後のみ更新。
5. **監査ログ** — 設定保存・回答削除・コード変更を `audit_logs` に追記（`appendAuditLog_`）。
6. **エラーで内部を晒しすぎない** — 例外は `{ ok:false, status, error }` に集約（`handleRequest_`）。
7. **token はボディ送信（SEC-SECRET-01）** — URL クエリに秘密を載せない（`storage/sheet.ts`・`tokenFromRequest_`）。
8. **HTTPS 必須（SEC-NET-01）** — `storage/sheet.ts` が `https://` 以外を送信前に拒否（`localhost`/`127.0.0.1` の http のみ許可）。
9. **式インジェクション対策（SEC-INPUT-01）** — `sanitizeSpreadsheetCell` / `sanitizeCell_`。

#### 設計上の弱点（要改善・§4 で要件化）

1. ~~**token を URL クエリで送信**（T-01）~~ → **解消（SEC-SECRET-01）**。旧 `GET responses?token=` を残す間のみ残存。
2. **ソルトなし単純 SHA-256**（T-03。SEC-SECRET-02 は本番開始時に再導入予定）。
3. **`POST responses` が無認証**（研修コードは入室時のみ照合。送信自体は `client` + `room` だけで通る。T-04）。
4. **CORS / オリジン制限なし**（T-04）。
5. ~~**式インジェクション未対策**（T-05）~~ → **解消（SEC-INPUT-01）**。
6. **レート制限なし**（T-02）。
7. **PII 平文・保持期間未定**（T-08）。
8. **`Logger.log` にデモ秘密が出る**（`resetDemoTrainingCode` 等。デモ用途のみだが本番では避ける）。

---

## 4. セキュリティ要件（優先度付き）

各要件は **要件 — 理由 — あるべき実装 — デモでの扱い — テスト** を縦ブロックで書く。

### 4.1 認証・認可

#### SEC-AUTH-01 管理者操作はすべて token 照合（優先度: 高）

**要件** — 設定変更・回答閲覧・回答削除・コード変更は、現行の管理者 token が一致したときのみ実行する。

**理由** — 部外者による改ざん・閲覧・削除を防ぐ。

**あるべき実装** — 現状の `verifyAdminToken_` を全管理者ルートに適用済み。**今後追加するルートでも必ず適用する**（チェックリスト化）。

**デモでの扱い** — 実装済み。維持する。

**テスト** — `sheetApi.test.ts` TC-012〜013、`real-sheet-api.spec.ts`（不正 token 拒否）。

#### SEC-AUTH-02 受講者 POST の濫用抑止（優先度: 中）

**要件** — `POST responses` は、研修コード検証で得た `roomId` に対してのみ受け付け、無効・無効化された room は拒否する。可能なら検証セッションと結びつける。

**理由** — 現状は `client` + `room` を知っていれば誰でも投入できる（研修コードは入室時のみ照合し、送信時には再照合しない）。

**あるべき実装** — 短期の **検証トークン**（`rooms/verify` 成功時に発行する署名付き・短命トークン）を `POST responses` に必須化する案を検討。最低限、`verifyRoomId_` の `enabled` チェックは維持。

**デモでの扱い** — `enabled` チェックのみで運用可。検証トークンは本番拡張時に判断。

**テスト** — `sheetApi.test.ts` の room 系、`real-sheet-api.spec.ts`。

#### SEC-AUTH-03 ハッシュ比較は一定時間で（優先度: 低）

**要件** — token・コードのハッシュ比較はタイミング差で情報を漏らさない。

**理由** — 厳密にはハッシュ同士の比較で先頭一致からの推測余地は小さいが、原則として一定時間比較が望ましい。

**あるべき実装** — 固定長ハッシュ hex の定数時間比較ヘルパを `Code.gs` に用意（任意）。

**デモでの扱い** — 任意。優先度低。

**テスト** — 単体（GAS は手動・コードレビュー）。

### 4.2 秘密情報の保存・送信

#### SEC-SECRET-01 token をリクエストボディ / ヘッダで送る（優先度: 高）

**要件** — 管理者 token をクエリ文字列に載せない。POST ボディ、または `Authorization` 相当のヘッダ的フィールドで送る。

**理由** — T-01。クエリは各種ログ・履歴・Referer に残る。GAS 実行トランスクリプトにも `e.parameter` として記録されうる。

**あるべき実装** — `storage/sheet.ts` の `buildUrl` から `token` を外し、`postJson` のボディに `{ token, ... }` を含める。GAS は `e.parameter.token` ではなく `readJsonBody_(e).token` を読む。GET（`responses`）も POST ボディ化、または short-lived token を検討。`sheetApi.test.ts` の契約を先に更新（Red → Green）。

**デモでの扱い** — 限定 URL・社内のためリスクは低いが、本番前に必須。

**テスト** — `sheetApi.test.ts`（token がクエリに出ない・ボディに含む）、`real-sheet-api.spec.ts`。

**実装状況（2026-06-05・実装済み）** — `storage/sheet.ts` の全管理者 API で token を URL クエリから外し POST ボディ `{ token, ... }` で送信。読み取りは `GET responses` をやめ `POST responses/query`（token はボディ）に変更。GAS は `tokenFromRequest_(e, body)` で **ボディ優先・クエリはフォールバック**（旧クライアント互換）。`settings` 保存は `{ token, settings }` ボディ（旧 settings 直送りも許容）。mock サーバー・`participant-admin-flow.spec.ts`・`real-sheet-api.spec.ts` も新契約に追従。`sheetApi.test.ts` を Red→Green で先行更新済み。

#### SEC-SECRET-02 ハッシュにソルト + ストレッチ（優先度: 高）

**要件** — `adminTokenHash` / `accessCodeHash` は、レコードごとのソルト + 反復ハッシュ（または十分なエントロピーの token）で保存する。

**理由** — T-03。ソルトなし単純 SHA-256 は、短い人間可読コード（`demo-2026`）に対して GPU 総当たり・レインボーテーブルが容易。

**あるべき実装** — いずれか:
1. **強い token を生成して保存**（人間が覚えない 128bit 以上のランダム token を発行し、コード自体を高エントロピー化）。短いコードを使うなら 2 を併用。
2. **ソルト付き反復ハッシュ** — `clients` / `rooms` にソルト列を追加し、`hashSecret_(salt + code)` を N 回反復（GAS では PBKDF 相当を自前実装、または十分な反復回数）。

**デモでの扱い** — デモは現状維持可。本番クライアント追加時はソルト + 高エントロピー token を既定にする。

**テスト** — GAS 単体（手動）+ `clients/provision` の契約テスト（将来）。

**実装状況（2026-06-05・見送り）** — 一度 pepper + ストレッチ（600 回）を実装したが、まだ完璧な本番運用をしない方針のため**過剰と判断し、単純 1 回 SHA-256 ハッシュに戻した**（既存デプロイ済みデモシートのハッシュとも互換）。本番運用を始める際に、pepper + ストレッチ、またはレコード別ソルト + 高エントロピー token を再導入する。

#### SEC-SECRET-03 ログに秘密を出さない（優先度: 中）

**要件** — `Logger.log` や監査ログ・エラー応答に、平文の研修コード・管理者コード・ハッシュを出さない。

**理由** — 実行ログ・トランスクリプトの閲覧者に漏れる。

**あるべき実装** — `resetDemoTrainingCode` / `resetDemoAdminToken` の「`demo-2026` に戻しました」等のログを、本番運用では値を出さない形に変更（roomId だけ等）。`audit_logs` の `detail` にコードを入れない（現状入れていない）。

**デモでの扱い** — デモのリセット補助ログは許容。本番手順では値を消す。

**テスト** — コードレビュー（grep で `Logger.log` の秘密混入を確認）。

#### SEC-SECRET-04 管理者 token のクライアント側保持（優先度: 中）

**要件** — 管理者画面が token を保持する場合、`sessionStorage`（タブ閉鎖で破棄）を基本とし、長期 `localStorage` 保存は避ける。ログアウト（「管理者コード入力に戻る」）で確実に破棄する。

**理由** — XSS・共用端末での token 残留を抑える。

**あるべき実装** — `admin-web` の token 保持箇所を確認し、`sessionStorage` + ログアウト時クリアに統一。ビルドに token を埋め込まない（[260605-v2](../AI-history/260605-v2) の通り token は GitHub Variables に入れず管理者が手入力）。

**デモでの扱い** — 手入力運用を維持。

**テスト** — `AdminPage.test.tsx`（ログアウトで token 破棄・本体 UI 非表示）。

### 4.3 通信・トランスポート・CORS

#### SEC-NET-01 HTTPS 必須（優先度: 高）

**要件** — フロント・API とも HTTPS のみ。`VITE_SHEET_API_BASE` は `https://`。

**理由** — 中間者による盗聴・改ざん防止。GAS・GitHub Pages は HTTPS だが、独自ドメイン移行時に再確認。

**あるべき実装** — `http://` の API base をビルド時に拒否する簡易チェック（`build:pages` 内）を検討。

**デモでの扱い** — GitHub Pages / GAS は既定 HTTPS。維持。

**テスト** — `sheetApi.test.ts`（`http://` の base は HTTPS 必須エラー、`localhost`/`127.0.0.1` の http は許可）。

**実装状況（2026-06-05・実装済み）** — `storage/sheet.ts` の `buildUrl` に `assertSecureApiBase` を追加。`https:` 以外はリクエスト前に例外を投げる。ただし開発・E2E 用に `localhost` / `127.0.0.1` / `[::1]` の `http:` のみ許可（mock サーバーが http のため）。

#### SEC-NET-02 オリジン制限の検討（優先度: 中）

**要件** — API を呼べるオリジンを、受講者・管理者の配信オリジンに限定したい。

**理由** — T-04。現状 `text/plain` POST で preflight を回避しており、任意サイトから呼べる。

**あるべき実装** — GAS は CORS を厳密制御しにくいため、(a) `POST responses` への検証トークン必須化（SEC-AUTH-02）、(b) GAS 側で `e` から得られる情報での簡易オリジン確認、(c) 将来 API を Node 等へ移行する際に CORS allowlist を実装、のいずれか。GAS のままなら **認証で守る**ことを主軸にする。

**デモでの扱い** — 限定運用のため低リスク。本番拡大時に再評価。

**テスト** — 設計レビュー。移行後に契約テスト。

### 4.4 入力検証・インジェクション対策

#### SEC-INPUT-01 スプレッドシート式インジェクション対策（優先度: 高）

**要件** — シートに書き込む文字列のうち、先頭が `=` `+` `-` `@` `タブ` `CR` で始まるものは、無害化（先頭にアポストロフィ付与、または該当文字をエスケープ）してから保存する。

**理由** — T-05。`participant_name` / `affiliation` / `roundNote` 等は受講者の自由入力で、シートを開いた管理者環境で式が実行されうる（情報送出・なりすましリンク）。

**あるべき実装** — `Code.gs` の `appendObject_` 直前（または専用 `sanitizeCell_`）で、文字列セルを無害化する。`submission_json` は JSON 文字列なのでセル先頭が `{` で実害は低いが、表示用に展開する列（`participant_name` 等）は必須。

**デモでの扱い** — 早期に入れる（実装コスト小・リスク中）。

**テスト** — `shared/src/security/sanitizeCell.test.ts`（危険な先頭文字の前置・安全値/非文字列の素通し）+ GAS 単体（手動）。

**実装状況（2026-06-05・実装済み）** — 共有仕様 `shared/src/security/sanitizeCell.ts`（`sanitizeSpreadsheetCell`）を TDD 実装。GAS は同一仕様の `sanitizeCell_` を `appendObject_` / `updateRow_` の書き込み時に適用し、`=` `+` `-` `@` `\t` `\r` `\n` 始まりの文字列に `'` を前置。ハッシュ（16進）・JSON（`{`）は対象外で素通し。

#### SEC-INPUT-02 サーバ側の型・長さ検証（優先度: 中）

**要件** — `POST responses` / `POST settings` のボディを GAS 側でも検証する（`rounds` 長さ、文字数上限、必須フィールド）。フロントのバリデーション（名前 10 文字・メモ 30 文字）に依存しない。

**理由** — フロントは改変可能。サーバが最終防衛線。

**あるべき実装** — `handlePostResponses_` で `submission` の主要フィールドを検証し、超過・型不正は 400。`AppSettings` も最小スキーマ検証。

**デモでの扱い** — 最低限（長さ上限・必須）だけでも入れる。

**テスト** — `sheetApi.test.ts`（不正ボディで 400）、GAS 手動。

#### SEC-INPUT-03 JSON パース・経路パラメータの安全化（優先度: 中）

**要件** — `readJsonBody_` のパース失敗を 400 で返す（現状は例外 → 500）。`path` / `client` / `room` 値は許可文字（英小文字・数字・ハイフン・`/`）以外を拒否する。

**理由** — 不正入力で内部エラーを晒さない。`clientId` / `roomId` の形式は [SPREADSHEET-DATA.md §2.1](./SPREADSHEET-DATA.md#21-識別子-clientId) で英小文字・数字・ハイフンと定義済み。

**あるべき実装** — `requiredParam_` に正規表現バリデーションを追加。`readJsonBody_` を try/catch で 400 化。

**デモでの扱い** — 望ましい。優先度中。

**テスト** — `sheetApi.test.ts`（不正 client/room 形式で 400）。

### 4.5 レート制限・総当たり対策

#### SEC-RATE-01 認証試行のレート制限（優先度: 中）

**要件** — `rooms/verify`（研修コード）・管理者 token 照合の失敗回数を制限し、短時間の総当たりを抑止する。

**理由** — T-02。短い人間可読コードは総当たりされやすい。

**あるべき実装** — GAS の `PropertiesService` / `CacheService` に `clientId`（+ 可能なら IP 相当）ごとの失敗カウンタを持ち、閾値超過で一定時間 429 相当を返す。完全な IP 制限は GAS では難しいため、**コードのエントロピーを上げる**（SEC-SECRET-02）こととセットで考える。

**デモでの扱い** — 単一研修・短時間なら優先度低。本番公開時に重要度が上がる。

**テスト** — GAS 手動 + 将来の契約テスト。

#### SEC-RATE-02 ペイロードサイズ・件数制限（優先度: 中）

**要件** — `submission_json` の最大サイズ、1 リクエストの回答件数、同一 room の総行数に上限を設ける。

**理由** — T-07。肥大・クォータ枯渇・遅延の防止。

**あるべき実装** — `handlePostResponses_` で本文サイズ・`rounds` 長さ（== 5）を検証。room 行数が閾値を超えたら警告・アーカイブ運用（[SPREADSHEET-DATA.md §8](./SPREADSHEET-DATA.md#8-制限運用上の目安)）。

**デモでの扱い** — 最低限の `rounds.length === 5` 検証は入れる。

**テスト** — `sheetApi.test.ts`、GAS 手動。

### 4.6 監査ログ

#### SEC-AUDIT-01 認可イベントの記録（優先度: 中）

**要件** — 設定保存・回答削除・コード変更に加え、**失敗した認証試行**（不正 token・不正研修コード）も `audit_logs` に記録する。

**理由** — 不正アクセスの検知・事後追跡。

**あるべき実装** — `verifyAdminToken_` / `handleVerifyRoom_` の失敗時に、秘密を含めない形（`at` / `action: auth.fail` / `target` / 試行元情報）で追記。成功イベントは既に記録あり。

**デモでの扱い** — 望ましい。容量に注意。

**テスト** — GAS 手動 + `audit_logs` 行確認。

#### SEC-AUDIT-02 監査ログの保護（優先度: 低）

**要件** — `audit_logs` は追記のみ。編集・削除は運用ポリシーで制限し、改ざんを防ぐ。

**理由** — ログの信頼性。

**あるべき実装** — 現状コードは追記のみ。シート共有権限で管理者の手編集を制限（§4.9）。

**デモでの扱い** — 共有範囲の最小化で対応。

**テスト** — 運用レビュー。

### 4.7 個人情報・プライバシー

#### SEC-PII-01 収集の最小化と目的明示（優先度: 中）

**要件** — 氏名・所属は研修運用に必要な範囲に限定する。匿名化・イニシャル運用の選択肢を検討する。

**理由** — T-08。不要な PII を持たない。

**あるべき実装** — クライアント契約で「氏名を本名にするか・識別子で代替するか」を選べる設計を検討。現状の 10 文字上限は維持。

**デモでの扱い** — デモはダミー名で運用。

**テスト** — 運用・契約レビュー。

#### SEC-PII-02 保持期間と削除手順（優先度: 中）

**要件** — 研修終了後の保持期間と削除手順を定義する。`responses/clear`（room 単位削除）は実装済み。

**理由** — 法令・契約遵守。[SPREADSHEET-DATA.md §6](./SPREADSHEET-DATA.md#6-セキュリティ運用) の「要決定」を解消する。

**あるべき実装** — クライアントごとに保持期間を定め、期限後に `responses/clear` または手動削除。削除を `audit_logs` に記録（実装済み）。

**デモでの扱い** — 研修ごとに `responses/clear` で消す運用。

**テスト** — `real-sheet-api.spec.ts`（`responses/clear` が当該 room を削除・既存テスト）。

#### SEC-PII-03 スプレッドシート共有範囲の最小化（優先度: 高）

**要件** — クライアント用ブック・マスターブックの閲覧・編集権限は、GAS 実行アカウントと必要最小限の運用者のみ。リンク共有を「全員」にしない。

**理由** — PII・回答の直接閲覧を防ぐ。API は token で守っても、シート自体が公開なら無意味。

**あるべき実装** — Drive の共有設定をレビュー。クライアント間でブックを分離（実装済み構成）。

**デモでの扱い** — 本人 Google アカウントのみ。維持。

**テスト** — 運用レビュー（チェックリスト化）。

### 4.8 埋め込み（iframe・CSP）

#### SEC-EMBED-01 frame-ancestors の制限（優先度: 中）

**要件** — アプリを埋め込めるオリジンを、3DVista ツアーの配信オリジンに限定する（`Content-Security-Policy: frame-ancestors` または `X-Frame-Options`）。

**理由** — T-09。クリックジャッキング・なりすまし埋め込み防止。

**あるべき実装** — 独自ドメイン・本番ホストへ移行する際にレスポンスヘッダで設定。GitHub Pages はヘッダ設定が限定的なため、本番ホスト選定時の要件に含める（[TECHNICAL-SPEC.md §7](./TECHNICAL-SPEC.md#7-セキュリティ)・§3.1「要決定: frame-ancestors」）。

**デモでの扱い** — GitHub Pages では設定困難。本番ホストの要件として保留。

**テスト** — 本番ホスト後にヘッダ確認。

#### SEC-EMBED-02 postMessage / オリジン検証（優先度: 低）

**要件** — 受講者・管理者間の相互リンクや 3DVista 連携で `postMessage` を使う場合、`targetOrigin` を明示し、受信側は `event.origin` を検証する。

**理由** — 任意オリジンからのメッセージ注入を防ぐ。

**あるべき実装** — 現状 `VITE_ADMIN_ORIGIN` / `VITE_PARTICIPANT_ORIGIN` を使うリンクのみ。`postMessage` を導入する場合は origin 固定。

**デモでの扱い** — 該当機能を使わなければ対象外。

**テスト** — 導入時に追加。

### 4.9 フロント配信・ビルド・秘密の管理

#### SEC-BUILD-01 リポジトリ・ビルドに秘密を含めない（優先度: 高）

**要件** — `.env.development`・管理者 token・実 GAS の機微情報をコミットしない。ビルド成果物に管理者 token を埋め込まない。

**理由** — 公開リポジトリ・配布物からの漏洩防止。

**あるべき実装** — 実装済み（`.gitignore` で `.env*`、CI の `check:no-env`、token は管理者手入力）。**維持し、`build:pages` の出力に token が無いことを確認する。**

**デモでの扱い** — 実装済み。維持。

**テスト** — `check:no-env`（CI）、`dist-pages` の grep（任意）。

#### SEC-BUILD-02 依存関係の脆弱性管理（優先度: 中）

**要件** — npm 依存の既知脆弱性を定期的に確認・更新する。

**理由** — サプライチェーン経由の脆弱性。

**あるべき実装** — `npm audit` を CI または定期実行。`strict-ssl=false`（社内プロキシ回避）は **証明書が入る環境では削除**（[README.md](../README.md) 記載）。

**デモでの扱い** — 定期 `npm audit`。

**テスト** — CI ステップ追加（任意）。

#### SEC-BUILD-03 エラー応答で内部を晒さない（優先度: 低）

**要件** — API・フロントのエラーで、スタックトレース・内部パス・シート構造を表に出さない。

**理由** — 偵察に使われる情報を減らす。

**あるべき実装** — GAS は `{ ok:false, status, error }` に集約済み（`handleRequest_`）。`error` メッセージが内部詳細を含みすぎないようレビュー。

**デモでの扱い** — 現状で概ね妥当。

**テスト** — コードレビュー。

---

## 5. 既知のギャップ一覧（優先順）

本書 §4 のうち、**現状コードに対する未対応**を優先度順に再掲する。本番運用前は「高」を必須とする。

#### 高（本番前に必須）

1. ~~**SEC-SECRET-01** — token を URL クエリからボディ / ヘッダへ（T-01）~~ → **実装済み（2026-06-05）**
2. **SEC-SECRET-02** — ソルト + ストレッチ、または高エントロピー token（T-03）→ **見送り（デモでは単純 SHA-256 を維持。本番開始時に再導入）**
3. ~~**SEC-INPUT-01** — スプレッドシート式インジェクション対策（T-05）~~ → **実装済み（2026-06-05）**
4. **SEC-PII-03** — スプレッドシート共有範囲の最小化（運用設定。コード変更なし・未対応）
5. ~~**SEC-NET-01** — HTTPS 必須（独自ドメイン移行時に再確認）~~ → **実装済み（2026-06-05、localhost の http のみ開発許可）**
6. **SEC-BUILD-01** — 秘密をリポジトリ・ビルドに含めない（実装済み・維持）

#### 中（本番開始後すぐ）

1. **SEC-AUTH-02** — 受講者 POST の濫用抑止（検証トークン）
2. **SEC-INPUT-02 / 03** — サーバ側型・長さ検証、不正パラメータ拒否
3. **SEC-RATE-01 / 02** — 認証試行・ペイロードのレート制限
4. **SEC-AUDIT-01** — 認証失敗の記録
5. **SEC-PII-01 / 02** — 収集最小化・保持期間
6. **SEC-NET-02** — オリジン制限の検討
7. **SEC-EMBED-01** — frame-ancestors（本番ホスト要件）
8. **SEC-SECRET-03 / 04** — ログの秘密除去・クライアント側 token 保持
9. **SEC-BUILD-02** — 依存脆弱性管理

#### 低（規模・リスクに応じて）

1. **SEC-AUTH-03** — 定数時間比較
2. **SEC-AUDIT-02** — 監査ログ保護
3. **SEC-EMBED-02** — postMessage origin 検証
4. **SEC-BUILD-03** — エラー応答の情報最小化

---

## 6. テストとの対応

セキュリティ要件も [TEST-DESIGN.md §2.0.4 の 6 ステップ](./TEST-DESIGN.md#204-機能ごとの実装フロー6-ステップ)で進める。**契約・振る舞いは Vitest（`sheetApi.test.ts`）で先に Red → Green**、実環境の確認は `real-sheet-api.spec.ts` と手動 A（[TEST-DESIGN.md §2.4](./TEST-DESIGN.md#24-テスト重要度)）。

#### 自動テストで固定する（中粒度）

- token のクエリ非出力・ボディ送信（SEC-SECRET-01）— `sheetApi.test.ts`
- 不正 client / room / token の拒否（SEC-AUTH-01、SEC-INPUT-03）— `sheetApi.test.ts` TC-005〜013、`real-sheet-api.spec.ts`
- 不正・過大ボディで 400（SEC-INPUT-02、SEC-RATE-02）— `sheetApi.test.ts`
- room / client 分離（T-06）— 既存 TC-008〜009、`real-sheet-api.spec.ts`

#### GAS 側（手動・コードレビュー）

- 式インジェクション無害化（SEC-INPUT-01）
- ソルト + ストレッチ（SEC-SECRET-02）
- レート制限・監査失敗ログ（SEC-RATE-01、SEC-AUDIT-01）

#### 人間が確認（A ランク・運用）

- スプレッドシート共有範囲（SEC-PII-03）
- 本番ホストの frame-ancestors / HTTPS（SEC-EMBED-01、SEC-NET-01）
- PII 保持期間・削除運用（SEC-PII-02）

---

## 7. 改訂履歴

**0.1**（2026-06-05）— 初版。脅威モデル（T-01〜09）、現状実装の事実、要件 SEC-* と優先度、既知ギャップ、テスト対応を整理。`gas/Code.gs` / `storage/sheet.ts` の実装に基づく。

**0.2**（2026-06-05）— 優先度:高のコード要件を TDD で実装: SEC-SECRET-01（token をボディ送信＋`responses/query`）、SEC-NET-01（HTTPS 強制）、SEC-INPUT-01（`sanitizeSpreadsheetCell` / `sanitizeCell_`）。SEC-SECRET-02（pepper + ストレッチ）は一度実装したがデモには過剰なため単純 SHA-256 に戻した（本番開始時に再導入）。Vitest・mock E2E Green。残: SEC-SECRET-02（本番時）、SEC-PII-03（運用）。
