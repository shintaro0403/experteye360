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
- `rooms`
- `responses`
- `audit_logs`

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
3. 実行ユーザーは「自分」
4. アクセスできるユーザーは外部公開に合わせて「全員」または組織ポリシー上許される範囲を選ぶ
5. デプロイ後に表示される Web App URL を控える

Web App URL はフロントの `VITE_SHEET_API_BASE` に設定します。

## API 契約

フロント側の契約テストは `shared/src/sheetApi.test.ts` です。GAS はこの契約に合わせます。

POST 系 API はすべて、ブラウザの CORS preflight を避けるため JSON 文字列を `Content-Type: text/plain;charset=utf-8` で送ります。GAS 側は `e.postData.contents` を `JSON.parse` します。

Apps Script Web App は `/exec/settings` のようなパス形式だと POST で失敗することがあるため、フロントからは `?path=settings` のように `path` クエリで API 種別を渡します。

### GET settings

```text
GET {VITE_SHEET_API_BASE}?path=settings&client=lipronext-demo
```

**成功** — `AppSettings` JSON を返す

### POST settings

```text
POST {VITE_SHEET_API_BASE}?path=settings&client=lipronext-demo&token=admin-demo-2026
```

**body** — `AppSettings`

**成功** — `{ "ok": true }`

### GET responses

```text
GET {VITE_SHEET_API_BASE}?path=responses&client=lipronext-demo&room=demo-room-001&token=admin-demo-2026
```

**成功** — `ParticipantSubmission[]` を返す

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

### POST admin/token

```text
POST {VITE_SHEET_API_BASE}?path=admin/token&client=lipronext-demo&token=admin-demo-2026
```

**body**:

```json
{ "nextAdminToken": "new-admin-code" }
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

## 手動疎通確認

Web App URL を取得したら、まずブラウザまたは DevTools で以下を確認します。

```text
{VITE_SHEET_API_BASE}?path=settings&client=lipronext-demo
```

`AppSettings` JSON が返れば、`client` 解決と `settings` 読み込みは動いています。

次に `rooms/verify`、`responses`、管理者 token 付き API を確認します。ブラウザの CORS や Apps Script の公開設定で失敗する場合は、Web App のアクセス範囲とデプロイ URL を確認してください。
