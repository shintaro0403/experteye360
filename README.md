# ExpertEye360 — 現場探索型 判断トレーニング

![CI](https://github.com/shintaro0403/experteye360/actions/workflows/ci.yml/badge.svg)

> 360°工場研修で現場を見ながら、受講者が気づき・判断・共有の選択を記録し、講師が回答結果を確認・可視化するパッケージ。

技術仕様の整理は [docs/TECHNICAL-SPEC.md](docs/TECHNICAL-SPEC.md) を参照。本番データの保存先は [docs/SPREADSHEET-DATA.md](docs/SPREADSHEET-DATA.md)（Google スプレッドシート）。セキュリティ要件・実装状況は [docs/SECURITY.md](docs/SECURITY.md)。**いま何が動いているか**は [実装状況（一覧）](#実装状況一覧) および [docs/DOC-ALIGNMENT.md](docs/DOC-ALIGNMENT.md) §2。mock から実 GAS への移行手順は [docs/MOCK-TO-PRODUCTION.md](docs/MOCK-TO-PRODUCTION.md)。機能の TDD 用洗い出しは [docs/TDD-FEATURE-INVENTORY.md](docs/TDD-FEATURE-INVENTORY.md)、テストのスコープ・Phase は [docs/TEST-DESIGN.md](docs/TEST-DESIGN.md)（**§1.2** が計画の正本）、テストの進め方は [6 ステップ](docs/TEST-DESIGN.md#204-機能ごとの実装フロー6-ステップ)、テストの書き方は [docs/TEST-TEMPLATES.md](docs/TEST-TEMPLATES.md) を参照。

## 目次

- [ローカル開発（MVP）](#ローカル開発)
- [実装範囲の考え方](#実装範囲の考え方)
- [埋め込み構成（受講者と管理者は別 iframe）](#埋め込み構成)
- [前提：コンテンツの編集範囲と管理者画面](#前提コンテンツの編集範囲と管理者画面)
- [3DVistaツアーに含まれる想定（ExpertEye360では編集しない）](#3DVistaツアーに含まれる想定)
- [ExpertEye360（研修用Web）で実装する部分](#ExpertEye360で実装する部分)
- [3DVistaとExpertEye360の責務分担](#3DVistaとExpertEye360の責務分担)
- [入室とマルチテナント](#入室とマルチテナント)
- [データの保存](#データの保存)
- [開発上の前提](#開発上の前提)
- [自動テストと CI](#自動テストと-ci)

---


#### 実装状況（一覧）

**正本**: [docs/DOC-ALIGNMENT.md §2](docs/DOC-ALIGNMENT.md#2-現状サマリー実装--テスト)。README では要点のみ。ドキュメントの書き方（**横並び表は使わない**）は [DOC-ALIGNMENT §0](docs/DOC-ALIGNMENT.md#0-記載ルール)。

**受講者 5 問フロー・カード** — **実装済み**（`participant-web`）

**研修コード・管理者コード入室** — **実装済み**（local 平文照合 / Sheet API hash 照合）

**永続化** — `VITE_STORAGE_BACKEND=local` は `localStorage`、`VITE_STORAGE_BACKEND=sheet` は GAS Sheet API。受講者送信 → 管理者回答取得のライブ疎通は手元・**別端末（GitHub Pages）** で確認済み（2026-06-05、[docs/MOCK-TO-PRODUCTION.md §6.1](docs/MOCK-TO-PRODUCTION.md#61-フェーズ-2-実施記録2026-06-05)）。

**講師・管理者の回答一覧・詳細** — **実装済み**

**PDF 出力** — **最小実装済み**（`shared/src/pdfExport.ts` / `pdfExport.test.ts`、管理者回答詳細からの PDF ダウンロード UI 代表テスト、開ける最小 PDF 構造、日本語・英語・数字、`pdf.html` の主要デザイン要素、目視フィードバック、長文折り返し・可変高さ、コンテンツ量に応じた複数ページ化テストは Green。実 PDF 目視確認は未）

**OJT 整理ロジック** — **最小実装済み**（`shared/src/ojtExport.ts` / `ojtExport.test.ts` は Green。UI・ファイル出力は未）

**本番 Sheet API** — **最小実装済み**（GAS、`storage/sheet.ts`、`VITE_STORAGE_BACKEND=sheet`、画面配線、GAS API による研修コード変更（`rooms/access-code`）・**全回答削除**（`POST responses/clear`）、回答取得時の `roomId` は Sheet 上の研修回を使用（local の seed と混同しない）。**デモ配布の管理画面③では研修コード保存 UI を出さない**（[docs/SPEC-ADMIN-THREE-GATE-2026.md](docs/SPEC-ADMIN-THREE-GATE-2026.md)）。管理者 `token` は **POST ボディ送信**、回答取得は **`POST responses/query`**（[SECURITY.md](docs/SECURITY.md) SEC-SECRET-01）。`Code.gs` 更新は「デプロイを管理 → 既存デプロイを編集 → 新バージョン」で反映し、**URL は変えない**（[gas/README.md](gas/README.md)・[gas/APPSCRIPT-COPY.md](gas/APPSCRIPT-COPY.md)）

**セキュリティ** — 管理者 token の **ボディ送信**（SEC-SECRET-01）、**HTTPS 必須**（SEC-NET-01。開発・E2E のみ `localhost`/`127.0.0.1` を許可）、**数式インジェクション対策**（SEC-INPUT-01）を実装済み。ハッシュは現状 **単純 SHA-256**（SEC-SECRET-02 は本番開始時に再導入予定）。要件一覧・テスト対応は [docs/SECURITY.md](docs/SECURITY.md)

**管理者画面 UI** — 初回読込のみブロッキング loader、再読込・回答一覧はスピナー。入室・保存・削除など **主要ボタンは押下後にボタン内スピナー**（`ActionButton`）。入室後は「管理者コード入力に戻る」でログアウト可能

**自動テスト** — 詳細は [自動テストと CI](#自動テストと-ci)。Vitest **19 files / 135 tests** Green。mock E2E（Playwright）は `workers: 1` で直列実行。実 GAS 到達性は `npm run smoke:phase1-sheet`（`settings` / `responses/clear` / `rooms/access-code` 等）

**未完了（本番寄せ）** — 複数 `client` / 複数 `room` の実環境分離確認（手動 A・**デモのためステイ**）、OJT 管理者 UI、実 PDF 目視、フェーズ 2 チェック 4〜6 の未記録項目

#### 受講者回答フロー（5問）

**研修コード**を入力し、管理者が設定したコードと一致したら **名前・所属**の欄が表示される（コードが違う場合は「正しい研修コードを入力してください」と表示し、名前・所属には進めない）。名前・所属は各 10 文字以内、一言メモは各設問 30 文字以内。そのあと、**同じ 4 画面**（気づきカード → 共有カード → 判断基準 → 一言メモ）を **5 回**繰り返す。一言メモで `next` を押すと **次の設問＝次の気づきカード**へ進む。5 回目のあと確信度・送信。詳細は [docs/TECHNICAL-SPEC.md §4.3](docs/TECHNICAL-SPEC.md#43-受講者回答フロー5問--4画面サイクル)、入室は [入室とマルチテナント](#入室とマルチテナント) を参照。

## ローカル開発（MVP）

受講者・管理者は本番と同様 **別アプリ・別ポート**（Vite + React）で動かします。

**`participant-web/`** — 受講者 UI のみ。`npm run dev:participant` → ポート **5173**

**`admin-web/`** — 管理者 UI のみ。`npm run dev:admin` → ポート **5174**

**`shared/src/`** — 型・シード・ストレージ（localStorage / Sheet API を `VITE_STORAGE_BACKEND` で切替）

**現状のローカル**: `VITE_STORAGE_BACKEND=local` ではブラウザの `localStorage` を使う。受講者（5173）と管理者（5174）は別オリジンのため、本番同等の共有確認は `VITE_STORAGE_BACKEND=sheet` と GAS Web App で行う。

#### 初回セットアップ

```bash
# リポジトリルート（依存関係を両方インストール）
npm run install:all
```

社内プロキシ等で `UNABLE_TO_VERIFY_LEAF_SIGNATURE` が出る場合は、ルートおよび各 `*-web/.npmrc` の `strict-ssl=false` を参照（証明書を正しく入れられる環境では削除可）。

#### 起動

ターミナルを **2 つ**開き、それぞれで:

```bash
npm run dev:participant   # 受講者アプリ
npm run dev:admin         # 管理者アプリ
```

**受講者の見た目確認**（本番と同じ iframe **幅100% × 高さ25%**）:

http://localhost:5173/participant/embed-preview.html

`dev:participant` 起動時は上記ページを自動で開きます（アプリ単体の `/participant/` は開発用。本番は iframe 内のみ表示）。

**管理者の見た目確認**（本番と同じ iframe **幅40% × 高さ100%**）:

http://localhost:5174/admin/embed-preview.html

`dev:admin` 起動時は上記ページを自動で開きます（アプリ単体の `/admin/` は開発用。本番は iframe 内のみ表示）。

**相互リンク**（任意）: 各 `*-web/.env.development.example` を `.env.development` にコピー。

- 受講者側: `VITE_ADMIN_ORIGIN=http://localhost:5174`
- 管理者側: `VITE_PARTICIPANT_ORIGIN=http://localhost:5173`

**ローカルでも本番に近い形**で動かす（研修コード・管理者コードの入室フローを省略しない。`localStorage` だけで room 検証を飛ばす運用は結合確認の正にしない）。詳細は [入室とマルチテナント](#入室とマルチテナント) および [docs/TEST-DESIGN.md §1.5](docs/TEST-DESIGN.md#15-入室マルチテナント)。

一体化していた旧 `frontend/` は廃止しました。手元のクローンにフォルダが残り、削除できない場合は、エディタでそのフォルダを開いているプロセスを閉じてから削除してください。

---

## 自動テストと CI

**正本（件数・ファイル一覧）**: [docs/DOC-ALIGNMENT.md §2](docs/DOC-ALIGNMENT.md#2-現状サマリー実装--テスト)。計画・Phase は [docs/TEST-DESIGN.md §1.2](docs/TEST-DESIGN.md#12-テストスコープとマイルストーン)。

#### Vitest（ローカル・CI 共通）

ルートで `npm test` を実行する。対象は次のとおり。

- **`shared/src`** — ドメイン・ストレージ・PDF・入室検証（`adminEntry` / `roomEntry` / `appDataLoad` など）
- **`admin-web`** — `AdminPage` の代表 UI、`useAppData` の結合
- **`participant-web`** — `ParticipantPage` の研修コードと名前欄

現状 **19 files / 135 tests** Green。

```bash
npm run install:all   # 初回・CI と同様（ルート + 両 Web）
npm test              # Vitest 一括
npm run test:watch    # 開発中の監視
npm run build:all     # 両 Web の production build（型・bundling 確認）
npm run smoke:phase1-sheet   # 手元 .env の実 GAS 到達性（sheet backend 時）
npm run test:e2e           # Playwright + Sheet API mock
npm run test:e2e:real-sheet  # 実 GAS（opt-in・5 本・preflight 含む。.env の研修コード・管理者 token を実シートに合わせる）
```

各 Web の型だけ見る場合: `npm run typecheck --prefix participant-web` / `admin-web`。

#### GitHub Actions（最小 CI・実装済み）

ワークフロー: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)（`main` で env 混入チェック・Vitest・型チェック・ビルド・mock E2E まで Green 確認済み）

**いつ動くか** — `main` への push と、`main` 向け pull request。

**何をするか**（秘密情報不要）

1. `npm run check:no-env` — `.env.*` がトラッキングされていないか確認
2. `npm run install:all` — ルートだけ `npm install` では足りない（後述）
3. `npm test`
4. 両アプリの `typecheck`
5. `npm run build:all`
6. Playwright（chromium）導入 → `npm run test:e2e`（Sheet API mock。実 GAS は env 未設定で自動 skip）

**結果の見方** — GitHub リポジトリの **Actions** タブ。緑ならマージしてよい状態（env チェック + Vitest + 型 + ビルド + mock E2E）。

**おすすめの次の一手（リポジトリ設定）** — Settings → Branches → `main` にブランチ保護を付け、「Required status checks」で上記 CI ワークフローを必須にする。PR が赤のままマージされるのを防げる。

**まだ CI に入れていないもの**

- `npm run test:e2e:real-sheet` — 実 GAS / 実シート（`.env` や GitHub Secrets が必要。PR 毎は非推奨）
- 手動のみの確認 — 実 PDF 目視、本番 iframe、複数 client/room の実環境確認

#### GitHub Pages（別端末・フェーズ 2 用）

ワークフロー: [`.github/workflows/pages.yml`](.github/workflows/pages.yml)。`main` への push（または手動実行）で受講者・管理者を 1 サイトに公開する。

**初回設定（リポジトリ管理者）**

1. GitHub → **Settings** → **Pages** → **Build and deployment** を **GitHub Actions** にする
2. **Settings** → **Secrets and variables** → **Actions** → **Variables** に次を登録:
   - `VITE_SHEET_API_BASE` — 実 GAS Web App URL（現行は [gas/APPSCRIPT-COPY.md](gas/APPSCRIPT-COPY.md) の v7）
   - `VITE_CLIENT_ID` — 省略可（未設定時は `lipronext-demo`）
3. `VITE_SHEET_API_BASE` を変えたあとは **main へ push** するか **Deploy GitHub Pages** workflow を手動実行する（URL はビルド時にのみ JS へ埋め込まれる）

**公開 URL（リポジトリ名 `experteye360` の場合）**

- トップ: `https://shintaro0403.github.io/experteye360/`
- 受講者: `https://shintaro0403.github.io/experteye360/participant/`
- 管理者: `https://shintaro0403.github.io/experteye360/admin/`
- 埋め込み確認: `…/participant/embed-preview.html` / `…/admin/embed-preview.html`

**手元で Pages ビルドを試す**

```bash
# PowerShell 例（URL は手元の GAS に合わせる）
$env:VITE_SHEET_API_BASE="https://script.google.com/macros/s/.../exec"
$env:VITE_CLIENT_ID="lipronext-demo"
npm run build:pages
# 成果物: dist-pages/（npx serve dist-pages 等で確認）
```

`participant-web/.env.production.example` / `admin-web/.env.production.example` を参照。GAS 側は Pages オリジン（`https://shintaro0403.github.io`）からの CORS を許可する必要がある（`doGet` / `doPost` の `Access-Control-Allow-Origin`）。

#### CI で失敗しやすいポイント（短く）

**依存関係は 3 か所** — ルート（Vitest）・`participant-web`・`admin-web`。ルートだけ入れるとビルドや型チェックが「モジュールがない」で落ちる。ローカルも CI も `install:all` を使う。

**`.env.development` は Git に無い** — API URL や client ID は各開発者の手元ファイル（`.gitignore` で除外）。CI は `npm run check:no-env` で **追跡済みの .env*（`*.example` 除く）が無いこと**も確認する。本番 URL をビルドに埋め込む運用を始めたら、CI 用に Variables / Secrets で渡す設計が必要になる。

**ローカルでも確認** — `npm run check:no-env`（コミット前の確認用）

---

## 実装範囲の考え方

本パッケージは、**3DVistaで作成した360°工場ツアー**と、そこに埋め込む**ExpertEye360（研修用Web）**を組み合わせて構成する。

**3DVista** — 主に工場現場を360°で見せる部分（既存ツアー。ExpertEye360から編集しない）

**ExpertEye360（研修用Web）** — 埋め込みWebのカード・回答・ダッシュボード（OJT は将来）

3DVistaは「現場を見せる土台」、ExpertEye360は「その現場を見た受講者の判断を記録・可視化する機能」として役割を分ける。

---

## 埋め込み構成（受講者と管理者は別 iframe）

**受講者 Web と管理者 Web は別アプリ・別 URL・別 iframe で 3DVista に埋め込む。** 1 つの iframe に両方を入れたり、受講者ツアーの 25% 帯に管理者画面を載せたりしない。

**受講者 Web**

- **置く場所（3DVista）** — 参加者ボタンから開くレイアウト（同一ツアー内のシーン等）
- **iframe の `src`** — 受講者エントリ URL（例: `…/participant/`）
- **表示サイズ** — ツアー画面 **幅100% × 高さ25%**（パノラマ約75%）

**管理者 Web**

- **置く場所（3DVista）** — 管理者ボタンから開くレイアウト（**受講者 25% 帯とは別配置**）
- **iframe の `src`** — 管理者エントリ URL（例: `…/admin/`）
- **表示サイズ** — ツアー画面 **幅40% × 高さ100%**（パノラマ約60%）

ツアー内の **参加者／管理者ボタン** は 3DVista 側の実装。詳細は [docs/TECHNICAL-SPEC.md §3.0](docs/TECHNICAL-SPEC.md#30-役割別入口3dvista-側ボタン)。

- リポジトリ上は `participant-web/`（受講者）と `admin-web/`（管理者）で **コードもビルド成果物も分離**している。
- 詳細は [docs/TECHNICAL-SPEC.md](docs/TECHNICAL-SPEC.md) §2.3・§3.1・§3.2 を参照。

---

## 前提：コンテンツの編集範囲と管理者画面

#### 3DVista側のコンテンツは基本変更しない

360°画像、シーン構成、ホットスポット、ツアー導線、Live Guide などは、**既存の3DVistaプロジェクト側で作成・保守**する。ExpertEye360 の開発・運用では、これらのコンテンツ本体を差し替え・再編集する前提にしない。

#### ExpertEye360側で触るのは埋め込みWebのみ

ExpertEye360（研修用Web）から変更できるのは、**3DVista内に埋め込む Web システム側の内容**に限る。3DVista のパノラマやシーン定義そのものは、ExpertEye360 の画面からは編集しない。

#### ExpertEye360側で変更できるもの（主に管理者画面）

管理者画面で変更・設定するのは、主に**カード内容**と**研修データ**である。

- 気づきカード（文言・選択肢など）
- 判断基準カード
- 共有・行動カード
- シーン名・工程名などの**管理用表示名**（3DVista内の名称と対応付けるためのメタ情報）
- **3DVistaシーンとの紐づけ情報**（ツアーURL、シーン名または識別名）

#### ExpertEye360側から変更しないもの（3DVistaの管轄）

次の項目は **3DVista 側のみ**で管理し、ExpertEye360 からは変更しない。

- 360°画像
- 3DVista内のシーン構成
- ホットスポット
- ツアー導線
- 注釈表示
- Live Guide設定
- 3DVista内の演出

#### 管理者画面の位置づけ（仕様の修正）

管理者画面は、**3DVistaのコンテンツを編集する画面ではない**。あくまで、**既存の3DVistaシーンに対して**、研修用カードを**紐づける画面**とする。

**管理者画面でやること**

- 3DVistaツアーURLを登録する
- 3DVistaのシーン名または識別名を登録する
- 各シーンに表示するカード内容を設定する
- 受講者の回答結果を見る（5 設問分の詳細）
- （将来）OJT 用の確認項目整理（F8）

**管理者画面でやらないこと**

- 3DVistaツアーを作る
- 360°画像を差し替える
- ホットスポットを編集する
- 3DVista側のシーン遷移を変更する
- Live Guideを設定する
- 3DVista内の注釈や演出を変更する

#### 短く言うなら

**3DVistaは現場を見せるだけ。ExpertEye360は、その現場に対して表示するカード・回答結果を管理する。** この前提で仕様を切る。

---

## 3DVistaツアーに含まれる想定（ExpertEye360では編集しない）

以下は、**既存の3DVista工場ツアーに含まれる想定の内容**である。ExpertEye360 の管理者画面やアプリケーションから、パノラマ・シーン構成・ホットスポット等を編集することは想定しない（必要な変更はすべて3DVista側の作業）。ExpertEye360 が関わる3DVista側の作業は、主に**埋め込み用 Web フレームの確保と URL 設定**に限られる（受講者: **幅100%×高さ25%**、管理者: **幅40%×高さ100%**）。

#### 1. 360°工場ツアーの作成

- 工場内の360°パノラマ表示
- 受入エリア、加工エリア、検査エリア、出荷エリアなどのシーン構成
- シーン間の移動
- 視点移動・ホットスポット配置
- 研修対象となる現場シーンの整理

#### 2. 研修シーンの表示

- 各研修シーンの表示
- シーン名や簡単な説明の表示
- 受講者が観察する対象エリアの提示
- 必要に応じた注釈・マーカー・案内表示

#### 3. Live Guideによる遠隔研修

- 講師が受講者と同じ360°現場を見ながら案内する
- 講師によるリアルタイム説明
- 受講者との音声・ビデオ通話
- 講師主導でのシーン移動・視点案内

#### 4. ExpertEye360（研修用Web）の埋め込み

- 3DVista ツアー内に **参加者ボタン** と **管理者ボタン** を置く（**3DVista 側で実装**。ExpertEye360 はボタンを提供しない）。参加者は参加者ボタン、管理者は管理者ボタンから、それぞれの画面（下記 iframe レイアウト）へ遷移する（[docs/TECHNICAL-SPEC.md §3.0](docs/TECHNICAL-SPEC.md#30-役割別入口3dvista-側ボタン)）。
- 3DVista 内に **iframe を 2 系統**用意する（**受講者用 1 本**と**管理者用 1 本**。別 `src`・別配置）
- **受講者 iframe:** 参加者ボタンから開くレイアウトに設置。**幅100%・高さ25%**の帯に受講者 Web の URL を指定する
- **管理者 iframe:** 管理者ボタンから開くレイアウトに設置。**幅40%・高さ100%**のパネルに管理者 Web の URL を指定する。受講者の 25% 帯には **載せない**
- 受講者が 360° 現場の大半を確保したまま、帯で回答できる導線を用意する
- 講師・管理者は **管理者 iframe** 側でカード設定・回答の確認を扱う

#### 5. 3DVista側で扱うデータ

3DVista側で主に扱うのは以下。

- 360°画像
- シーン名
- ホットスポット
- シーン遷移
- 注釈・案内表示
- Live Guideによる案内

**原則:** 3DVista側では、受講者回答の保存・ダッシュボード表示は行わない。

---

## ExpertEye360（研修用Web）で実装する部分

ExpertEye360（研修用Web）では、主に**研修データの管理・受講者回答の記録・可視化**を実装する。


#### 1. 気づきカード機能

受講者が、選んだ箇所に対して何に気づいたかをカードで選ぶ。

**例（カード）**

- ラベル・表示の違和感
- 傷・汚れ・破損
- 置き場の違い
- 検査済み／未検査の混在
- 記録・チェック漏れ
- 通路・動線の乱れ
- 工具・部品の置き忘れ
- 作業手順との違い
- 後工程に影響しそうな状態
- いつもと違う状態


#### 2. 共有・行動カード機能

受講者が、誰に共有し、どう動くかを選ぶ。**1 枚のみ**選ぶ（単一選択）。

**例**

- 班長へ相談する
- 直属上司へ報告する
- 品質管理へ確認する
- 後工程担当へ共有する
- 設備担当へ確認する
- 出荷担当へ共有する
- 作業を一旦止める
- 現場で追加確認する
- 記録に残す
- 様子を見る
- 自己判断で進める

受講者が判断後に**どのような報連相・行動を取ろうとしたか**を記録する。


#### 3. 判断基準カード機能

気づき・共有と同様、**カードは 1 枚だけ選ぶ（単一選択）**。ドラッグ並べ替えや複数枚の優先順位付けは **提供しない**（[docs/TDD-FEATURE-INVENTORY.md §1.11](docs/TDD-FEATURE-INVENTORY.md) 不採用）。

**例（カード）**

- 品質
- 安全
- 工程
- 納期
- 顧客影響
- 後工程影響
- 標準作業
- 記録・証跡
- コスト
- 作業効率
- 経験則
- 上申基準

受講者が**何を重視して判断したか**を記録する。


#### 4. 一言メモ機能

気づきカード、共有・行動カード、判断基準選択カード選択後になにか一言記入する
任意で記載する欄であり、記載しなくてもnextボタン次の設問へ遷移できる


#### 5. 確信度入力機能

受講者が、自分の判断にどれくらい自信があるかを入力する。**必須**（未選択のまま送信フローに進めない）。ラベル文言など UI 上の表記は実装（`shared` の定義）を正とする。

**例（段階）** ※説明用。文言は実装と同一とは限らない。

- かなり不安
- 少し不安
- 一応判断できる
- ある程度自信あり
- 強く自信あり


#### 6. 講師・管理者向け画面（回答の確認）

講師や管理者が、**受講者が送信した回答**を見るための画面（`admin-web`）。開発ドキュメントでは機能 ID **F7** と呼ぶが、利用者向けには「管理者画面の回答一覧・詳細」と理解すればよい。

**現状: 一覧・詳細は実装済み。PDF 生成ロジックと管理者画面からのダウンロード UI は最小実装済み。**

**回答済み一覧（実装済み）**

- 送信が完了した回答だけが一覧に出る（途中保存や「回答中」は **ない**）。
- 並び替え・フィルタ UI は **ない**（保存された順で表示）。
- 1 件を開くと、設問 1〜5 の選択内容・確信度・名前・所属などを確認できる。

**PDF ダウンロード（生成ロジック・UI 最小実装済み）**

- 現状: `shared/src/pdfExport.ts` で生成用ペイロードを作り、開ける最小 PDF 構造を持つ `Uint8Array` を返す実装まで完了。日本語・英語・数字を UTF-16BE text として出し、`pdf.html` のブランド・タイトル・サマリー・設問カード風レイアウト・濃紺アクセントを反映する。目視フィードバックとして副題削除、タイトル上アクセント線削除、設問番号の太字相当化、ラベルの濃度・サイズ調整、DOC 削除、DATE/PAGE の同一行整列、件数数字の太字相当化も反映済み。名前・所属・一言メモの長文は折り返し、設問カードは行数に合わせて高さを増やす。コンテンツ量が多い場合は複数ページ化し、`PAGE n / total` を実ページ数に合わせる。管理者回答詳細から PDF ダウンロードを実行する代表 UI テストも Green。
- 未実装: 実 PDF の目視確認。
- 目標: 回答済み 1 件につき 1 ファイルを、ブラウザ上で生成する。
- PDF に含める予定の項目:
  1. **どのシーンか**（表示名等）
  2. **出題された選択肢と実際に選んだ回答**（設問 1〜5 ごと：気づき・共有・行動・判断基準のマスタと選択ラベル）
  3. **確信度**（5 段階）
  4. **名前・所属**
  5. **一言メモ**（各設問の `roundNote`）

テスト・実装計画は [docs/TEST-DESIGN.md §1.4](docs/TEST-DESIGN.md#14-f7-講師管理者ダッシュボードと-pdf-エクスポート) を参照。

#### 7. OJT引き継ぎ

**現状: 共有ロジックは最小実装済み**（`shared/src/ojtExport.ts` / `ojtExport.test.ts`）。管理者 UI・ファイル出力は未実装。以下は目標仕様。

受講者の回答結果からOJTで確認すべきポイントを整理する。

**例**

- 顧客影響の観点を確認する
- 後工程への共有判断を確認する
- 記録・証跡を残す意識を確認する
- 軽微な違和感を上申できるか確認する
- 経験則に寄りすぎていないか確認する

研修結果を、OJT担当者が次の指導に使える形で残す。


---

## 3DVistaとExpertEye360の責務分担

#### 3DVista側が担当すること

3DVista側は、360°工場現場を見せるための**土台**を担当する。パノラマ・シーン構成・ホットスポット等の**編集は3DVistaプロジェクトの作業**であり、ExpertEye360のスコープ外とする（ExpertEye360が関与するのは、主に埋め込みURLの受け渡しに伴う3DVista側の設定作業）。

- 工場内の360°画像を表示し、シーン移動やホットスポットで受講者が現場を見て回れるようにする
- Live Guide を使う場合は、講師が受講者と同じ現場を見ながら遠隔案内できるようにする
- 3DVista 内に **iframe を 2 本**設置する（受講者 Web 用・管理者 Web 用）。**同一ツアー内**で参加者ボタン／管理者ボタンからそれぞれのレイアウトへ切り替える。受講者側は **幅100%×高さ25%**、管理者側は **幅40%×高さ100%**（受講者の 25% 帯に管理者を載せない）

**役割の一覧**

- 360°工場現場の表示
- シーン移動
- ホットスポット
- Live Guideによる遠隔案内
- 研修用Web画面の埋め込み

#### ExpertEye360が担当すること

ExpertEye360は、360°現場を見た受講者の**判断を記録・可視化**する部分を担当する。

- 気づきカード・判断基準カード・共有・行動カードで回答できるようにする
- 講師・管理者向け画面で、**回答済み**の一覧・詳細を確認できるようにする（§6）
- **回答済み**の結果を **PDF でエクスポート**（1 人 1 ファイル。§6。共有ロジックと管理者 UI は最小実装済み）
- 研修結果からOJTで確認すべきポイントを整理する（§7。共有ロジックは最小実装済み、UI は未）

**役割の一覧**

- 気づきカード
- 判断基準カード
- 共有・行動カード
- 受講者回答の保存
- 講師・管理者向け画面（回答済み一覧・詳細。PDF ダウンロード UI は最小実装済み）
- OJT確認項目の整理（§7。共有ロジックは最小実装済み、UI は未）

#### 線引き（責務の境界）

- **3DVista** — 現場を見せるだけ（コンテンツは3DVista側で維持）。
- **ExpertEye360** — その現場に対するカード・回答結果を管理する。

その結果、次の分担とする。

- 3DVista側では、受講者回答の保存などは行わない。
- ExpertEye360側では、360°ツアーの作成・画像差替え・ホットスポット編集・Live Guide の制御は行わない。

---

## 入室とマルチテナント

契約組織ごとにデータを分離する（**`clientId`**）。同一組織内では研修回ごとに回答を分離する（**`roomId`**）。受講者と管理者で使うコードは **別物** である。

**配布 URL** — 受講者・管理者とも **全員同じ URL** を使う（会社ごとに URL を変えない）。データの分離は **研修コード** と **管理者コード** で行う。詳細フェーズは [docs/REMAINING-IMPLEMENTATION.md §6](docs/REMAINING-IMPLEMENTATION.md#6-コードベース分離url-固定方針)。

#### 受講者（研修コード）

1. 最初に **研修コード** を入力する（**名前・所属より前**）。
2. コードが、管理者がその研修回に設定した研修コードと一致すれば、**名前・所属**の入力欄が表示される。
3. 一致しなければ **「正しい研修コードを入力してください」** と表示し、名前・所属には進めない。
4. 通過後、回答の保存・送信では `client`（URL の `?client=`）と検証済みの研修回（`room`）を API に付与する。URL に研修コードや `room` を載せない。

#### 管理者（3 画面ゲート — デモ配布 `adminRoomScope: trainingCode`）

正本: [docs/SPEC-ADMIN-THREE-GATE-2026.md](docs/SPEC-ADMIN-THREE-GATE-2026.md)（実装チケットの経緯は [docs/REMAINING-IMPLEMENTATION.md §6.7](docs/REMAINING-IMPLEMENTATION.md#67-admin-2step-1--管理者-2-段階入室研修コードゲート)）

1. **① 管理者コード画面** — 共有の管理者コード（例: `admin-demo-2026`）を入力。「続ける」で②へ。**研修コード欄・管理タブは出ない**。
2. **② 研修コード画面（ゲート）** — 操作したい研修回の研修コードのみ。「入室する」で③へ。**管理タブは出ない**。
3. **③ 管理画面** — 基本 / シーン・カード / 回答。初期タブは基本。**基本タブは研修回の表示のみ**（研修コード入力・保存 UI は出さない）。
4. **1 研修コード = 1 管理画面（room）** — コードが違えばシーン・カード・回答もすべて別。受講者は room の `accessCode` で入室し、一致した回答だけ③の回答タブに表示される。
5. **管理者コード変更 UI・ツアー URL 編集 UI は無し**（デモ配布方針）。

#### 管理者（契約運用 `adminRoomScope: adminCode` または未指定）

1. 管理者画面の利用開始時に **管理者コード** の入力を **必須** とする（1 段階入室。研修コードは room 特定に使わない）。
2. **管理者コード** と **受講者研修コード** は別物。
3. **管理者コードの変更 UI** は提供しない（デモ配布と同様）。

#### ローカル開発

- 受講者・管理者とも、上記の入室フローを **省略しない** 形で結合確認する（Sheet API の dev 環境、または本番契約と同型の mock）。
- テスト仕様: [docs/TEST-DESIGN.md §1.5](docs/TEST-DESIGN.md#15-入室マルチテナント)。永続化・API: [docs/SPREADSHEET-DATA.md §2](docs/SPREADSHEET-DATA.md)。

---

## データの保存

**データの流れ（図解）**: [docs/TECHNICAL-SPEC.md §5.1](docs/TECHNICAL-SPEC.md#51-データの流れ図解)（全体・受講者送信・管理者参照）、[docs/SPREADSHEET-DATA.md §1.1](docs/SPREADSHEET-DATA.md#11-データの流れ図解)（ストレージ層・シート書き込み）。

#### ローカル開発（いまのコード）

**保存先** — ブラウザ **`localStorage`**（`shared/src/storage.ts`）

**研修コード照合** — 管理者が設定した **平文**のコードと一致するか（`roomEntry`）

**5173 / 5174** — **別オリジン**のため、受講者の送信と管理者の一覧は **自動では共有されない**

**テスト** — ルートで `npm test`（Vitest: `shared` + 両 Web の代表テスト。件数は [自動テストと CI](#自動テストと-ci)）

入室 UI の流れは本番と同型だが、**永続化とハッシュ照合は本番と別**。[実装状況（一覧）](#実装状況一覧) を参照。

#### 本番（目標）

`localStorage` のみでは、受講者と管理者・別端末間でデータが共有されない。本番は次の順で解決する（[docs/SPREADSHEET-DATA.md §0](docs/SPREADSHEET-DATA.md)）。

1. **Sheet API + Google スプレッドシート** — 受講者・管理者が同じ API を参照（必須）
2. **マスターブック `clients`** — `clientId` → クライアント別スプレッドシート ID
3. **クライアント用ブック** — `settings` / `rooms` / `responses` / `audit_logs`
4. **`?client=`** — 埋め込み URL で組織を特定する。
5. **受講者** — **研修コード**で研修回を確定（名前・所属の前）。コードは API で照合し、**平文はシートに保存しない**（`accessCodeHash` のみ。[docs/SPREADSHEET-DATA.md](docs/SPREADSHEET-DATA.md)）。
6. **管理者（デモ）** — **3 画面ゲート**: 管理者コード → 研修コードゲート → room 確定後の管理画面。詳細は [入室とマルチテナント](#入室とマルチテナント) および [docs/SPEC-ADMIN-THREE-GATE-2026.md](docs/SPEC-ADMIN-THREE-GATE-2026.md)。

詳細は [入室とマルチテナント](#入室とマルチテナント)、[docs/SPREADSHEET-DATA.md §2.3](docs/SPREADSHEET-DATA.md#23-研修回ルームroomid)。

- フロントは静的ホスト（FileZilla 等）可。GAS Web App 想定。
- ローカルでも `VITE_STORAGE_BACKEND=sheet` と GAS Web App URL を設定すれば、本番に近い Sheet API 経路で確認できる。`VITE_STORAGE_BACKEND=local` はブラウザ内 `localStorage` の開発用フォールバックであり、受講者・管理者間の共有確認の正にはしない（[docs/TEST-DESIGN.md §1.5](docs/TEST-DESIGN.md#15-入室マルチテナント)）。
- mock から実 GAS へ寄せる手順（TDD ハイブリッド・フェーズ順）: [docs/MOCK-TO-PRODUCTION.md](docs/MOCK-TO-PRODUCTION.md)。フェーズ 1 スモーク: `npm run smoke:phase1-sheet`（`GET settings`・`POST responses/clear` ルート到達・`rooms/verify` 等。GAS デプロイ手順は [gas/README.md](gas/README.md)）
- 将来は API の裏を PostgreSQL 等に差し替え可能（フロントは storage 窓口のみ）。

---

## 開発上の前提

本システムは、3DVista本体の内部機能を直接拡張するものではない。3DVistaで作成した360°工場ツアーに、外部のExpertEye360（研修用Web）を埋め込んで利用する構成とする。

**埋め込み（iframe 2 本・UI 前提）**

- **受講者 Web** — 3DVista 上の **幅100%・高さ25%** フレームに埋め込む。画面設計・タップ領域はこの縦幅に合わせる（360° 視界を優先し、帯内に UI を収める。帯内スクロールは原則なし）。
- **管理者 Web** — **別 iframe・別 URL** で、3DVista 上の **幅40%・高さ100%** パネルに埋め込む。受講者の 25% 帯とは分離する。パネル内は縦スクロール可（一覧・編集のため）。
- **アプリ側のサイズ指定** — いずれも iframe 内は **width/height 100%** を基準に組む。25% や 40% は 3DVista 側のフレーム配置のみとし、アプリの CSS で `25vh` / `40vw` などは使わない。

**ExpertEye360側で管理する**

- 受講者情報
- 研修シーン情報（管理用メタデータおよび3DVistaシーンとの紐づけ）
- 受講者回答
- 回答履歴
- ダッシュボード表示
- （将来）OJT引き継ぎ情報

**3DVista側で管理する**

- 360°画像
- ツアー構成
- シーン遷移
- ホットスポット
- Live Guideによる案内
- 360°空間上の視覚的な演出

#### 重要な線引き

このパッケージの価値は、3DVista単体の機能ではなく、**3DVistaで見せた現場に対して、受講者が何に気づき、何を優先し、誰に共有しようとしたかを記録し、講師が一覧で確認できる点**にある。

- **3DVista** — 現場を再現する（コンテンツ編集は3DVista側の作業）。
- **ExpertEye360** — その現場に対して表示するカード・回答結果を可視化・管理する。

この役割分担を明確にしたうえで開発する。
