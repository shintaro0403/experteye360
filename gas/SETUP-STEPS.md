# GAS キー設定 — 画面のどこからやるか

## 前提

- ブラウザで [https://script.google.com/](https://script.google.com/) を開く
- **ExpertEye360** のプロジェクトをクリックしてエディタを開く
- 左のファイル一覧で **Code.gs** を開く（リポジトリの `gas/Code.gs` と同じ内容にしておく）

---

## パターン A — もう `ExpertEye360 Master` シートがある

### 1. マスター ID をコピー

1. [https://drive.google.com/](https://drive.google.com/) を開く
2. 検索欄に `ExpertEye360 Master` と入力
3. そのファイルをクリックして開く
4. ブラウザのアドレスバーの URL を見る

```text
https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890abcdef/edit
                                      ↑ この部分が ID（/d/ と /edit の間）
```

5. その文字列をコピー

### 2. Apps Script エディタで ID を貼る

1. [https://script.google.com/](https://script.google.com/) → 対象プロジェクト
2. **Code.gs** を開く
3. 検索（Ctrl+F）で `LINK_MASTER_SPREADSHEET_ID` を探す
4. 次の行を書き換える

```javascript
const LINK_MASTER_SPREADSHEET_ID = "ここにコピーしたID";
```

5. **Ctrl+S** で保存

### 3. 実行

1. エディタ**上部中央**の関数プルダウン（初期値は `doGet` など）をクリック
2. 一覧から **`runLinkMyMaster`** を選ぶ
3. その左の **▶ 実行** ボタンをクリック
4. 初回は **権限の確認** → Google アカウントで許可 → **再実行**

### 4. 成功したか見る

1. エディタ**下部**の **実行ログ** タブを開く（表示されないときはメニュー **表示 → ログ**）
2. 次のような行が出れば OK

```text
EXPERTEYE360_MASTER_SPREADSHEET_ID を設定しました: 1AbC...
```

3. 関数プルダウンで **`logScriptPropertyStatus`** を選び ▶ 実行
4. ログに `OK: MASTER_ID=...` と出れば完了

**再デプロイは不要。**

---

## パターン B — `ExpertEye360 Master` がまだ無い

1. Apps Script エディタ → 関数プルダウンで **`setupDemo`** を選ぶ
2. **▶ 実行** → 権限許可
3. **実行ログ** に `masterSpreadsheetId` と `clientSpreadsheetId` が出る
4. メニュー **デプロイ → デプロイを管理 → 鉛筆アイコン（編集）** または **新しいデプロイ**
5. 出た **ウェブアプリ URL** を `admin-web/.env.development` と `participant-web/.env.development` の `VITE_SHEET_API_BASE` に貼る

---

## 手元 PC で最終確認

プロジェクトのルートで:

```bash
npm run smoke:phase1-sheet
```

最後まで `OK:` が並べば GAS 接続完了。

## ログイン

| 用途 | コード |
|------|--------|
| 管理者 | `admin-demo-2026` |
| 受講者（研修） | `demo-2026` |
