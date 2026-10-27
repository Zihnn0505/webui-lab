const detailDialog = document.createElement("dialog");
detailDialog.className = "product-dialog";
detailDialog.setAttribute("aria-labelledby", "product-dialog-title");
detailDialog.innerHTML = `
    <div class="product-dialog__content">
        <div class="product-dialog__header">
            <h2 id="product-dialog-title"></h2>
            <button class="product-dialog__close" type="button" aria-label="關閉商品詳情">×</button>
        </div>
        <div class="product-detail">
            <div class="product-detail__media"></div>
            <div class="product-detail__info">
                <p class="product-detail__price"></p>
                <p class="product-detail__description"></p>
                <p class="product-detail__progress"></p>
                <p class="product-detail__stock"></p>
                <dl class="product-detail__meta"></dl>
                <label class="product-detail__variant" hidden>
                    商品規格
                    <select name="variant"></select>
                </label>
                <label class="product-detail__quantity">
                    購買數量
                    <input name="quantity" type="number" min="1" value="1" required>
                </label>
                <p class="product-detail__status" role="status" aria-live="polite" hidden></p>
                <div class="product-detail__actions">
                    <button class="btn product-detail__add" type="button">加入購物車</button>
                    <button class="btn product-detail__buy" type="button">立即購買</button>
                </div>
            </div>
        </div>
    </div>`;
document.body.append(detailDialog);

const cartDialog = document.createElement("dialog");
cartDialog.className = "product-dialog product-dialog--cart";
cartDialog.setAttribute("aria-labelledby", "cart-dialog-title");
cartDialog.innerHTML = `
    <div class="product-dialog__content">
        <div class="product-dialog__header">
            <h2 id="cart-dialog-title">購物車</h2>
            <button class="product-dialog__close" type="button" aria-label="關閉購物車">×</button>
        </div>
        <ul class="cart-items"></ul>
        <p class="cart-empty" hidden>購物車目前沒有商品。</p>
        <p class="cart-total"></p>
        <p class="cart-notice">此示範網站尚未串接付款服務，商品尚未下單。</p>
    </div>`;
document.body.append(cartDialog);

const productTitle = detailDialog.querySelector("#product-dialog-title");
const productMedia = detailDialog.querySelector(".product-detail__media");
const productPrice = detailDialog.querySelector(".product-detail__price");
const productDescription = detailDialog.querySelector(".product-detail__description");
const productProgress = detailDialog.querySelector(".product-detail__progress");
const productStock = detailDialog.querySelector(".product-detail__stock");
const productMeta = detailDialog.querySelector(".product-detail__meta");
const variantField = detailDialog.querySelector(".product-detail__variant");
const variantSelect = detailDialog.querySelector('select[name="variant"]');
const quantityInput = detailDialog.querySelector('input[name="quantity"]');
const productStatus = detailDialog.querySelector(".product-detail__status");
const addButton = detailDialog.querySelector(".product-detail__add");
const buyButton = detailDialog.querySelector(".product-detail__buy");
const cartItems = cartDialog.querySelector(".cart-items");
const cartEmpty = cartDialog.querySelector(".cart-empty");
const cartTotal = cartDialog.querySelector(".cart-total");
const cartCount = document.querySelector(".cart__count");
const cartLink = document.querySelector(".cart");
const productAuthDialog = document.querySelector("#auth-dialog");
const productAuthOpenButton = document.querySelector("#auth-open-button");
let activeProduct;
let groupBuysRequest;
let currentUser = null;
let authStateReady = false;
let pendingAction = null;

function showProductMessage(message) {
    productStatus.textContent = message;
    productStatus.hidden = message.length === 0;
}

function readCart() {
    if (!currentUser) {
        throw new Error("請先登入再使用購物車。");
    }

    const storedCart = localStorage.getItem(`webui-cart-items:${currentUser.id}`);
    if (!storedCart) {
        return [];
    }

    const cart = JSON.parse(storedCart);
    if (!Array.isArray(cart)) {
        throw new Error("購物車資料格式錯誤，請清除瀏覽器的購物車資料後再試。");
    }
    return cart;
}

function renderCartCount() {
    if (!currentUser) {
        if (cartCount) {
            cartCount.textContent = "0";
            cartCount.hidden = true;
        }
        cartLink?.setAttribute("aria-label", "購物車，請先登入");
        return;
    }

    try {
        const quantity = readCart().reduce((total, item) => total + Number(item.quantity || 0), 0);
        if (cartCount) {
            cartCount.textContent = String(quantity);
            cartCount.hidden = quantity === 0;
        }
        cartLink?.setAttribute("aria-label", `購物車，${quantity} 件商品`);
    } catch (error) {
        if (cartCount) {
            cartCount.textContent = "!";
            cartCount.hidden = false;
        }
        cartLink?.setAttribute("aria-label", "購物車資料讀取失敗");
        console.error(error);
    }
}

function renderCart() {
    const cart = readCart();
    cartItems.replaceChildren();
    let total = 0;

    cart.forEach(item => {
        const row = document.createElement("li");
        row.className = "cart-item";
        const label = document.createElement("span");
        label.textContent = `${item.title}${item.variantName ? `（${item.variantName}）` : ""} × ${item.quantity}`;
        const price = document.createElement("strong");
        price.textContent = `$${(Number(item.price) * Number(item.quantity)).toLocaleString("zh-TW")}`;
        row.append(label, price);
        cartItems.append(row);
        total += Number(item.price) * Number(item.quantity);
    });

    cartEmpty.hidden = cart.length > 0;
    cartTotal.hidden = cart.length === 0;
    cartTotal.textContent = `小計 $${total.toLocaleString("zh-TW")}`;
}

function openCart() {
    try {
        renderCart();
        cartDialog.showModal();
    } catch (error) {
        showProductMessage(error.message);
        if (!detailDialog.open) {
            detailDialog.showModal();
        }
    }
}

function promptLogin() {
    if (!productAuthDialog || !productAuthOpenButton) {
        pendingAction = null;
        showProductMessage("目前無法開啟登入視窗，請重新整理頁面後再試。");
        return;
    }

    if (!productAuthDialog.open) {
        if (detailDialog.open) {
            detailDialog.close();
        }
        productAuthOpenButton.click();
    }
}

function requestAuthenticatedAction(action) {
    if (currentUser) {
        performAuthenticatedAction(action);
        return;
    }

    pendingAction = action;
    if (authStateReady) {
        if (action !== "cart") {
            showProductMessage("請先登入，登入後會繼續為您操作。");
        }
        promptLogin();
    } else if (action !== "cart") {
        showProductMessage("正在確認登入狀態，請稍候…");
    }
}

function performAuthenticatedAction(action) {
    if (action === "add") {
        addActiveProductToCart();
    } else if (action === "buy") {
        addActiveProductToCart(true);
    } else if (action === "cart") {
        openCart();
    }
}

function loadGroupBuys() {
    if (!groupBuysRequest) {
        groupBuysRequest = fetch("api/group-buys", { cache: "no-store" })
            .then(async response => {
                const result = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(result.error || `商品資訊載入失敗（${response.status}）。`);
                }
                if (!Array.isArray(result.groupBuys)) {
                    throw new Error("商品資訊格式不正確，請稍後再試。");
                }
                return result.groupBuys;
            });
    }
    return groupBuysRequest;
}

function productFromCard(card) {
    const inventory = Number(card.dataset.stock || 0);
    const paid = Number(card.dataset.paid || 0);
    const held = Number(card.dataset.held || 0);
    const remaining = Math.max(0, inventory - paid - held);
    const title = card.querySelector(".card__title")?.textContent.trim() || "商品";
    const price = Number(card.dataset.price || card.querySelector(".card__price")?.textContent.replace(/[^\d.]/g, "") || 0);
    const progressText = card.querySelector(".card__meta")?.textContent.trim() || "";
    const image = card.querySelector(".card__media img");
    const countdown = card.querySelector(".countdown");
    const minimum = Number(card.dataset.min || 0);
    return {
        id: card.dataset.groupBuyId || `demo:${title}`,
        title,
        category: card.dataset.category || "",
        tone: card.querySelector(".card__media")?.style.getPropertyValue("--tone") || "",
        description: `團購最低數量 ${minimum} 件。${progressText}`,
        images: image ? [image.src] : [],
        variants: [{ name: "一般規格", price, stock: remaining }],
        minimumQuantity: minimum,
        paidQuantity: paid,
        remainingQuantity: remaining,
        deadline: card.dataset.end || countdown?.dataset.end || "",
        status: card.querySelector(".pill")?.textContent.trim() || ""
    };
}

function renderProduct(product) {
    activeProduct = product;
    productTitle.textContent = product.title;
    productMedia.replaceChildren();
    const imageUrl = product.images?.[0];
    if (imageUrl) {
        const image = document.createElement("img");
        image.src = imageUrl;
        image.alt = product.title;
        productMedia.append(image);
    } else {
        productMedia.style.setProperty("--tone", product.tone || "#efe8db");
    }

    const variants = Array.isArray(product.variants) && product.variants.length > 0
        ? product.variants
        : [{ name: "一般規格", price: 0, stock: product.remainingQuantity ?? 0 }];
    variantSelect.replaceChildren();
    variants.forEach((variant, index) => {
        const option = document.createElement("option");
        option.value = String(index);
        option.textContent = `${variant.name}（$${Number(variant.price).toLocaleString("zh-TW")}）`;
        option.dataset.price = String(variant.price);
        option.dataset.stock = String(variant.stock);
        variantSelect.append(option);
    });
    variantField.hidden = variants.length < 2;
    productDescription.textContent = product.description || "加入團購，享有團購優惠價格。";
    productProgress.textContent = `已付款 ${Number(product.paidQuantity || 0)}／最低 ${Number(product.minimumQuantity || 0)} 件`;
    productStock.textContent = `剩餘 ${Number(product.remainingQuantity || 0)} 件`;
    const categoryNames = {
        food: "食品飲料",
        daily: "生活用品",
        home: "生活用品",
        electronics: "3C 配件",
        clothing: "服飾配件",
        fashion: "服飾配件",
        beauty: "美妝保養",
        other: "其他"
    };
    const category = categoryNames[product.category] || product.category || "";
    const details = [
        ["商品分類", category],
        ["截止時間", product.deadline ? new Date(product.deadline).toLocaleString("zh-TW") : ""],
        ["預計出貨", product.estimatedShipDate ? new Date(product.estimatedShipDate).toLocaleDateString("zh-TW") : ""],
        ["運費", product.shippingFee === null || product.shippingFee === undefined ? "" : `$${Number(product.shippingFee).toLocaleString("zh-TW")}`],
        ["配送方式", product.shippingMethod || ""],
        ["每人限購", product.limitPerBuyer ? `${product.limitPerBuyer} 件` : ""]
    ].filter(([, value]) => value);
    productMeta.replaceChildren();
    details.forEach(([label, value]) => {
        const term = document.createElement("dt");
        term.textContent = label;
        const description = document.createElement("dd");
        description.textContent = value;
        productMeta.append(term, description);
    });
    quantityInput.value = "1";
    showProductMessage("");
    const isUnavailable = Number(product.remainingQuantity) <= 0
        || product.status === "已額滿"
        || product.status === "已截止"
        || product.status === "full"
        || product.status === "ended";
    updateSelectedVariant();
    quantityInput.disabled = isUnavailable;
    if (isUnavailable) {
        addButton.disabled = true;
        buyButton.disabled = true;
    }
    if (isUnavailable) {
        showProductMessage("此商品目前已額滿或截止，暫時無法購買。");
    }
}

function updateSelectedVariant() {
    const variant = activeProduct?.variants?.[Number(variantSelect.value) || 0];
    if (!variant) {
        return;
    }

    const remaining = Number(activeProduct.remainingQuantity ?? variant.stock ?? 0);
    const available = Math.max(0, Math.min(Number(variant.stock ?? remaining), remaining));
    productPrice.textContent = `團購價 $${Number(variant.price).toLocaleString("zh-TW")}`;
    productStock.textContent = `此規格剩餘 ${available} 件`;
    variantSelect.selectedOptions[0].dataset.stock = String(available);
    quantityInput.max = String(available);
    if (Number(quantityInput.value) > available) {
        quantityInput.value = String(available || 1);
    }
    const isUnavailable = available === 0;
    addButton.disabled = isUnavailable;
    buyButton.disabled = isUnavailable;
}

async function openProduct(card) {
    const product = productFromCard(card);
    renderProduct(product);
    detailDialog.showModal();

    if (!card.dataset.groupBuyId) {
        return;
    }

    try {
        const groupBuys = await loadGroupBuys();
        const currentProduct = groupBuys.find(groupBuy => groupBuy.id === card.dataset.groupBuyId);
        if (currentProduct && detailDialog.open && activeProduct?.id === currentProduct.id) {
            renderProduct(currentProduct);
        }
    } catch (error) {
        if (detailDialog.open && activeProduct?.id === product.id) {
            showProductMessage(error.message);
        }
    }
}

function addActiveProductToCart(openCartAfterAdd = false) {
    if (!currentUser || !activeProduct) {
        return;
    }

    const quantity = Number(quantityInput.value);
    const selectedVariant = variantSelect.selectedOptions[0];
    const variantIndex = Number(variantSelect.value) || 0;
    const variant = activeProduct.variants?.[variantIndex] ?? activeProduct.variants?.[0];
    const available = Number(selectedVariant?.dataset.stock ?? variant?.stock ?? activeProduct.remainingQuantity ?? 0);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > available) {
        showProductMessage(`請輸入 1 至 ${available} 件的購買數量。`);
        return;
    }

    try {
        const cart = readCart();
        const itemId = `${activeProduct.id}:${variant?.name || "default"}`;
        const currentItem = cart.find(item => item.id === itemId);
        if (currentItem && Number(currentItem.quantity) + quantity > available) {
            showProductMessage(`購物車已有 ${currentItem.quantity} 件，最多只能購買 ${available} 件。`);
            return;
        }
        if (currentItem) {
            currentItem.quantity = Number(currentItem.quantity) + quantity;
        } else {
            cart.push({
                id: itemId,
                title: activeProduct.title,
                variantName: variant?.name || "",
                price: Number(variant?.price || 0),
                quantity,
                image: activeProduct.images?.[0] || ""
            });
        }
        localStorage.setItem(`webui-cart-items:${currentUser.id}`, JSON.stringify(cart));
        renderCartCount();
        showProductMessage(openCartAfterAdd
            ? "商品已加入購物車，以下為本次立即購買項目。"
            : "已加入購物車。");
        if (openCartAfterAdd) {
            detailDialog.close();
            openCart();
        }
    } catch (error) {
        showProductMessage(error.message || "無法儲存購物車，請稍後再試。");
    }
}

document.addEventListener("click", event => {
    const cartTrigger = event.target.closest(".cart");
    if (cartTrigger) {
        event.preventDefault();
        requestAuthenticatedAction("cart");
        return;
    }

    const card = event.target.closest(".cards .card");
    if (card && !event.target.closest("button, select, input")) {
        event.preventDefault();
        openProduct(card);
    }
});

document.addEventListener("auth:user-changed", event => {
    currentUser = event.detail.user;
    authStateReady = true;
    renderCartCount();

    if (!pendingAction) {
        return;
    }

    if (!currentUser) {
        if (pendingAction !== "cart") {
            showProductMessage("請先登入，才能加入購物車或直接購買。");
        }
        promptLogin();
        return;
    }

    const action = pendingAction;
    pendingAction = null;
    window.setTimeout(() => {
        if (action !== "cart" && activeProduct && !detailDialog.open) {
            detailDialog.showModal();
        }
        performAuthenticatedAction(action);
    }, 0);
});

document.addEventListener("auth:load-failed", event => {
    authStateReady = true;
    if (pendingAction) {
        pendingAction = null;
        if (activeProduct && !detailDialog.open) {
            detailDialog.showModal();
        }
        showProductMessage(`無法確認登入狀態：${event.detail.error}`);
    }
});

detailDialog.querySelector(".product-dialog__close").addEventListener("click", () => detailDialog.close());
cartDialog.querySelector(".product-dialog__close").addEventListener("click", () => cartDialog.close());
addButton.addEventListener("click", () => requestAuthenticatedAction("add"));
buyButton.addEventListener("click", () => requestAuthenticatedAction("buy"));
variantSelect.addEventListener("change", updateSelectedVariant);
cartDialog.addEventListener("click", event => {
    if (event.target === cartDialog) {
        cartDialog.close();
    }
});
detailDialog.addEventListener("click", event => {
    if (event.target === detailDialog) {
        detailDialog.close();
    }
});

productAuthDialog?.addEventListener("close", () => {
    if (!pendingAction) {
        return;
    }
    pendingAction = null;
    if (activeProduct) {
        showProductMessage("登入已取消，登入後才能加入購物車或直接購買。");
    }
});

const requestedGroupId = new URLSearchParams(window.location.search).get("group");
if (requestedGroupId) {
    loadGroupBuys().then(groupBuys => {
        const product = groupBuys.find(groupBuy => groupBuy.id === requestedGroupId);
        if (product) {
            const card = document.querySelector(`[data-group-buy-id="${CSS.escape(product.id)}"]`);
            if (card) {
                openProduct(card);
            } else {
                const temporaryCard = document.createElement("li");
                temporaryCard.className = "card";
                temporaryCard.dataset.groupBuyId = product.id;
                temporaryCard.dataset.stock = String(product.inventory);
                temporaryCard.dataset.paid = String(product.paidQuantity);
                temporaryCard.dataset.held = String(product.reservedQuantity);
                temporaryCard.dataset.min = String(product.minimumQuantity);
                temporaryCard.dataset.price = String(product.variants[0]?.price || 0);
                openProduct(temporaryCard).then(() => renderProduct(product));
            }
        }
    }).catch(error => {
        console.error(error);
    });
}
