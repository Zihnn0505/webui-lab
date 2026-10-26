## 使用者: 判定狀態&登入註冊
### auth.js
- `showAuthMessage()`：顯示或隱藏登入狀態訊息。
- `renderUser()`：更新頁首的登入者名稱、登入／登出按鈕，並發出 auth:user-changed 事件，供其他前端模組更新。
- `readResponse()`：讀取 JSON；HTTP 回應失敗時轉成錯誤訊息。
- `setAuthMode()`：切換登入與註冊表單欄位、標籤及瀏覽器 autocomplete 設定。
- `submitCredentials()`：送出登入或註冊請求；成功後更新使用者狀態並關閉表單。
- `loadCurrentUser()`：頁面載入時向伺服器確認目前 Session 對應的使用者。

### 進入網站介面:
1. GET /api/auth/me : 回傳目前 `{user}` 未登入或帳號已不存在時回傳 `user: null`。

2. POST /api/auth/register : 收 `email`、`username`、`password`；成功建立帳號並自動登入，回傳公開使用者資料。

3. POST /api/auth/login : 收 `identifier`、`password`；`identifier` 可為 Gmail 或使用者名稱，成功後建立 Session。

4. POST /api/auth/logout : 銷毀 Session 並清除 Cookie，成功回 `204`。

## 分類
