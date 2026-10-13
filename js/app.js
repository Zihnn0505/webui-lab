const searchForm = document.querySelector(".search");
const searchInput = document.querySelector('.search input[name="q"]');
const categoryLinks = document.querySelectorAll(".chip[data-category]");
const cards = document.querySelectorAll(".cards .card");
let selectedCategory = "all";

function filterCards() {
    const keyword = searchInput?.value.trim().toLowerCase() ?? "";

    cards.forEach(card => {
        const title = card.querySelector(".card__title")?.textContent.toLowerCase() ?? "";
        const matchesCategory = selectedCategory === "all" || card.dataset.category === selectedCategory;
        const matchesKeyword = title.includes(keyword);
        card.hidden = !(matchesCategory && matchesKeyword);
    });
}

if (searchForm && searchInput) {
    searchInput.addEventListener("input", filterCards);
    searchForm.addEventListener("submit", event => {
        event.preventDefault();
        filterCards();
    });
}

categoryLinks.forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();
        selectedCategory = link.dataset.category;

        categoryLinks.forEach(categoryLink => {
            const isSelected = categoryLink === link;
            categoryLink.classList.toggle("is-active", isSelected);

            if (isSelected) {
                categoryLink.setAttribute("aria-current", "true");
            } else {
                categoryLink.removeAttribute("aria-current");
            }
        });

        filterCards();
    });
});