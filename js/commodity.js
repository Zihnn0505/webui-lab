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
let selectedCategory = "all";

function showCatalogMessage(message) {
    if (!catalogStatus) {
        return;
    }
    catalogStatus.textContent = message;
    catalogStatus.hidden = message.length === 0;
}

function mapCategory(category) {
    switch (category) {
        case "食品飲料":
            return "food";
        case "生活用品":
            return "home";
        case "服飾配件":
            return "fashion";
        case "3C家電":
            return "electronics";
        default:
            return "other";
    }
}

function createGroupBuyCard(groupBuy) {
    const card = document.createElement("li");
    card.className = "card";
    card.dataset.groupBuyId = groupBuy.id;
    card.dataset.category = mapCategory(groupBuy.category);
    card.dataset.min = String(groupBuy.minimumQuantity);
    card.dataset.stock = String(groupBuy.inventory);
    card.dataset.paid = String(groupBuy.paidQuantity);
    card.dataset.held = String(groupBuy.reservedQuantity);
    card.dataset.price = String(groupBuy.variants[0].price);
    card.dataset.end = groupBuy.deadline;

    const media = document.createElement("div");
    media.className = "card__media";
    const image = document.createElement("img");
    image.src = groupBuy.images[0];
    image.alt = groupBuy.title;
    image.loading = "lazy";
    media.append(image);

    const statusLabels = {
        open: ["募集中", "pill--open"],
        soon: ["即將截止", "pill--soon"],
        done: ["已成團", "pill--done"],
        full: ["已額滿", "pill--full"],
        ended: ["已截止", "pill--ended"]
    };
    const [statusText, statusClass] = statusLabels[groupBuy.status] ?? statusLabels.open;
    const status = document.createElement("span");
    status.className = `pill ${statusClass}`;
    status.textContent = statusText;
    media.append(status);

    const body = document.createElement("div");
    body.className = "card__body";
    const title = document.createElement("h3");
    title.className = "card__title";
    const titleLink = document.createElement("a");
    titleLink.className = "card__link";
    titleLink.href = `commodity.html?group=${encodeURIComponent(groupBuy.id)}`;
    titleLink.textContent = groupBuy.title;
    title.append(titleLink);

    const price = document.createElement("p");
    price.className = "card__price";
    price.textContent = `$${Number(groupBuy.variants[0].price).toLocaleString("zh-TW")}`;

    const progress = document.createElement("div");
    const progressValue = Math.min(100, Math.floor(groupBuy.paidQuantity / groupBuy.minimumQuantity * 100));
    progress.className = "progress";
    progress.style.setProperty("--value", String(progressValue));
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-label", "成團進度");
    progress.setAttribute("aria-valuenow", String(progressValue));
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "100");

    const progressText = document.createElement("p");
    progressText.className = "card__meta";
    progressText.textContent = `已付款 ${groupBuy.paidQuantity}／最低 ${groupBuy.minimumQuantity}`;

    const footer = document.createElement("p");
    footer.className = "card__foot";
    const stock = document.createElement("span");
    stock.className = "card__stock";
    stock.textContent = `剩餘 ${groupBuy.remainingQuantity} 件`;
    if (groupBuy.remainingQuantity <= 10) {
        stock.classList.add("card__stock--low");
    }
    const deadline = document.createElement("time");
    deadline.className = "countdown";
    deadline.dateTime = groupBuy.deadline;
    deadline.textContent = `截止 ${new Date(groupBuy.deadline).toLocaleString("zh-TW", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    })}`;
    footer.append(stock, deadline);

    body.append(title, price, progress, progressText, footer);
    card.append(media, body);
    return card;
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
    const matchingCards = Array.from(cardsContainer.children).filter(card => {
        const title = card.querySelector(".card__title")?.textContent.toLocaleLowerCase("zh-Hant-TW") ?? "";
        return (selectedCategory === "all" || card.dataset.category === selectedCategory)
            && title.includes(keyword);
    });
    const sortMode = sortSelect?.value ?? "popular";
    const sortedCards = [...matchingCards];
    if (sortMode === "ending-soon") {
        sortedCards.sort((left, right) => new Date(left.dataset.end ?? "9999-12-31") - new Date(right.dataset.end ?? "9999-12-31"));
    } else if (sortMode === "price-asc") {
        sortedCards.sort((left, right) => Number(left.dataset.price ?? 0) - Number(right.dataset.price ?? 0));
    } else if (sortMode === "price-desc") {
        sortedCards.sort((left, right) => Number(right.dataset.price ?? 0) - Number(left.dataset.price ?? 0));
    } else if (sortMode === "progress") {
        sortedCards.sort((left, right) => {
            const leftProgress = Number(left.dataset.paid ?? 0) / Math.max(1, Number(left.dataset.min ?? 1));
            const rightProgress = Number(right.dataset.paid ?? 0) / Math.max(1, Number(right.dataset.min ?? 1));
            return rightProgress - leftProgress;
        });
    }

    const pageCount = Math.max(1, Math.ceil(sortedCards.length / pageSize));
    const requestedPage = Number(new URLSearchParams(window.location.search).get("page")) || 1;
    const currentPage = Math.min(Math.max(requestedPage, 1), pageCount);
    const firstItem = sortedCards.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const lastItem = Math.min(currentPage * pageSize, sortedCards.length);
    const visibleCards = new Set(sortedCards.slice(firstItem === 0 ? 0 : firstItem - 1, lastItem));

    Array.from(cardsContainer.children).forEach(card => {
        card.hidden = !visibleCards.has(card);
    });

    resultRange.textContent = `${firstItem}-${lastItem}`;
    resultTotal.textContent = String(sortedCards.length);
    pagination.replaceChildren(
        createPageLink("上一頁", currentPage - 1, currentPage, pageCount, "page-btn--arrow"),
        ...Array.from({ length: pageCount }, (_, index) => createPageLink(String(index + 1), index + 1, currentPage, pageCount)),
        createPageLink("下一頁", currentPage + 1, currentPage, pageCount, "page-btn--arrow")
    );
}

if (cardsContainer && resultTotal) {
    const cardTemplates = Array.from(cardsContainer.children);
    const totalItems = Number(resultTotal.textContent) || cardTemplates.length;
    const demoCategories = ["food", "home", "electronics", "fashion", "beauty"];

    cardTemplates.forEach((card, index) => {
        card.dataset.category = demoCategories[index % demoCategories.length];
        card.dataset.price = card.querySelector(".card__price")?.textContent.replace(/[^\d.]/g, "") ?? "0";
    });

    for (let index = cardTemplates.length; index < totalItems; index += 1) {
        const card = cardTemplates[index % cardTemplates.length].cloneNode(true);
        const title = card.querySelector(".card__title");
        const titleLink = title.querySelector("a");
        const productName = `商品 ${index + 1}`;
        if (titleLink) {
            titleLink.textContent = productName;
        } else {
            title.textContent = productName;
        }
        card.dataset.category = demoCategories[index % demoCategories.length];
        card.dataset.price = card.querySelector(".card__price")?.textContent.replace(/[^\d.]/g, "") ?? "0";
        cardsContainer.append(card);
    }

    renderCatalog();
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

async function loadPublicGroupBuys() {
    try {
        const response = await fetch("api/group-buys", { cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.error || `商品列表載入失敗（${response.status}）。`);
        }

        const groupBuys = Array.isArray(result.groupBuys) ? result.groupBuys : [];
        groupBuys.forEach(groupBuy => {
            const currentCard = cardsContainer.querySelector(`[data-group-buy-id="${CSS.escape(groupBuy.id)}"]`);
            const card = createGroupBuyCard(groupBuy);
            if (currentCard) {
                currentCard.replaceWith(card);
            } else {
                cardsContainer.prepend(card);
            }
        });
        renderCatalog();
    } catch (error) {
        showCatalogMessage(`無法載入最新團購：${error.message}`);
    }
}

if (cardsContainer) {
    loadPublicGroupBuys();
}
