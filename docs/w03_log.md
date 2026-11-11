# W03 Learning Log

## 1. Local Dev to Public
利用 Python 讓作品上線，可透過 `https://xxxxx:7777` 對外公開存取。

## 2. AI Summary
- 省去邀請碼折扣功能
- 討論資料庫儲存方式：使用我熟悉的 MariaDB 與 HeidiSQL
- 討論能提升 UX 體驗的細節
  - Sidebar 的分類
  - 商品頁的顯示內容
  - 登入後可查看分類的權限

## 3. Problem
### Q1. What is Uvicorn's role in this project?
Ans:
Uvicorn 是一個 Python 的 ASGI Web Server，主要用途是啟動 FastAPI / ASGI 應用程式，負責接收 HTTP 請求、轉交給 Python 程式處理，並回傳回應。簡單來說，它就像是 Python 後端的「伺服器引擎」或執行環境。

不過在這個專案中，實際上是使用 Node.js + Express 來提供網站與 API，而不是用 Uvicorn 來跑後端，因此 Uvicorn 並不是這份專案的主要伺服器。它更像是 Python 專案常見的選項；若改成 FastAPI 專案，Uvicorn 就會是關鍵角色。

### Q2. What's the difference between HTTP and HTTPS?
Ans:
HTTP 是一般的超文本傳輸協定，資料在傳輸時是明文的，不會加密；HTTPS 則是在 HTTP 之上加上 TLS/SSL 加密，讓資料在網路上不容易被攔截或篡改。

主要差異如下：
- 安全性：HTTP 沒有加密，HTTPS 有加密。
- 通訊埠：HTTP 預設為 80，HTTPS 預設為 443。
- 身分驗證：HTTPS 會使用數位憑證確認網站真實性，HTTP 不會。
- 使用情境：登入、付款、個人資料傳輸等，應使用 HTTPS；一般公開資訊展示可使用 HTTP 或 HTTPS。

因此，正式網站通常都會採用 HTTPS，因為它能保護使用者資料與重要資訊安全。

## 4. Reflection
- 了解網站可以透過 Uvicorn 讓專案變成公開服務，並理解它在專案中的運作方式。
- 了解 HTTP 和 HTTPS 的差異，以及在實際網站開發中安全性的重要性。