const detailDialog = document.createElement("dialog");
detailDialog.className = "product-dialog";
detailDialog.setAttribute("aria-labelledby", "product-dialog-title");
detailDialog.innerHTML = `
    <div class="product-dialog__content">
        <div class="product-dialog__header">
            <h2 id="product-dialog-title"></h2>
            <span class="product-detail__badge"></span>
            <button class="product-dialog__close" type="button" aria-label="關閉商品詳情">×</button>
        </div>
        <div class="product-detail">
            <div class="product-detail__gallery">
                <div class="product-detail__media"></div>
                <div class="product-detail__thumbnails" aria-label="商品圖片"></div>
            </div>
            <div class="product-detail__info">
                <p class="product-detail__price"></p>
                <div class="product-detail__group-progress">
                    <div class="product-detail__progress-bar" role="progressbar" aria-label="成團進度" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                        <span></span>
                    </div>
                    <p class="product-detail__progress"></p>
                </div>
                <p class="product-detail__deadline"></p>
                <section class="product-detail__variant">
                    <h3>規格</h3>
                    <div class="product-detail__variants" role="group" aria-label="選擇商品規格"></div>
                </section>
                <section class="product-detail__quantity">
                    <h3>數量</h3>
                    <div class="product-detail__quantity-controls">
                        <button class="product-detail__quantity-step" type="button" data-quantity-step="-1" aria-label="減少數量">−</button>
                        <input name="quantity" type="number" min="1" step="1" value="1" required aria-label="購買數量">
                        <button class="product-detail__quantity-step" type="button" data-quantity-step="1" aria-label="增加數量">＋</button>
                    </div>
                    <p class="product-detail__stock"></p>
                </section>
                <div class="product-detail__subtotal">
                    <span>小計</span>
                    <strong></strong>
                </div>
                <p class="product-detail__status" role="status" aria-live="polite" hidden></p>
                <div class="product-detail__actions">
                    <button class="btn product-detail__buy" type="button">立即購買</button>
                    <button class="btn product-detail__add" type="button">加入購物車</button>
                </div>
                <p class="product-detail__refund">未達成團門檻，款項會自動退回</p>
            </div>
        </div>
        <div class="product-detail__footer">
            <p class="product-detail__description"></p>
            <dl class="product-detail__meta"></dl>
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
const productBadge = detailDialog.querySelector(".product-detail__badge");
const productMedia = detailDialog.querySelector(".product-detail__media");
const productThumbnails = detailDialog.querySelector(".product-detail__thumbnails");
const productPrice = detailDialog.querySelector(".product-detail__price");
const productDescription = detailDialog.querySelector(".product-detail__description");
const productProgress = detailDialog.querySelector(".product-detail__progress");
const productProgressBar = detailDialog.querySelector(".product-detail__progress-bar");
const productDeadline = detailDialog.querySelector(".product-detail__deadline");
const productStock = detailDialog.querySelector(".product-detail__stock");
const productMeta = detailDialog.querySelector(".product-detail__meta");
const variantChoices = detailDialog.querySelector(".product-detail__variants");
const quantityInput = detailDialog.querySelector('input[name="quantity"]');
const subtotal = detailDialog.querySelector(".product-detail__subtotal strong");
const productStatus = detailDialog.querySelector(".product-detail__status");
const addButton = detailDialog.querySelector(".product-detail__add");
const buyButton = detailDialog.querySelector(".product-detail__buy");
const cartItems = cartDialog.querySelector(".cart-items");
const cartEmpty = cartDialog.querySelector(".cart-empty");
const cartTotal = cartDialog.querySelector(".cart-total");
const productAuthDialog = document.querySelector("#auth-dialog");
const productAuthOpenButton = document.querySelector("#auth-open-button");
let activeProduct;
let groupBuysRequest;
let currentUser = null;
let authStateReady = false;
let pendingAction = null;
let selectedVariantIndex = 0;
window.setInterval(() => {
    if (detailDialog.open) {
        formatDeadline();
    }
}, 60 * 1000);

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

function getProductStatus(product) {
    const statusLabels = {
        open: ["募集中", "product-detail__badge--open"],
        soon: ["即將截止", "product-detail__badge--soon"],
        done: ["已成團", "product-detail__badge--done"],
        full: ["已額滿", "product-detail__badge--full"],
        ended: ["已截止", "product-detail__badge--ended"],
        "募集中": ["募集中", "product-detail__badge--open"],
        "即將截止": ["即將截止", "product-detail__badge--soon"],
        "已成團": ["已成團", "product-detail__badge--done"],
        "已額滿": ["已額滿", "product-detail__badge--full"],
        "已截止": ["已截止", "product-detail__badge--ended"]
    };
    return statusLabels[product.status] || statusLabels.open;
}

function isProductUnavailable(product) {
    return Number(product.remainingQuantity) <= 0
        || product.status === "已額滿"
        || product.status === "已截止"
        || product.status === "full"
        || product.status === "ended"
        || (!["done", "已成團"].includes(product.status)
            && product.deadline
            && new Date(product.deadline).getTime() <= Date.now());
}

function formatDeadline() {
    if (!activeProduct?.deadline) {
        productDeadline.hidden = true;
        return;
    }

    const deadline = new Date(activeProduct.deadline);
    if (Number.isNaN(deadline.getTime())) {
        productDeadline.hidden = true;
        return;
    }

    const dateLabel = `${String(deadline.getMonth() + 1).padStart(2, "0")}/${String(deadline.getDate()).padStart(2, "0")} ${String(deadline.getHours()).padStart(2, "0")}:${String(deadline.getMinutes()).padStart(2, "0")} 截止`;
    const remainingMs = deadline.getTime() - Date.now();
    let remainingLabel;
    if (remainingMs <= 0) {
        remainingLabel = "已截止";
    } else if (remainingMs < 60 * 60 * 1000) {
        remainingLabel = `剩 ${Math.max(1, Math.ceil(remainingMs / (60 * 1000)))} 分鐘`;
    } else if (remainingMs >= 24 * 60 * 60 * 1000) {
        const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
        const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        remainingLabel = `剩 ${days} 天${hours ? ` ${hours} 小時` : ""}`;
    } else {
        remainingLabel = `剩 ${Math.ceil(remainingMs / (60 * 60 * 1000))} 小時`;
    }

    productDeadline.textContent = `${dateLabel}・${remainingLabel}`;
    productDeadline.hidden = false;
    if (remainingMs <= 0 && !["done", "full", "ended", "已成團", "已額滿", "已截止"].includes(activeProduct.status)) {
        activeProduct.status = "ended";
        productBadge.textContent = "已截止";
        productBadge.className = "product-detail__badge product-detail__badge--ended";
        variantChoices.querySelectorAll(".product-detail__variant-choice").forEach(choice => {
            choice.disabled = true;
            choice.classList.add("is-sold-out");
        });
        updateSelectedVariant();
        showProductMessage("此商品已截止，暫時無法購買。");
    }
}

function renderProduct(product) {
    activeProduct = product;
    productTitle.textContent = product.title;
    productMedia.replaceChildren();
    productThumbnails.replaceChildren();
    productMedia.style.removeProperty("--tone");
    const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
    if (images.length > 0) {
        const image = document.createElement("img");
        image.src = images[0];
        image.alt = product.title;
        productMedia.append(image);
    } else {
        if (product.tone) {
            productMedia.style.setProperty("--tone", product.tone);
        }
        const placeholder = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        placeholder.classList.add("product-detail__placeholder");
        placeholder.setAttribute("viewBox", "0 0 24 24");
        placeholder.setAttribute("fill", "none");
        placeholder.setAttribute("aria-hidden", "true");
        placeholder.innerHTML = '<rect x="4" y="4.5" width="16" height="15" rx="2" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="9.5" r="1.5" stroke="currentColor" stroke-width="2"/><path d="m5 17 5-5 3 3 2-2 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
        productMedia.append(placeholder);
    }
    for (let index = 0; index < Math.max(3, images.length); index += 1) {
        const thumbnail = document.createElement("button");
        thumbnail.type = "button";
        thumbnail.className = "product-detail__thumbnail";
        thumbnail.setAttribute("aria-label", images[index] ? `查看第 ${index + 1} 張商品圖片` : "商品圖片預覽");
        thumbnail.disabled = !images[index];
        if (images[index]) {
            const thumbnailImage = document.createElement("img");
            thumbnailImage.src = images[index];
            thumbnailImage.alt = "";
            thumbnail.append(thumbnailImage);
            thumbnail.setAttribute("aria-pressed", String(index === 0));
            if (index === 0) {
                thumbnail.classList.add("is-active");
            }
        }
        productThumbnails.append(thumbnail);
    }

    const variants = Array.isArray(product.variants) && product.variants.length > 0
        ? product.variants
        : [{ name: "一般規格", price: 0, stock: product.remainingQuantity ?? 0 }];
    selectedVariantIndex = 0;
    variantChoices.replaceChildren();
    variants.forEach((variant, index) => {
        const choice = document.createElement("button");
        const available = Math.max(0, Math.min(Number(variant.stock ?? product.remainingQuantity ?? 0), Number(product.remainingQuantity ?? variant.stock ?? 0)));
        choice.type = "button";
        choice.className = "product-detail__variant-choice";
        choice.dataset.variantIndex = String(index);
        choice.disabled = available === 0 || isProductUnavailable(product);
        choice.setAttribute("aria-pressed", String(index === 0));
        const name = document.createElement("span");
        name.className = "product-detail__variant-name";
        name.textContent = variant.name;
        const detail = document.createElement("span");
        detail.className = "product-detail__variant-detail";
        detail.textContent = available > 0
            ? `$${Number(variant.price).toLocaleString("zh-TW")}・剩 ${available} 件`
            : `$${Number(variant.price).toLocaleString("zh-TW")}・已售完`;
        choice.append(name, detail);
        if (choice.disabled) {
            choice.classList.add("is-sold-out");
        }
        variantChoices.append(choice);
    });
    const firstAvailableVariant = Array.from(variantChoices.children).findIndex(choice => !choice.disabled);
    if (firstAvailableVariant >= 0) {
        selectedVariantIndex = firstAvailableVariant;
    }
    productDescription.textContent = product.description || "加入團購，享有團購優惠價格。";
    const paidQuantity = Number(product.paidQuantity || 0);
    const minimumQuantity = Number(product.minimumQuantity || 0);
    const remainingToGoal = Math.max(0, minimumQuantity - paidQuantity);
    const progressValue = minimumQuantity > 0 ? Math.min(100, Math.floor(paidQuantity / minimumQuantity * 100)) : 0;
    productProgressBar.style.setProperty("--value", String(progressValue));
    productProgressBar.setAttribute("aria-valuenow", String(progressValue));
    productProgress.textContent = remainingToGoal > 0
        ? `已付款 ${paidQuantity}／${minimumQuantity} 件，還差 ${remainingToGoal} 件成團`
        : `已付款 ${paidQuantity} 件，已達成團門檻`;
    const [statusLabel, statusClass] = getProductStatus(product);
    productBadge.textContent = statusLabel;
    productBadge.className = `product-detail__badge ${statusClass}`;
    formatDeadline();
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
    quantityInput.disabled = false;
    showProductMessage("");
    updateSelectedVariant();
    if (isProductUnavailable(product)) {
        showProductMessage("此商品目前已額滿或截止，暫時無法購買。");
    }
}

function updateSelectedVariant() {
    const variant = activeProduct?.variants?.[selectedVariantIndex];
    if (!variant) {
        return;
    }

    const remaining = Number(activeProduct.remainingQuantity ?? variant.stock ?? 0);
    const available = Math.max(0, Math.min(Number(variant.stock ?? remaining), remaining));
    const soldOut = available === 0 || isProductUnavailable(activeProduct);
    productPrice.textContent = `$${Number(variant.price).toLocaleString("zh-TW")}`;
    productStock.textContent = `此規格剩餘 ${available} 件`;
    productPrice.setAttribute("aria-label", `團購價 ${productPrice.textContent}`);
    quantityInput.max = String(available);
    if (Number(quantityInput.value) > available) {
        quantityInput.value = String(available || 1);
    }
    quantityInput.disabled = soldOut;
    detailDialog.querySelectorAll(".product-detail__variant-choice").forEach((choice, index) => {
        choice.setAttribute("aria-pressed", String(index === selectedVariantIndex));
    });
    updateQuantityControls();
}

function updateQuantityControls() {
    const variant = activeProduct?.variants?.[selectedVariantIndex];
    const available = variant
        ? Math.max(0, Math.min(Number(variant.stock ?? activeProduct.remainingQuantity ?? 0), Number(activeProduct.remainingQuantity ?? variant.stock ?? 0)))
        : 0;
    const quantity = Number(quantityInput.value) || 0;
    const soldOut = available === 0 || isProductUnavailable(activeProduct || {});
    detailDialog.querySelectorAll("[data-quantity-step]").forEach(button => {
        const step = Number(button.dataset.quantityStep);
        button.disabled = soldOut || (step < 0 && quantity <= 1);
    });
    addButton.disabled = soldOut;
    buyButton.disabled = soldOut;
    subtotal.textContent = `$${((Number(variant?.price) || 0) * quantity).toLocaleString("zh-TW")}`;
}

function chooseVariant(index) {
    if (!activeProduct?.variants?.[index]) {
        return;
    }
    const choice = variantChoices.querySelector(`[data-variant-index="${index}"]`);
    if (choice?.disabled) {
        return;
    }
    selectedVariantIndex = index;
    quantityInput.value = "1";
    showProductMessage("");
    updateSelectedVariant();
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
    const variant = activeProduct.variants?.[selectedVariantIndex] ?? activeProduct.variants?.[0];
    const available = Math.max(0, Math.min(Number(variant?.stock ?? activeProduct.remainingQuantity ?? 0), Number(activeProduct.remainingQuantity ?? variant?.stock ?? 0)));
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
        document.dispatchEvent(new Event("cart:updated"));
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
variantChoices.addEventListener("click", event => {
    const choice = event.target.closest("[data-variant-index]");
    if (choice) {
        chooseVariant(Number(choice.dataset.variantIndex));
    }
});
productThumbnails.addEventListener("click", event => {
    const thumbnail = event.target.closest(".product-detail__thumbnail:not(:disabled)");
    if (!thumbnail) {
        return;
    }
    const index = Array.from(productThumbnails.children).indexOf(thumbnail);
    const image = document.createElement("img");
    image.src = activeProduct.images[index];
    image.alt = activeProduct.title;
    productMedia.replaceChildren(image);
    productThumbnails.querySelectorAll(".product-detail__thumbnail").forEach((item, itemIndex) => {
        const selected = itemIndex === index;
        item.classList.toggle("is-active", selected);
        item.setAttribute("aria-pressed", String(selected));
    });
});
detailDialog.querySelectorAll("[data-quantity-step]").forEach(button => {
    button.addEventListener("click", () => {
        const currentQuantity = Number(quantityInput.value) || 1;
        const step = Number(button.dataset.quantityStep);
        const maximum = Number(quantityInput.max) || 0;
        if (step > 0 && currentQuantity >= maximum) {
            showProductMessage(`此規格最多可購買 ${maximum} 件。`);
            return;
        }
        quantityInput.value = String(Math.max(1, Math.min(maximum, currentQuantity + step)));
        showProductMessage("");
        updateQuantityControls();
    });
});
quantityInput.addEventListener("input", () => {
    const maximum = Number(quantityInput.max) || 0;
    const quantity = Number(quantityInput.value);
    if (quantityInput.value === "") {
        showProductMessage("");
    } else if (!Number.isInteger(quantity) || quantity < 1) {
        quantityInput.value = String(Math.max(1, Math.floor(quantity) || 1));
        showProductMessage("請輸入至少 1 件的整數數量。");
    } else if (quantity > maximum) {
        quantityInput.value = String(maximum);
        showProductMessage(`此規格最多可購買 ${maximum} 件。`);
    } else {
        showProductMessage("");
    }
    updateQuantityControls();
});
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
