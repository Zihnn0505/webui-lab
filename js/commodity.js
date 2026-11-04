import { createGroupBuyCard, mapGroupBuyCategory } from "./group-buy-card.js";

const cardsContainer = document.querySelector(".cards");
const pagination = document.querySelector(".pagination");
const resultTotal = document.querySelector(".result-total");
const resultRange = document.querySelector(".result-range");
const catalogStatus = document.querySelector("#catalog-status");
const searchForm = document.querySelector(".search");
const searchInput = document.querySelector('.search input[name="q"]');
const categoryButtons = document.querySelectorAll(".toolbar [data-category]");
const sortSelect = document.querySelector("#sort-select");
const pageSize = 20;
let groupBuys = [];
let selectedCategory = "all";

function showCatalogMessage(message) {
    if (!catalogStatus) {
        return;
    }
    catalogStatus.textContent = message;
    catalogStatus.hidden = message.length === 0;
}

function createPageLink(label, page, currentPage, pageCount, className = "") {
    const link = document.createElement("a");
    link.className = `page-btn ${className}`.trim();
    link.textContent = label;
    link.href = `?page=${page}`;

    if (page === currentPage && !className.includes("page-btn--arrow")) {
        link.classList.add("is-current");
        link.setAttribute("aria-current", "page");
    }
    if (page < 1 || page > pageCount) {
        link.removeAttribute("href");
        link.setAttribute("aria-disabled", "true");
    }
    return link;
}

function renderCatalog() {
    if (!cardsContainer || !pagination || !resultTotal || !resultRange) {
        return;
    }

    const keyword = searchInput?.value.trim().toLocaleLowerCase("zh-Hant-TW") ?? "";
    const matchingProducts = groupBuys.filter(groupBuy => {
        const title = groupBuy.title?.toLocaleLowerCase("zh-Hant-TW") ?? "";
        const matchesCategory = selectedCategory === "all"
            || mapGroupBuyCategory(groupBuy.category) === selectedCategory;
        return matchesCategory && title.includes(keyword);
    });

    const sortMode = sortSelect?.value ?? "popular";
    const sortedProducts = [...matchingProducts];
    if (sortMode === "popular") {
        sortedProducts.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
    } else if (sortMode === "ending-soon") {
        sortedProducts.sort((left, right) => new Date(left.deadline) - new Date(right.deadline));
    } else if (sortMode === "price-asc") {
        sortedProducts.sort((left, right) => Number(left.variants?.[0]?.price ?? 0) - Number(right.variants?.[0]?.price ?? 0));
    } else if (sortMode === "price-desc") {
        sortedProducts.sort((left, right) => Number(right.variants?.[0]?.price ?? 0) - Number(left.variants?.[0]?.price ?? 0));
    } else if (sortMode === "progress") {
        sortedProducts.sort((left, right) => {
            const leftProgress = Number(left.paidQuantity ?? 0) / Math.max(1, Number(left.minimumQuantity ?? 1));
            const rightProgress = Number(right.paidQuantity ?? 0) / Math.max(1, Number(right.minimumQuantity ?? 1));
            return rightProgress - leftProgress;
        });
    }

    const pageCount = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
    const requestedPage = Number(new URLSearchParams(window.location.search).get("page")) || 1;
    const currentPage = Math.min(Math.max(requestedPage, 1), pageCount);
    const firstItem = sortedProducts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const lastItem = Math.min(currentPage * pageSize, sortedProducts.length);
    const visibleProducts = sortedProducts.slice(firstItem === 0 ? 0 : firstItem - 1, lastItem);

    cardsContainer.replaceChildren(...visibleProducts.map(createGroupBuyCard));
    resultRange.textContent = `${firstItem}-${lastItem}`;
    resultTotal.textContent = String(sortedProducts.length);
    pagination.replaceChildren(
        createPageLink("上一頁", currentPage - 1, currentPage, pageCount, "page-btn--arrow"),
        ...Array.from({ length: pageCount }, (_, index) => createPageLink(String(index + 1), index + 1, currentPage, pageCount)),
        createPageLink("下一頁", currentPage + 1, currentPage, pageCount, "page-btn--arrow")
    );
}

async function loadPublicGroupBuys() {
    try {
        const response = await fetch("api/group-buys", { cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.error || `商品列表載入失敗（${response.status}）。`);
        }
        if (!Array.isArray(result.groupBuys)) {
            throw new Error("商品列表格式不正確，請稍後再試。");
        }

        groupBuys = result.groupBuys;
        showCatalogMessage("");
        renderCatalog();
    } catch (error) {
        groupBuys = [];
        renderCatalog();
        showCatalogMessage(`無法載入商品：${error.message}`);
    }
}

searchInput?.addEventListener("input", renderCatalog);
searchForm?.addEventListener("submit", event => {
    event.preventDefault();
    renderCatalog();
});

categoryButtons.forEach(button => {
    button.addEventListener("click", () => {
        selectedCategory = button.dataset.category;
        categoryButtons.forEach(categoryButton => {
            const selected = categoryButton === button;
            categoryButton.classList.toggle("is-active", selected);
            categoryButton.setAttribute("aria-pressed", String(selected));
        });
        renderCatalog();
    });
});

sortSelect?.addEventListener("change", renderCatalog);

if (cardsContainer && pagination && resultTotal && resultRange) {
    loadPublicGroupBuys();
}
