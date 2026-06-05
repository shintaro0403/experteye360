# キー未設定を直す（最短）

エラー `Master spreadsheet id is not configured` → **Code.gs は正しい。`setupDemo` を実行しただけでは足りないプロジェクトでは、キーだけ足す。**

## A. 新規（シートもまだ無い）

1. 関数 `setupDemo` → **実行** → ログの ID を確認
2. **新しいデプロイ** → `.env` の URL 更新

## B. 既に `ExpertEye360 Master` がある（おすすめ・データ残る）

1. Drive で `ExpertEye360 Master` を開く → URL の `/d/【ここ】/edit` をコピー
2. 関数 `linkMasterSpreadsheet` → 引数にその ID を入れて **実行**
3. 関数 `logScriptPropertyStatus` → ログが `OK: MASTER_ID=...` なら完了（再デプロイ不要）
4. 手元で `npm run smoke:phase1-sheet`

---

# 新しいデプロイ —「説明」欄に貼る文

Apps Script → **デプロイ** → **新しいデプロイ** → 歯車 → **ウェブアプリ** の **説明** に、下記をそのままコピーして貼り付けます。  
（日付だけデプロイ日に変えてください。）

---

## いま貼る用（研修コード保存・管理者コード変更 API 込み）

```text
ExpertEye360 Web API（lipronext-demo）。settings/responses/rooms/verify/rooms/access-code/admin/token。フロント VITE_SHEET_API_BASE はこのデプロイ URL に更新。2026-06-04 再デプロイ。
```

---

## 初回だけデプロイするとき

```text
ExpertEye360 Web API 初回（lipronext-demo）。setupDemo 済み。settings/responses/rooms/verify/rooms/access-code/admin/token。VITE_SHEET_API_BASE にこの URL。
```

---

## 次回以降（テンプレ）

```text
ExpertEye360 Web API。変更内容: （ここに1行）。VITE_SHEET_API_BASE をこの URL に更新。YYYY-MM-DD。
```

**記入例**

```text
ExpertEye360 Web API。変更内容: rooms/access-code 追加。VITE_SHEET_API_BASE をこの URL に更新。2026-06-05。
```
