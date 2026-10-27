# WebUI Lab

Web Programming 課程實作專案，使用 Express 提供網站與登入 API。

## 本機執行（網站與 API 使用 7777）

1. 安裝 Node.js 20 或更新版本。
2. 如尚未設定環境變數，複製範本並產生 Session 密鑰：

   ```powershell
   Copy-Item .env.example .env
   node --input-type=module -e "import { randomBytes } from 'node:crypto'; console.log(randomBytes(32).toString('hex'))"
   ```

   將密鑰填入 `.env` 的 `SESSION_SECRET`。若 `.env` 已存在，請保留其中的 `SESSION_SECRET`，並確認 `PORT=7777`。
3. 在專案目錄啟動 Node.js 網站與 API：

   ```powershell
   npm run dev
   ```

開啟 `http://localhost:7777`。Express 會在同一個埠號提供網站、登入 API、團購 API 與圖片；本機開發不需要另外啟動 Uvicorn。若 7777 已被舊的 Uvicorn 或其他程式占用，請先在啟動該程式的終端機按 `Ctrl+C`，再執行 `npm run dev`。正式啟動可使用 `npm start`。

## 註冊與登入

- 按頁面上方的「登入／註冊」，註冊時輸入 `@gmail.com` 信箱、使用者名稱（2 到 30 個中英文、數字、底線、句點或連字號）與至少 8 個字元的密碼。登入時可在同一欄輸入 Gmail 或使用者名稱。
- 使用者名稱不區分大小寫，且必須唯一；既有帳號仍可使用 Gmail 登入。
- Google 登入需要在 Google Cloud 建立 OAuth 2.0 Web 用戶端，並將 `http://localhost:7777/api/auth/google/callback` 加入授權重新導向 URI；將用戶端 ID、用戶端密碼與重新導向 URI 分別設定到 `.env` 的 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`GOOGLE_REDIRECT_URI`。正式環境請使用 HTTPS 的正式網址。
- Google 登入會驗證 Google 回傳的 Gmail，並以相同 Gmail 連結既有帳號；新帳號會自動建立使用者名稱。未設定 Google OAuth 憑證時，Google 按鈕會提示登入尚未完成。
- 一般密碼註冊仍是 demo 帳號系統，不會寄送驗證信，也不會確認輸入的 Gmail 是否屬於使用者。
- 密碼使用 Node.js `scrypt` 雜湊後保存，不會以明文寫入 JSON。
- 首次讀取時會建立 `data/users.json`，使用者資料儲存在網站靜態目錄之外。
- 新帳號預設為 `buyer`，賣家狀態為 `none`。角色不接受註冊表單輸入。
- 登入 Session 使用 HttpOnly、SameSite=Lax Cookie；登出會註銷 Session。
- Demo 使用 Express 預設的記憶體 Session 儲存，重啟伺服器後使用者需要重新登入，但帳號仍保留在 JSON 檔。

## 建立團購

- 登入後到賣家中心按「建立新團購」，填寫商品名稱、分類、圖片、規格庫存、單價、成團最低數量與截止時間；也可設定出貨日期、限購數量及配送資訊。
- 圖片可上傳 JPG、PNG 或 WebP（每張最多 5 MB、最多 5 張），或填入 HTTP／HTTPS 圖片連結。
- 前端與 Node.js API 都會驗證規格名稱不得重複、成團數量不可超過庫存、截止時間須晚於現在，以及價格、庫存與圖片限制。
- 團購編號、賣家 ID、建立時間、已付款量、預扣量、剩餘名額與狀態由伺服器管理；團購資料保存於 `data/group-buys.json`，上傳圖片保存於 `data/group-buy-images/`。
- 團購發布後可從賣家列表編輯；截止時間不可提前。已有付款或預扣訂單時，API 會鎖定商品條件與既有規格，只允許修改描述、圖片、預計出貨日期、延後截止時間，以及增加規格庫存。
- 團購建立與賣家清單 API 需要登入 Session；開團商品與已發布圖片可由瀏覽商品頁公開讀取。網站和 API 都由 Express 在 `7777` 提供。

JSON 與未驗證的 Email 註冊只適合單機展示，不適合正式上線。正式服務需要驗證 Email，並改用資料庫、持久化 Session 與 HTTPS。