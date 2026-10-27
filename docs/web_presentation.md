## 使用者：判定狀態、登入與註冊
### auth.js
- `showAuthMessage()`：顯示或隱藏登入、註冊狀態訊息。
- `renderUser()`：更新頁首登入者名稱與登入／登出按鈕，並發出 `auth:user-changed` 事件，通知其他前端模組。
- `readResponse()`：讀取 JSON 回應；HTTP 請求失敗時以伺服器錯誤訊息顯示錯誤。
- `setAuthMode()`：切換登入與註冊表單欄位、標籤及瀏覽器 autocomplete 設定。
- `submitCredentials()`：送出登入或註冊請求；成功後更新使用者狀態並關閉表單。
- `loadCurrentUser()`：頁面載入時確認目前 Session 對應的使用者，並處理 Google 登入失敗提示。

### 登入與註冊 API
1. `GET /api/auth/me`：讀取目前 Session 的使用者，回傳 `{ user }`；未登入或帳號不存在時為 `{ "user": null }`。
2. `POST /api/auth/register`：接收 `{ email, username, password }`；建立帳號並自動登入，回傳 `{ user }`。
3. `POST /api/auth/login`：接收 `{ identifier, password }`；`identifier` 可為 Gmail 或使用者名稱，登入成功後建立 Session，回傳 `{ user }`。
4. `POST /api/auth/logout`：銷毀 Session 並清除 Cookie，成功回應 `204`。
5. `GET /api/auth/google`：開始 Google OAuth 登入；未設定 OAuth 憑證時導回首頁並附上登入錯誤狀態。
6. `GET /api/auth/google/callback`：接收 Google OAuth 回呼、驗證 state 與已驗證的 Gmail；連結既有帳號或建立新帳號並登入，失敗時導回首頁顯示錯誤。

## 分類、商品列表與搜尋
### app.js
- `filterCards()`：依搜尋文字及目前選取的分類過濾首頁商品卡片。

### commodity.js
- `showCatalogMessage()`：顯示或隱藏商品列表載入狀態訊息。
- `mapCategory()`：將 API 商品分類轉換為前端分類代碼。
- `createGroupBuyCard()`：依團購資料建立商品卡片，呈現圖片、價格、成團進度、剩餘數量及截止時間。
- `createPageLink()`：建立分頁連結，並處理目前頁與不可用頁。
- `renderCatalog()`：依分類、關鍵字及排序條件篩選商品，更新分頁及結果數量。
- `loadPublicGroupBuys()`：呼叫公開團購 API，將伺服器商品加入或更新列表。
- 商品列表支援分類、名稱搜尋、截止時間／價格／成團進度排序及分頁；初始 HTML 中的展示卡片會保留作為頁面示範內容。

## 商品詳情與購物車
### product-detail.js
- `showProductMessage()`：顯示或隱藏商品詳情狀態訊息。
- `readCart()`：讀取目前登入使用者的瀏覽器 `localStorage` 購物車並檢查資料格式。
- `renderCart()`：呈現購物車項目、數量與小計。
- `openCart()`：開啟購物車視窗；讀取失敗時顯示錯誤。
- `promptLogin()`：需要登入時開啟登入視窗。
- `requestAuthenticatedAction()`：確認使用者登入狀態，決定立即執行購物車操作或先提示登入。
- `performAuthenticatedAction()`：執行加入購物車、立即購買或開啟購物車操作。
- `loadGroupBuys()`：呼叫公開團購 API，並重用已進行中的商品資料請求。
- `productFromCard()`：將商品卡片資料整理成詳情視窗使用的商品格式。
- `renderProduct()`：呈現商品圖片、價格、規格、庫存、團購進度與配送資訊。
- `updateSelectedVariant()`：依所選規格更新價格、可購買數量與按鈕狀態。
- `openProduct()`：開啟商品詳情並載入最新團購資料。
- `addActiveProductToCart()`：驗證規格與購買數量，將商品寫入使用者的本機購物車；「立即購買」目前只加入購物車並開啟購物車。
- 商品及購物車視窗會處理登入狀態變更、未登入操作、關閉與從網址 `?group=` 開啟指定商品。

### cart-state.js
- `renderCartBadge()`：依登入使用者的本機購物車更新頁首購物車數量；未登入時隱藏數量。
- 監聽 `auth:user-changed`、`cart:updated` 與瀏覽器 `storage` 事件，讓購物車圖示同步更新。

## 側邊欄與設定視窗
### aside.js
- 載入 `aside.html` 後初始化側邊欄、設定視窗與選單數量，並發出 `aside:ready` 事件。
- `updateSellerMenu()`：依登入使用者的賣家權限顯示或隱藏賣家選單。
- `setActiveMenu()`：依目前網址標示作用中的側邊欄連結。
- `setupSidebarCounts()`：計算商品及訂單頁的項目數量；商品數量會合併公開團購 API 資料。
- `setupSettingModal()`：設定個人資料、通知、帳號安全與建立團購等視窗的開啟、關閉操作。
- `setupSidebarToggle()`：設定桌面版收合、手機版抽屜選單與遮罩點擊操作。

## 賣家中心與團購管理
### seller.js
- `showGroupStatus()`：顯示賣家團購操作結果或錯誤。
- `readGroupBuyResponse()`：讀取團購 API JSON 回應，HTTP 失敗時回報伺服器錯誤訊息。
- `createCell()`：建立賣家團購表格欄位。
- `renderGroupBuy()`：呈現團購商品、進度、庫存、截止時間、狀態與編輯按鈕。
- `updateGroupFilters()`：依選取狀態篩選賣家團購列。
- `updateGroupBuyList()`：新增或更新單筆團購列及統計資料。
- `updateGroupCount()`：更新賣家團購筆數。
- `updateSellerStats()`：計算進行中團購、已付款數量與成團成功率。
- `renderEmptyGroupRow()`：建立尚無團購資料時的提示列。
- `formatLocalDateTime()`：將日期轉換為本地 `datetime-local` 欄位格式。
- `createVariantRow()`：建立商品規格及庫存輸入列。
- `getCreateGroupFormMarkup()`：產生建立／編輯團購表單。
- `setupGroupForm()`：初始化表單、驗證圖片與規格資料、上傳圖片，並呼叫建立或更新 API。
- `openCreateGroupModal()`：開啟建立或編輯團購視窗並帶入既有資料。
- `loadGroupBuys()`：載入目前賣家的團購列表並更新統計。
- `initializeSellerPage()`：初始化建立按鈕、狀態篩選與團購資料載入。

### 團購 API
1. `GET /api/group-buys`：公開讀取所有團購，回傳 `{ groupBuys }`；每筆資料包含伺服器計算的 `remainingQuantity` 與 `status`。
2. `GET /api/group-buys/mine`：需登入且具賣家權限，讀取目前賣家的團購，回傳 `{ groupBuys }`。
3. `POST /api/group-buys`：需賣家權限；接收商品名稱、分類、描述、圖片、規格與庫存、成團最低數量、截止時間及配送資訊，建立團購並回傳 `{ groupBuy }`，成功狀態為 `201`。
4. `PUT /api/group-buys/:groupId`：需賣家權限；更新該賣家的團購並回傳 `{ groupBuy }`。截止時間只能延後；已有付款或預扣訂單時，商品條件與既有規格受限制，規格庫存只可增加。
5. `POST /api/group-buys/images`：需賣家權限；以原始圖片內容上傳，`Content-Type` 支援 `image/jpeg`、`image/png`、`image/webp`，單張最多 5 MB；成功回傳 `{ image: { url, mimeType, size } }`，狀態為 `201`。
6. `GET /api/group-buys/images/:imageName`：讀取已被團購引用的上傳圖片；未引用或不存在時回傳 `404`。

### 賣家頁面存取
- `GET /seller.html`：只有已登入且 Email 在 `config.json` 的 `sellerAccess.allowedEmails` 名單中的使用者能讀取；其他使用者會被導回首頁。
- 團購管理 API 未登入時回傳 `401`，登入但不具賣家權限時回傳 `403`。

## server.js 共用功能
- `publicUser()`：挑選可公開回傳的使用者欄位，並計算賣家權限。
- `normalizeGmail()`：驗證並正規化 Gmail，供帳號識別及權限比對使用。
- `loadSellerAccessConfig()`：載入並驗證賣家 Email 白名單。
- `isSellerAllowed()`：檢查使用者是否在賣家白名單。
- `normalizeUsername()`：驗證使用者名稱並產生不區分大小寫的比對鍵。
- `googleUsername()`：為 Google 新帳號產生不重複的使用者名稱。
- `validatePassword()`：檢查密碼長度是否介於 8 到 128 個字元。
- `passwordError()`、`invalidGmailError()`、`invalidLoginIdentifierError()`：建立登入與註冊輸入驗證錯誤。
- `startSession()`：重新產生 Session，設定使用者 ID 並保存。
- `readUsers()`、`writeUsers()`、`updateUsers()`：讀取、原子寫入及序列化更新 `data/users.json`。
- `readGroupBuys()`、`writeGroupBuys()`、`updateGroupBuys()`：讀取、原子寫入及序列化更新 `data/group-buys.json`。
- `groupBuyStatus()`、`groupBuyWithComputedFields()`：依成團數、庫存與截止時間計算團購狀態及剩餘數量。
- `validateGroupBuy()`：驗證並正規化團購欄位、規格、圖片、日期及配送設定。
- `getRequestUser()`、`requireSellerAccess()`：依 Session 取得使用者並保護賣家管理 API。
- `findUserById()`：依 ID 查找使用者。
- `saveSession()`、`regenerateSession()`、`destroySession()`：封裝 Session 儲存、重新產生及註銷。

## 尚未串接的功能
- 購物車資料只儲存在使用者瀏覽器的 `localStorage`，沒有購物車 API。
- 「立即購買」目前不會建立訂單；付款、訂單建立與結帳 API 尚未實作。
- 側邊欄的訂單數量目前由頁面內容計算，沒有訂單 API。
