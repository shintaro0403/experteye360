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

## C. デモ資格情報を初期値に戻す（研修コード・管理者コードを変えたあと）

Apps Script エディタで **実行**（再デプロイ不要）。

**`resetDemoTrainingCode()`** — 研修コード → `demo-2026`（`rooms.accessCodeHash` のみ更新）

**`resetDemoAdminToken()`** — 管理者コード → `admin-demo-2026`

**`resetDemoCredentials()`** — 上記両方

**`syncDemoAdminRoomScope()`** — settings に `adminRoomScope=trainingCode` を保存（3 画面ゲート。既存シートで未設定のとき 1 回）

そのあと `npm run preflight:real-sheet` または `npm run smoke:phase1-sheet` で確認。

---

# 新しいデプロイ —「説明」欄に貼る文

Apps Script → **デプロイ** → **新しいデプロイ** → 歯車 → **ウェブアプリ** の **説明** に、下記をそのままコピーして貼り付けます。  
（日付だけデプロイ日に変えてください。）

---

## いま貼る用（研修コード保存・管理者コード変更 API 込み）

```text
ExpertEye360 Web API v5（lipronext-demo）。resetDemoTrainingCode/resetDemoCredentials 込み。settings/responses/responses/clear/rooms/verify/rooms/access-code/admin/token。VITE_SHEET_API_BASE をこの URL に更新。2026-06-05 15:56 デプロイ。
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
ExpertEye360 Web API。変更内容: responses/clear 追加。VITE_SHEET_API_BASE をこの URL に更新。2026-06-05。
```
