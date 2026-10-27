let currentCartUser = null;
const cartCountBadge = document.querySelector(".cart__count");
const cartTopbarLink = document.querySelector(".cart");

function renderCartBadge() {
    if (!currentCartUser) {
        if (cartCountBadge) {
            cartCountBadge.textContent = "0";
            cartCountBadge.hidden = true;
        }
        cartTopbarLink?.setAttribute("aria-label", "購物車，請先登入");
        return;
    }

    try {
        const storedCart = localStorage.getItem(`webui-cart-items:${currentCartUser.id}`);
        const cart = storedCart ? JSON.parse(storedCart) : [];
        if (!Array.isArray(cart)) {
            throw new Error("購物車資料格式錯誤，請清除瀏覽器的購物車資料後再試。");
        }

        const quantity = cart.reduce((total, item) => total + Number(item.quantity || 0), 0);
        if (cartCountBadge) {
            cartCountBadge.textContent = String(quantity);
            cartCountBadge.hidden = quantity === 0;
        }
        cartTopbarLink?.setAttribute("aria-label", `購物車，${quantity} 件商品`);
    } catch (error) {
        if (cartCountBadge) {
            cartCountBadge.textContent = "!";
            cartCountBadge.hidden = false;
        }
        cartTopbarLink?.setAttribute("aria-label", "購物車資料讀取失敗");
        console.error(error);
    }
}

document.addEventListener("auth:user-changed", event => {
    currentCartUser = event.detail.user;
    renderCartBadge();
});

document.addEventListener("cart:updated", renderCartBadge);

window.addEventListener("storage", event => {
    if (event.key === null || event.key === `webui-cart-items:${currentCartUser?.id}`) {
        renderCartBadge();
    }
});
