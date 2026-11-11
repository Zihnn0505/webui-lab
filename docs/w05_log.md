# W05 Learning Log

## 1. Other Page
- `commodity.html`、`order.html`、`seller.html` 的 HTML 與 CSS

## 2. What did I do this week

### 2.1 Change Sidebar and Topbar
- Original

```text
＿＿＿＿＿＿＿＿＿＿＿＿＿
|       |＿＿Top_Bar＿＿｜
|       |               |
| Side  |               |
| Bar   |               |
|       |               |
|＿＿＿＿|＿＿＿＿＿＿＿＿｜
```

- After

```text
＿＿＿＿＿＿＿＿＿＿＿＿＿
| ＿＿＿＿Top_Bar＿＿＿＿｜
|       |               |
| Side  |               |
| Bar   |               |
|       |               |
|＿＿＿＿|＿＿＿＿＿＿＿＿｜
```

#### Why?
- follow standard website layout conventions.
- raise user experience.

### 2.2 Confirm functional details and display method
- 確認各頁面的功能內容與顯示方式
- 調整頁面結構，使資訊更容易被使用者理解與操作

## 3. Problem
### Q1. What is JavaScript DOM?
Ans:
JavaScript DOM（Document Object Model）是瀏覽器將 HTML 文件轉換成一個樹狀結構物件模型，讓 JavaScript 可以讀取、修改、新增或刪除網頁中的元素。

簡單來說，DOM 就是「網頁結構的物件化表示法」。每一個標籤（例如 `div`、`button`、`img`）都會被視為一個節點，JavaScript 可以透過這些節點來操作頁面內容、樣式與互動。

例如：
- 取得元素：`document.getElementById()`
- 選取元素：`document.querySelector()`
- 修改文字：`element.textContent = ...`
- 修改樣式：`element.style.color = 'red'`
- 新增元素：`document.createElement()`

透過 DOM，我們可以讓網站不只是靜態畫面，而是可以與使用者互動、更新資料、切換頁面內容等。

## 4. Reflections
- 受到 WiseLing 的 UI 風格啟發，並結合使用者情境，重新調整側邊欄與上方導覽列的版面配置。
- 了解 JavaScript 檔案中函式的運作流程，以及如何透過 DOM 操作網頁元素。
- 對前端頁面結構與互動邏輯有更清楚的理解。