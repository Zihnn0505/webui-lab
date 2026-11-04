import { createGroupBuyCard, mapGroupBuyCategory } from "./group-buy-card.js";

const cardList = document.querySelector("#home-hot-cards");
const statusMessage = document.querySelector("#home-catalog-status");
const searchForm = document.querySelector(".search");
const searchInput = document.querySelector('.search input[name="q"]');
const categoryButtons = document.querySelectorAll("[data-category]");
const homePageSize = 4;
let groupBuys = [];
let selectedCategory = "all";
let loadError = "";

function renderHomeCatalog() {
    const keyword = searchInput?.value.trim().toLocaleLowerCase("zh-Hant-TW") ?? "";
    const latestGroupBuys = [...groupBuys]
        .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
        .filter(groupBuy => {
            const matchesCategory = selectedCategory === "all"
                || mapGroupBuyCategory(groupBuy.category) === selectedCategory;
            const matchesKeyword = (groupBuy.title || "").toLocaleLowerCase("zh-Hant-TW").includes(keyword);
            return matchesCategory && matchesKeyword;
        })
        .slice(0, homePageSize);

    cardList.replaceChildren(...latestGroupBuys.map(createGroupBuyCard));
    statusMessage.hidden = latestGroupBuys.length > 0 && !loadError;
    statusMessage.textContent = loadError || (latestGroupBuys.length === 0
        ? groupBuys.length === 0
            ? "目前沒有團購商品。"
            : "沒有符合條件的團購商品。"
        : "");
}

async function loadGroupBuys() {
    try {
        const response = await fetch("api/group-buys", { cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.error || `團購商品載入失敗（${response.status}）。`);
        }
        if (!Array.isArray(result.groupBuys)) {
            throw new Error("團購商品資料格式不正確。");
        }
        groupBuys = result.groupBuys;
    } catch (error) {
        loadError = `無法載入最新團購：${error.message}`;
    }
    renderHomeCatalog();
}

searchInput?.addEventListener("input", renderHomeCatalog);
searchForm?.addEventListener("submit", event => {
    event.preventDefault();
    renderHomeCatalog();
});

categoryButtons.forEach(button => {
    button.addEventListener("click", event => {
        event.preventDefault();
        selectedCategory = button.dataset.category;
        categoryButtons.forEach(categoryButton => {
            const selected = categoryButton === button;
            categoryButton.classList.toggle("is-active", selected);
            if (selected) {
                categoryButton.setAttribute("aria-current", "true");
            } else {
                categoryButton.removeAttribute("aria-current");
            }
        });
        renderHomeCatalog();
    });
});

loadGroupBuys();
