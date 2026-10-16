# WebUI Lab

Web Programming 課程實作專案，使用 Express 提供網站與登入 API。

## 本機執行（網站使用 7777）

1. 安裝 Node.js 20 或更新版本。
2. 如尚未設定環境變數，複製範本並產生 Session 密鑰：

   ```powershell
   Copy-Item .env.example .env
   node --input-type=module -e "import { randomBytes } from 'node:crypto'; console.log(randomBytes(32).toString('hex'))"
   ```

   將密鑰填入 `.env` 的 `SESSION_SECRET`。若 `.env` 已存在，請保留其中的 `SESSION_SECRET`。
3. 開啟第一個終端機，在專案目錄啟動 Node.js 登入 API（預設埠號 3000）：

   ```powershell
   npm install
   npm run dev
   ```

4. 保持第一個終端機運作，再從 VS Code 啟動原有的 Uvicorn 網站伺服器，埠號使用 `7777`。例如在第二個終端機執行：

   ```powershell
   python -m uvicorn server:app --reload --host 127.0.0.1 --port 7777
   ```

   FastAPI 會把 `/api/auth/...` 轉送給 Node.js API，並將 Session Cookie 傳回瀏覽器。Node.js API 預設使用 `http://127.0.0.1:3000`；如需調整，設定 `NODE_API_URL`。

開啟 `http://localhost:7777`。頁面資源與登入 API 使用相對路徑，也可部署在 `/s115321014/` 這類子路徑。**兩個伺服器都必須保持執行**：若 Node.js 沒有啟動，網站會回傳 502 並顯示登入服務無法連線。正式啟動 Node.js API 可使用 `npm start`。

## 註冊與登入

- 按頁面上方的「登入／註冊」，註冊時輸入 `@gmail.com` 信箱、使用者名稱（2 到 30 個中英文、數字、底線、句點或連字號）與至少 8 個字元的密碼。登入時可在同一欄輸入 Gmail 或使用者名稱。
- 使用者名稱不區分大小寫，且必須唯一；既有帳號仍可使用 Gmail 登入。
- 這是 demo 帳號系統：不會連接 Google，也不會寄送驗證信；不會確認輸入的 Gmail 是否屬於使用者。
- 密碼使用 Node.js `scrypt` 雜湊後保存，不會以明文寫入 JSON。
- 首次讀取時會建立 `data/users.json`，使用者資料儲存在網站靜態目錄之外。
- 新帳號預設為 `buyer`，賣家狀態為 `none`。角色不接受註冊表單輸入。
- 登入 Session 使用 HttpOnly、SameSite=Lax Cookie；登出會註銷 Session。
- Demo 使用 Express 預設的記憶體 Session 儲存，重啟伺服器後使用者需要重新登入，但帳號仍保留在 JSON 檔。

JSON 與未驗證的 Email 註冊只適合單機展示，不適合正式上線。正式服務需要驗證 Email，並改用資料庫、持久化 Session 與 HTTPS。