# ExpertEye360 GAS Web App

このフォルダは、ExpertEye360 の本番永続化入口となる Google Apps Script（GAS）実装を置く場所です。

## 目的

- `participant-web` と `admin-web` が同じ Sheet API を参照できるようにする
- `clientId` ごとにスプレッドシートを分離する
- `roomId` ごとに回答を分離する
- 研修コードと管理者コードは平文ではなく hash のみ保存する

## 初期値

開発用の初期値は以下です。

```text
clientId: lipronext-demo
roomId: demo-room-001
room表示名: デモ研修 001
研修コード: demo-2026
管理者コード: admin-demo-2026
```

パスワードは、このリポジトリ・GAS・スプレッドシートには保存しません。Google へのログインはブラウザで行います。

研修コードの平文は **`rooms` シートに保存しない**（`accessCodeHash` のみ）。`settings` JSON の `rooms[].accessCode` も空のまま（本番仕様）。管理者 UI では変更時のみ新コードを入力する。

デモ運用でコードを変えたあとは、Apps Script で `resetDemoTrainingCode()` / `resetDemoAdminToken()`、または `resetDemoCredentials()` を実行して初期値に戻せる（[APPSCRIPT-COPY.md](./APPSCRIPT-COPY.md) §C）。

## 作成されるスプレッドシート

`setupDemo()` を実行すると、新規に次の 2 冊を作成します。

### マスターブック

**ファイル名** — `ExpertEye360 Master`

**シート** — `clients`

**列**:

- `clientId`
- `spreadsheetId`
- `displayName`
- `enabled`
- `adminTokenHash`

### クライアント用ブック

**ファイル名** — `ExpertEye360 lipronext-demo`

**シート**:

- `settings`
- `rooms`（列: `roomId`, `displayName`, `enabled`, `accessCodeHash`, **`adminTokenHash`**, `startsAt`, `endsAt`）
- `responses`
- `audit_logs`

**既存ブックへの移行（ISOLATE-3）** — `rooms` シートの 1 行目に **`adminTokenHash`** 列を `accessCodeHash` の右に追加する。空のままなら `clients.adminTokenHash` にフォールバック。デモ復元は `resetDemoAdminToken()`（client + demo room の hash を更新）。

## GAS の作成手順

1. Google アカウントで [Google Apps Script](https://script.google.com/) を開く
2. 新しいプロジェクトを作成する
3. `gas/Code.gs` の内容を Apps Script の `Code.gs` に貼り付ける
4. 関数選択で `setupDemo` を選び、実行する
5. 権限確認が出たら許可する
6. ログに出た `masterSpreadsheetId` と `clientSpreadsheetId` を確認する

## Web App 公開手順

1. Apps Script 右上の「デプロイ」から「新しいデプロイ」を選ぶ
2. 種類は「ウェブアプリ」
3. **説明**（必須）— [APPSCRIPT-COPY.md](./APPSCRIPT-COPY.md) の文をコピーして貼る
4. 実行ユーザーは「自分」
5. アクセスできるユーザーは外部公開に合わせて「全員」または組織ポリシー上許される範囲を選ぶ
6. デプロイ後に表示される Web App URL を控える

Web App URL はフロントの `VITE_SHEET_API_BASE` に設定します。

**重要** — `Code.gs` を貼り替えて保存しただけでは公開 URL の挙動は変わりません。反映するには「デプロイ」→「**デプロイを管理**」→ 既存デプロイの**編集（鉛筆）**→ バージョン「**新バージョン**」→「デプロイ」まで実行します。

- **URL を変えたくないとき（推奨）** — 上記のように **既存デプロイを編集**する。デプロイ ID は不変なので `VITE_SHEET_API_BASE` の URL は変わりません。
- 「**新しいデプロイ**」を選ぶと**別の URL が発行される**ため、`VITE_SHEET_API_BASE` の貼り替えが必要になります。意図しない限り選ばないでください。
- 反映前の古いデプロイのままだと、新ルート（`POST responses/query` など）で「Unknown route」となり、回答取得や研修コード保存に失敗します。

確認: `npm run smoke:phase1-sheet` が `POST rooms/access-code ルートあり` まで Green であること。

## API 契約

フロント側の契約テストは `shared/src/sheetApi.test.ts` です。GAS はこの契約に合わせます。

POST 系 API はすべて、ブラウザの CORS preflight を避けるため JSON 文字列を `Content-Type: text/plain;charset=utf-8` で送ります。GAS 側は `e.postData.contents` を `JSON.parse` します。

Apps Script Web App は `/exec/settings` のようなパス形式だと POST で失敗することがあるため、フロントからは `?path=settings` のように `path` クエリで API 種別を渡します。

**管理者 token の送り方（SEC-SECRET-01）** — 管理者 `token` は **URL クエリに載せず POST ボディ**で送ります（ブラウザ履歴・GAS 実行ログ・Referer への漏えい防止）。GAS は `tokenFromRequest_(e, body)` で **ボディの `token` を優先**し、無ければ旧クライアント互換でクエリの `token` をフォールバック参照します。読み取り（回答一覧）は `GET responses` をやめ **`POST responses/query`**（token はボディ）を使います。旧 `GET responses`（token クエリ）も後方互換で残してあります。

**HTTPS 必須（SEC-NET-01）** — フロント（`storage/sheet.ts`）は `VITE_SHEET_API_BASE` が `https://` 以外だとリクエスト前に例外を投げます（開発・E2E 用に `localhost` / `127.0.0.1` の http のみ許可）。

**数式インジェクション対策（SEC-INPUT-01）** — シート書き込み時に `sanitizeCell_` が `=` `+` `-` `@` `タブ` `CR` `LF` 始まりの文字列へ `'` を前置します。

### GET settings

```text
GET {VITE_SHEET_API_BASE}?path=settings&client=lipronext-demo
```

**成功** — `AppSettings` JSON を返す

### POST settings

```text
POST {VITE_SHEET_API_BASE}?path=settings&client=lipronext-demo
```

**body** — `{ "token": "admin-demo-2026", "settings": <AppSettings> }`（旧形式の `AppSettings` 直送り + token クエリも後方互換で受理）

**成功** — `{ "ok": true }`

### POST responses/query（回答取得・推奨）

```text
POST {VITE_SHEET_API_BASE}?path=responses/query&client=lipronext-demo&room=demo-room-001
```

**body** — `{ "token": "admin-demo-2026" }`

**成功** — `ParticipantSubmission[]` を返す

### GET responses（後方互換・非推奨）

```text
GET {VITE_SHEET_API_BASE}?path=responses&client=lipronext-demo&room=demo-room-001&token=admin-demo-2026
```

**成功** — `ParticipantSubmission[]` を返す（token をクエリに載せるため新規利用は `responses/query` を使う）

### POST responses

```text
POST {VITE_SHEET_API_BASE}?path=responses&client=lipronext-demo&room=demo-room-001
```

**body** — `ParticipantSubmission`

**成功** — `{ "ok": true }`

### POST rooms/verify

```text
POST {VITE_SHEET_API_BASE}?path=rooms/verify&client=lipronext-demo
```

**body**:

```json
{ "accessCode": "demo-2026" }
```

**成功**:

```json
{ "roomId": "demo-room-001" }
```

### POST rooms/access-code

```text
POST {VITE_SHEET_API_BASE}?path=rooms/access-code&client=lipronext-demo
```

**body**:

```json
{ "token": "admin-demo-2026", "roomId": "demo-room-001", "nextAccessCode": "demo-2027" }
```

**成功** — `{ "ok": true }`

平文の研修コードは保存せず、`rooms.accessCodeHash` だけを更新します。

### POST admin/token

```text
POST {VITE_SHEET_API_BASE}?path=admin/token&client=lipronext-demo
```

**body**:

```json
{ "token": "admin-demo-2026", "nextAdminToken": "new-admin-code" }
```

**成功** — `{ "ok": true }`

## エラー応答

Apps Script Web App は HTTP ステータスを自由に返しにくいため、GAS 側は JSON body でエラーを返します。

```json
{
  "ok": false,
  "status": 401,
  "error": "Invalid admin token"
}
```

フロント側は HTTP の `response.ok === false` と、この JSON エラー形式の両方をエラーとして扱います。

## フロント接続

Web App URL が以下だとします。

```text
https://script.google.com/macros/s/XXXXXXXX/exec
```

`participant-web/.env.development` と `admin-web/.env.development` に以下を設定します。

```text
VITE_SHEET_API_BASE=https://script.google.com/macros/s/XXXXXXXX/exec
VITE_CLIENT_ID=lipronext-demo
VITE_STORAGE_BACKEND=sheet
```

`VITE_STORAGE_BACKEND=sheet` にすると、受講者・管理者画面は GAS Sheet API を使います。管理者コードは Sheet API の `token` として扱われ、研修コードは `rooms/verify` で hash 照合します。

mock（Playwright 用 5198）から実 GAS へ寄せる手順: [docs/MOCK-TO-PRODUCTION.md](../docs/MOCK-TO-PRODUCTION.md)

## 手動疎通確認

Web App URL を取得したら、まずブラウザまたは DevTools で以下を確認します。

```text
{VITE_SHEET_API_BASE}?path=settings&client=lipronext-demo
```

`AppSettings` JSON が返れば、`client` 解決と `settings` 読み込みは動いています。

次に `rooms/verify`、`responses`、管理者 token 付き API を確認します。ブラウザの CORS や Apps Script の公開設定で失敗する場合は、Web App のアクセス範囲とデプロイ URL を確認してください。
