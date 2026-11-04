const categories = new Map([
    ["食品飲料", "food"],
    ["food", "food"],
    ["生活用品", "home"],
    ["daily", "home"],
    ["home", "home"],
    ["服飾配件", "fashion"],
    ["clothing", "fashion"],
    ["fashion", "fashion"],
    ["3C家電", "electronics"],
    ["electronics", "electronics"],
    ["美妝保養", "beauty"],
    ["beauty", "beauty"]
]);

const statusLabels = {
    open: ["募集中", "pill--open"],
    soon: ["即將截止", "pill--soon"],
    done: ["已成團", "pill--done"],
    full: ["已額滿", "pill--full"],
    ended: ["已截止", "pill--ended"]
};

export function mapGroupBuyCategory(category) {
    return categories.get(category) || "other";
}

export function createGroupBuyCard(groupBuy) {
    const variants = Array.isArray(groupBuy.variants) ? groupBuy.variants : [];
    const inventory = Number(groupBuy.inventory) || 0;
    const paidQuantity = Number(groupBuy.paidQuantity) || 0;
    const reservedQuantity = Number(groupBuy.reservedQuantity) || 0;
    const minimumQuantity = Number(groupBuy.minimumQuantity) || 0;
    const remainingQuantity = Number(groupBuy.remainingQuantity ?? inventory - paidQuantity - reservedQuantity);
    const price = Number(variants[0]?.price) || 0;
    const progressValue = minimumQuantity > 0
        ? Math.min(100, Math.floor(paidQuantity / minimumQuantity * 100))
        : 0;

    const card = document.createElement("li");
    card.className = "card";
    card.dataset.groupBuyId = groupBuy.id;
    card.dataset.category = mapGroupBuyCategory(groupBuy.category);
    card.dataset.min = String(minimumQuantity);
    card.dataset.stock = String(inventory);
    card.dataset.paid = String(paidQuantity);
    card.dataset.held = String(reservedQuantity);
    card.dataset.price = String(price);
    card.dataset.end = groupBuy.deadline || "";
    card.dataset.created = groupBuy.createdAt || "";

    const media = document.createElement("div");
    media.className = "card__media";
    const imageUrl = groupBuy.images?.[0];
    if (imageUrl) {
        const image = document.createElement("img");
        image.src = imageUrl;
        image.alt = groupBuy.title;
        image.loading = "lazy";
        media.append(image);
    }

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

    const priceLabel = document.createElement("p");
    priceLabel.className = "card__price";
    priceLabel.textContent = `$${price.toLocaleString("zh-TW")}`;

    const progress = document.createElement("div");
    progress.className = "progress";
    progress.style.setProperty("--value", String(progressValue));
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-label", "成團進度");
    progress.setAttribute("aria-valuenow", String(progressValue));
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "100");

    const progressText = document.createElement("p");
    progressText.className = "card__meta";
    progressText.textContent = `已付款 ${paidQuantity}／最低 ${minimumQuantity}`;

    const footer = document.createElement("p");
    footer.className = "card__foot";
    const stock = document.createElement("span");
    stock.className = "card__stock";
    stock.textContent = `剩餘 ${remainingQuantity} 件`;
    if (remainingQuantity <= 10) {
        stock.classList.add("card__stock--low");
    }

    const deadline = document.createElement("time");
    deadline.className = "countdown";
    deadline.dateTime = groupBuy.deadline || "";
    deadline.textContent = groupBuy.deadline
        ? `截止 ${new Date(groupBuy.deadline).toLocaleString("zh-TW", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        })}`
        : "";
    footer.append(stock, deadline);

    body.append(title, priceLabel, progress, progressText, footer);
    card.append(media, body);
    return card;
}
