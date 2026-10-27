const createGroupButton = document.querySelector("#create-group-button");
const groupList = document.querySelector("#seller-group-list");
const groupCount = document.querySelector("#groups-title")?.parentElement.querySelector(".seller-section__sub strong");
const groupStatus = document.querySelector("#seller-group-status");
const groupFilterButtons = document.querySelectorAll(".seller-section [data-filter]");
const statusLabels = {
    open: ["募集中", "seller-badge--open"],
    soon: ["即將截止", "seller-badge--soon"],
    done: ["已成團", "seller-badge--done"],
    full: ["已額滿", "seller-badge--full"],
    ended: ["未成團", "seller-badge--ended"]
};

function showGroupStatus(message, isError = false) {
    if (!groupStatus) {
        return;
    }
    groupStatus.textContent = message;
    groupStatus.hidden = message.length === 0;
    groupStatus.classList.toggle("group-form__message", isError);
}

async function readGroupBuyResponse(response) {
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(result.error || `團購請求失敗（${response.status}）。`);
    }
    return result;
}

function createCell(label, className = "") {
    const cell = document.createElement("td");
    cell.setAttribute("role", "cell");
    if (label) {
        cell.dataset.label = label;
    }
    if (className) {
        cell.className = className;
    }
    return cell;
}

function renderGroupBuy(groupBuy) {
    const row = document.createElement("tr");
    row.setAttribute("role", "row");
    row.dataset.groupBuyId = groupBuy.id;
    row.dataset.status = groupBuy.status;
    row.dataset.min = String(groupBuy.minimumQuantity);
    row.dataset.stock = String(groupBuy.inventory);
    row.dataset.paid = String(groupBuy.paidQuantity);
    row.dataset.held = String(groupBuy.reservedQuantity);

    const productCell = createCell("", "seller-cell--lead");
    const product = document.createElement("div");
    product.className = "seller-product";
    const thumbnail = document.createElement("div");
    thumbnail.className = "seller-thumb";
    const image = document.createElement("img");
    image.src = groupBuy.images[0];
    image.alt = "";
    image.loading = "lazy";
    thumbnail.append(image);
    const productText = document.createElement("div");
    productText.className = "seller-product__text";
    const name = document.createElement("a");
    name.className = "seller-product__name";
    name.href = "#";
    name.textContent = groupBuy.title;
    const meta = document.createElement("span");
    meta.className = "seller-product__meta";
    meta.textContent = `$${Number(groupBuy.variants[0].price).toLocaleString("zh-TW")}・${groupBuy.variants.length} 種規格`;
    productText.append(name, meta);
    product.append(thumbnail, productText);
    productCell.append(product);
    row.append(productCell);

    const progressCell = createCell("成團進度");
    const progressBody = document.createElement("div");
    progressBody.className = "seller-cell__body";
    const progress = document.createElement("div");
    const progressPercent = Math.min(100, Math.floor(groupBuy.paidQuantity / groupBuy.minimumQuantity * 100));
    progress.className = "progress";
    progress.style.setProperty("--value", String(progressPercent));
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-label", "成團進度");
    progress.setAttribute("aria-valuenow", String(progressPercent));
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "100");
    const progressText = document.createElement("span");
    progressText.className = "seller-cell__sub";
    progressText.textContent = `已付款 ${groupBuy.paidQuantity}／最低 ${groupBuy.minimumQuantity}`;
    progressBody.append(progress, progressText);
    progressCell.append(progressBody);
    row.append(progressCell);

    const remainingCell = createCell("剩餘名額");
    const remainingBody = document.createElement("div");
    remainingBody.className = "seller-cell__body";
    const remaining = document.createElement("span");
    remaining.className = "seller-cell__main";
    remaining.textContent = `${groupBuy.remainingQuantity} 件`;
    const stockText = document.createElement("span");
    stockText.className = "seller-cell__sub";
    stockText.textContent = `庫存 ${groupBuy.inventory}・預扣 ${groupBuy.reservedQuantity}`;
    remainingBody.append(remaining, stockText);
    remainingCell.append(remainingBody);
    row.append(remainingCell);

    const deadlineCell = createCell("截止時間");
    const deadlineBody = document.createElement("div");
    deadlineBody.className = "seller-cell__body";
    const deadline = document.createElement("time");
    deadline.dateTime = groupBuy.deadline;
    deadline.textContent = new Date(groupBuy.deadline).toLocaleString("zh-TW", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
    deadlineBody.append(deadline);
    deadlineCell.append(deadlineBody);
    row.append(deadlineCell);

    const stateCell = createCell("狀態");
    const stateBody = document.createElement("div");
    stateBody.className = "seller-cell__body";
    const [stateLabel, stateClass] = statusLabels[groupBuy.status] ?? statusLabels.open;
    const state = document.createElement("span");
    state.className = `seller-badge ${stateClass}`;
    state.textContent = stateLabel;
    stateBody.append(state);
    stateCell.append(stateBody);
    row.append(stateCell);

    const actionsCell = createCell("");
    const actions = document.createElement("div");
    actions.className = "seller-actions";
    const groupNumber = document.createElement("span");
    groupNumber.className = "seller-action";
    groupNumber.textContent = groupBuy.groupNumber;
    const editButton = document.createElement("button");
    editButton.className = "seller-action";
    editButton.type = "button";
    editButton.textContent = "編輯";
    editButton.addEventListener("click", () => openCreateGroupModal(groupBuy));
    actions.append(groupNumber, editButton);
    actionsCell.append(actions);
    row.append(actionsCell);
    return row;
}

function updateGroupFilters() {
    const activeFilter = document.querySelector(".seller-section [data-filter].is-active")?.dataset.filter ?? "all";
    groupList?.querySelectorAll("tr[data-status]").forEach(row => {
        row.hidden = activeFilter !== "all" && row.dataset.status !== activeFilter;
    });
}

function updateGroupBuyList(groupBuy, announce = true) {
    if (!groupList) {
        return;
    }
    const existingRow = Array.from(groupList.querySelectorAll("tr[data-group-buy-id]"))
        .find(row => row.dataset.groupBuyId === groupBuy.id);
    if (existingRow) {
        existingRow.replaceWith(renderGroupBuy(groupBuy));
        if (announce) {
            showGroupStatus(`已更新團購 ${groupBuy.groupNumber}。`);
        }
        updateGroupFilters();
        return;
    }
    groupList.prepend(renderGroupBuy(groupBuy));
    updateGroupCount();
    updateGroupFilters();
    if (announce) {
        showGroupStatus(`已建立團購 ${groupBuy.groupNumber}。`);
    }
}

function updateGroupCount() {
    if (!groupCount || !groupList) {
        return;
    }
    const staticCount = groupList.querySelectorAll("tr:not([data-group-buy-id])").length;
    const createdCount = groupList.querySelectorAll("tr[data-group-buy-id]").length;
    groupCount.textContent = String(staticCount + createdCount);
}

function formatLocalDateTime(date) {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
}

function createVariantRow() {
    const row = document.createElement("div");
    row.className = "group-form__variant";
    row.innerHTML = `
        <label class="group-form__field">
            <span class="group-form__label-text">規格名稱 <span class="group-form__required" aria-hidden="true">*</span></span>
            <input name="variantName" type="text" maxlength="50" required>
        </label>
        <label class="group-form__field">
            <span class="group-form__label-text">庫存數量 <span class="group-form__required" aria-hidden="true">*</span></span>
            <input name="variantStock" type="number" min="1" step="1" required>
        </label>
        <button class="group-form__button group-form__remove-variant" type="button" aria-label="移除此規格">移除</button>
    `;
    return row;
}

function getCreateGroupFormMarkup() {
    return `
        <form class="group-form" id="create-group-form">
            <div class="group-form__grid">
                <label class="group-form__field">
                    <span class="group-form__label-text">商品名稱 <span class="group-form__required" aria-hidden="true">*</span></span>
                    <input name="title" type="text" maxlength="100" required>
                </label>
                <label class="group-form__field">
                    <span class="group-form__label-text">商品分類 <span class="group-form__required" aria-hidden="true">*</span></span>
                    <select name="category" required>
                        <option value="">請選擇分類</option>
                        <option>食品飲料</option>
                        <option>生活用品</option>
                        <option>服飾配件</option>
                        <option>3C家電</option>
                        <option>其他</option>
                    </select>
                </label>
                <label class="group-form__field">
                    <span class="group-form__label-text">單價（每種規格相同） <span class="group-form__required" aria-hidden="true">*</span></span>
                    <input name="price" type="number" min="0.01" max="100000000" step="0.01" required>
                </label>
                <label class="group-form__field">
                    <span class="group-form__label-text">成團最低數量 <span class="group-form__required" aria-hidden="true">*</span></span>
                    <input name="minimumQuantity" type="number" min="1" step="1" required>
                </label>
                <label class="group-form__field">
                    <span class="group-form__label-text">截止日期時間 <span class="group-form__required" aria-hidden="true">*</span></span>
                    <input name="deadline" type="datetime-local" required>
                </label>
                <label class="group-form__field group-form__field--full group-form__field--image">
                    <span class="group-form__label-text">商品圖片（可上傳或輸入圖片連結） <span class="group-form__required" aria-hidden="true">*</span></span>
                    <input name="imageFiles" type="file" accept="image/jpeg,image/png,image/webp" multiple>
                    <span class="group-form__hint">限 JPG、PNG、WebP，每張 5 MB，最多 5 張。可同時提供圖片連結。</span>
                    <textarea name="imageUrls" rows="2" placeholder="每行一個圖片連結（HTTP 或 HTTPS）"></textarea>
                    <span class="group-form__image-list" id="group-image-list"></span>
                </label>
                <label class="group-form__field group-form__field--full group-form__field--description">
                    <span class="group-form__label-text">商品描述（選填）</span>
                    <textarea name="description" maxlength="2000" rows="3"></textarea>
                </label>
                <label class="group-form__field">
                    <span class="group-form__label-text">預計出貨日期（選填）</span>
                    <input name="estimatedShipDate" type="date">
                </label>
                <label class="group-form__field">
                    <span class="group-form__label-text">限購數量（選填）</span>
                    <input name="limitPerBuyer" type="number" min="1" step="1">
                </label>
                <label class="group-form__field">
                    <span class="group-form__label-text">配送方式（選填）</span>
                    <select name="shippingMethod">
                        <option value="">尚未設定</option>
                        <option value="home-delivery">宅配</option>
                        <option value="convenience-store">超商取貨</option>
                        <option value="pickup">面交自取</option>
                    </select>
                </label>
                <label class="group-form__field">
                    <span class="group-form__label-text">運費（選填）</span>
                    <input name="shippingFee" type="number" min="0" max="100000000" step="1">
                </label>
            </div>
            <fieldset class="group-form__variants">
                <legend>商品規格 <span class="group-form__required" aria-hidden="true">*</span></legend>
                <div class="group-form__variant-list"></div>
                <button class="group-form__button" id="add-group-variant" type="button">＋ 新增規格</button>
                <p class="group-form__hint" id="group-stock-total" aria-live="polite">庫存合計：0</p>
            </fieldset>
            <p class="group-form__hint">團購編號、賣家 ID、建立時間、付款／預扣數量、剩餘名額與團購狀態會由系統自動管理。</p>
            <p class="group-form__message" id="create-group-message" role="status" aria-live="polite" hidden></p>
            <div class="group-form__actions">
                <button class="btn" type="submit">建立並發布</button>
            </div>
        </form>
    `;
}

function setupGroupForm(groupBuy = null) {
    const form = document.querySelector("#create-group-form");
    if (!form) {
        return;
    }

    const variantList = form.querySelector(".group-form__variant-list");
    const addVariantButton = form.querySelector("#add-group-variant");
    const totalStockText = form.querySelector("#group-stock-total");
    const imageFiles = form.elements.namedItem("imageFiles");
    const imageList = form.querySelector("#group-image-list");
    const message = form.querySelector("#create-group-message");
    const submitButton = form.querySelector('[type="submit"]');

    function updateStockTotal() {
        const stocks = Array.from(form.querySelectorAll('[name="variantStock"]'), input => Number(input.value) || 0);
        const total = stocks.reduce((sum, stock) => sum + stock, 0);
        totalStockText.textContent = `庫存合計：${total}`;
        form.elements.namedItem("minimumQuantity").max = String(total);
    }

    function updateVariantControls() {
        const rows = variantList.querySelectorAll(".group-form__variant");
        rows.forEach(row => {
            row.querySelector(".group-form__remove-variant").disabled = rows.length === 1;
        });
        addVariantButton.disabled = rows.length >= 20;
        updateStockTotal();
    }

    function addVariant() {
        if (variantList.children.length >= 20) {
            return;
        }
        const row = createVariantRow();
        row.querySelector(".group-form__remove-variant").addEventListener("click", () => {
            row.remove();
            updateVariantControls();
        });
        row.querySelector('[name="variantStock"]').addEventListener("input", updateStockTotal);
        variantList.append(row);
        updateVariantControls();
    }

    addVariantButton.addEventListener("click", addVariant);
    if (groupBuy) {
        variantList.replaceChildren();
        groupBuy.variants.forEach(variant => {
            addVariant();
            const row = variantList.lastElementChild;
            row.querySelector('[name="variantName"]').value = variant.name;
            row.querySelector('[name="variantStock"]').value = String(variant.stock);
        });
    } else {
        addVariant();
    }
    if (groupBuy) {
        form.elements.namedItem("title").value = groupBuy.title;
        form.elements.namedItem("category").value = groupBuy.category;
        form.elements.namedItem("price").value = String(groupBuy.variants[0].price);
        form.elements.namedItem("minimumQuantity").value = String(groupBuy.minimumQuantity);
        form.elements.namedItem("deadline").value = formatLocalDateTime(new Date(groupBuy.deadline));
        form.elements.namedItem("imageUrls").value = groupBuy.images.join("\n");
        form.elements.namedItem("description").value = groupBuy.description;
        form.elements.namedItem("estimatedShipDate").value = groupBuy.estimatedShipDate ?? "";
        form.elements.namedItem("limitPerBuyer").value = groupBuy.limitPerBuyer ?? "";
        form.elements.namedItem("shippingMethod").value = groupBuy.shippingMethod ?? "";
        form.elements.namedItem("shippingFee").value = groupBuy.shippingFee ?? "";
        imageList.textContent = `${groupBuy.images.length} 張已發布圖片`;
        form.dataset.groupId = groupBuy.id;
        const orderExists = groupBuy.paidQuantity > 0 || groupBuy.reservedQuantity > 0;
        if (orderExists) {
            ["title", "category", "price", "minimumQuantity", "limitPerBuyer", "shippingMethod", "shippingFee"]
                .forEach(name => { form.elements.namedItem(name).disabled = true; });
            form.querySelectorAll('[name="variantName"]').forEach(input => { input.disabled = true; });
            form.querySelectorAll(".group-form__remove-variant").forEach(button => { button.disabled = true; });
            addVariantButton.disabled = true;
            groupBuy.variants.forEach((variant, index) => {
                form.querySelectorAll('[name="variantStock"]')[index].min = String(variant.stock);
            });
        }
    }

    imageFiles.addEventListener("change", () => {
        const files = Array.from(imageFiles.files);
        imageList.textContent = files.map(file => file.name).join("、");
        if (files.length > 5) {
            message.textContent = "圖片最多 5 張。";
            message.hidden = false;
        } else if (files.some(file => file.size > 5 * 1024 * 1024)) {
            message.textContent = "每張圖片大小不可超過 5 MB。";
            message.hidden = false;
        } else {
            message.textContent = "";
            message.hidden = true;
        }
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();
        message.hidden = true;
        message.textContent = "";

        const files = Array.from(imageFiles.files);
        const imageUrls = form.elements.namedItem("imageUrls").value
            .split(/\r?\n/)
            .map(url => url.trim())
            .filter(Boolean);
        if (files.length + imageUrls.length < 1 || files.length + imageUrls.length > 5) {
            message.textContent = "商品圖片至少 1 張，且上傳圖片與圖片連結合計最多 5 張。";
            message.hidden = false;
            return;
        }
        if (files.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
            message.textContent = "圖片格式僅支援 JPG、PNG 或 WebP。";
            message.hidden = false;
            return;
        }
        if (files.some(file => file.size > 5 * 1024 * 1024)) {
            message.textContent = "每張圖片大小不可超過 5 MB。";
            message.hidden = false;
            return;
        }
        const variantNames = Array.from(form.querySelectorAll('[name="variantName"]'), input => input.value.trim().toLocaleLowerCase("zh-Hant-TW"));
        if (new Set(variantNames).size !== variantNames.length) {
            message.textContent = "同一個商品的規格名稱不能重複。";
            message.hidden = false;
            return;
        }
        if (!form.reportValidity()) {
            return;
        }

        const variants = Array.from(variantList.children, row => ({
            name: row.querySelector('[name="variantName"]').value.trim(),
            stock: Number(row.querySelector('[name="variantStock"]').value),
            price: Number(form.elements.namedItem("price").value)
        }));
        const inventory = variants.reduce((total, variant) => total + variant.stock, 0);
        if (Number(form.elements.namedItem("minimumQuantity").value) > inventory) {
            message.textContent = "成團最低數量不能大於庫存合計。";
            message.hidden = false;
            return;
        }
        if (new Date(form.elements.namedItem("deadline").value).getTime() <= Date.now()) {
            message.textContent = "截止時間必須晚於現在。";
            message.hidden = false;
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "正在發布…";
        const groupId = form.dataset.groupId;
        try {
            const uploadedImages = [];
            for (const file of files) {
                const response = await fetch("api/group-buys/images", {
                    method: "POST",
                    headers: { "Content-Type": file.type },
                    body: file
                });
                const result = await readGroupBuyResponse(response);
                uploadedImages.push(result.image.url);
            }

            const response = await fetch(groupId ? `api/group-buys/${groupId}` : "api/group-buys", {
                method: groupId ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: form.elements.namedItem("title").value,
                    category: form.elements.namedItem("category").value,
                    description: form.elements.namedItem("description").value,
                    images: [...uploadedImages, ...imageUrls],
                    variants,
                    minimumQuantity: form.elements.namedItem("minimumQuantity").value,
                    deadline: new Date(form.elements.namedItem("deadline").value).toISOString(),
                    estimatedShipDate: form.elements.namedItem("estimatedShipDate").value,
                    limitPerBuyer: form.elements.namedItem("limitPerBuyer").value,
                    shippingFee: form.elements.namedItem("shippingFee").value,
                    shippingMethod: form.elements.namedItem("shippingMethod").value
                })
            });
            const result = await readGroupBuyResponse(response);
            updateGroupBuyList(result.groupBuy);
            if (!groupId) {
                await loadGroupBuys();
                showGroupStatus(`已建立團購 ${result.groupBuy.groupNumber}。`);
            }
            document.querySelector("#setting-modal").hidden = true;
            document.querySelector(".setting-modal__content").classList.remove("setting-modal__content--wide");
        } catch (error) {
            message.textContent = error.message;
            message.hidden = false;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = form.dataset.groupId ? "儲存變更" : "建立並發布";
        }
    });
}

function openCreateGroupModal(groupBuy = null) {
    const modal = document.querySelector("#setting-modal");
    const modalContent = modal?.querySelector(".setting-modal__content");
    const modalTitle = document.querySelector("#setting-modal-title");
    const modalBody = document.querySelector("#setting-modal-body");
    if (!modal || !modalContent || !modalTitle || !modalBody) {
        showGroupStatus("建立團購視窗載入失敗，請重新整理頁面。", true);
        return;
    }

    modalTitle.textContent = groupBuy ? "編輯團購" : "建立新團購";
    modalBody.innerHTML = getCreateGroupFormMarkup();
    modalContent.classList.add("setting-modal__content--wide");
    modal.hidden = false;
    setupGroupForm(groupBuy);
    const deadlineInput = modalBody.querySelector('[name="deadline"]');
    const minimumTimestamp = groupBuy ? Math.max(Date.now(), new Date(groupBuy.deadline).getTime()) : Date.now();
    const minimumDeadline = new Date(Math.ceil(minimumTimestamp / 60000) * 60000);
    deadlineInput.min = formatLocalDateTime(minimumDeadline);
    modalBody.querySelector('[type="submit"]').textContent = groupBuy ? "儲存變更" : "建立並發布";
    modalBody.querySelector('[name="title"]').focus();
}

async function loadGroupBuys() {
    showGroupStatus("");
    try {
        const result = await readGroupBuyResponse(await fetch("api/group-buys/mine", { cache: "no-store" }));
        const groupBuys = Array.isArray(result.groupBuys) ? result.groupBuys : [];
        const groupBuyIds = new Set(groupBuys.map(groupBuy => groupBuy.id));
        groupList?.querySelectorAll("tr[data-group-buy-id]").forEach(row => {
            if (!groupBuyIds.has(row.dataset.groupBuyId)) {
                row.remove();
            }
        });
        groupBuys.forEach(groupBuy => updateGroupBuyList(groupBuy, false));
        updateGroupCount();
    } catch (error) {
        showGroupStatus(error.message, true);
    }
}

function initializeSellerPage() {
    if (!createGroupButton || createGroupButton.dataset.initialized) {
        return;
    }
    createGroupButton.dataset.initialized = "true";
    createGroupButton.addEventListener("click", () => openCreateGroupModal());

    groupFilterButtons.forEach(button => {
        button.addEventListener("click", () => {
            groupFilterButtons.forEach(filterButton => {
                const isActive = filterButton === button;
                filterButton.classList.toggle("is-active", isActive);
                filterButton.setAttribute("aria-pressed", String(isActive));
            });
            updateGroupFilters();
        });
    });

    loadGroupBuys();
}

document.addEventListener("aside:ready", initializeSellerPage);
document.addEventListener("auth:user-changed", event => {
    if (createGroupButton && !event.detail.user) {
        groupList?.querySelectorAll("tr[data-group-buy-id]").forEach(row => row.remove());
        updateGroupCount();
        return;
    }
    if (createGroupButton && event.detail.user) {
        loadGroupBuys();
    }
});
if (document.querySelector("#setting-modal")) {
    initializeSellerPage();
}
