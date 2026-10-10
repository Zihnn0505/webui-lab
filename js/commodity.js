const cardsContainer = document.querySelector(".cards");
const pagination = document.querySelector(".pagination");
const resultTotal = document.querySelector(".result-total");
const resultRange = document.querySelector(".result-range");

if (cardsContainer && pagination && resultTotal && resultRange) {
    const pageSize = 20;
    const cardTemplates = Array.from(cardsContainer.children);
    const totalItems = Number(resultTotal.textContent) || cardTemplates.length;

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

        cardsContainer.append(card);
    }

    const cards = Array.from(cardsContainer.children);
    const pageCount = Math.max(1, Math.ceil(cards.length / pageSize));
    const requestedPage = Number(new URLSearchParams(window.location.search).get("page")) || 1;
    const currentPage = Math.min(Math.max(requestedPage, 1), pageCount);
    const firstItem = (currentPage - 1) * pageSize + 1;
    const lastItem = Math.min(currentPage * pageSize, cards.length);

    resultRange.textContent = `${firstItem}-${lastItem}`;

    cards.forEach((card, index) => {
        card.hidden = index < (currentPage - 1) * pageSize || index >= currentPage * pageSize;
    });

    function createPageLink(label, page, className = "") {
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

    pagination.replaceChildren(
        createPageLink("上一頁", currentPage - 1, "page-btn--arrow"),
        ...Array.from({ length: pageCount }, (_, index) => createPageLink(String(index + 1), index + 1)),
        createPageLink("下一頁", currentPage + 1, "page-btn--arrow")
    );
}
