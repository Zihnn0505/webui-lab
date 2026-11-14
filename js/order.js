import { fetchOrders, getOrders, formatOrderDate, orderStatuses } from "./order-data.js";
import { getGroupBuyProgress } from "./group-buy-progress.js";

const orderList = document.querySelector("#order-list");
const endedOrderList = document.querySelector("#ended-order-list");
const endedOrders = document.querySelector("#ended-orders");
const endedCount = document.querySelector(".order-ended__count");
const totalCount = document.querySelector("[data-order-total]");
const filterButtons = Array.from(document.querySelectorAll("[data-filter]"));
const reminder = document.querySelector(".order-reminder");
const reminderText = document.querySelector(".order-reminder__text");
const loadStatus = document.querySelector("#order-load-status");
const emptyState = document.querySelector(".order-empty");
const loadMoreButton = document.querySelector(".order-load-more");
const pageSize = 10;

let orders = [];
let ordersLoadError = "";
let activeFilter = "all";
let visibleCount = pageSize;

function showLoadStatus(message) {
    loadStatus.textContent = message;
    loadStatus.hidden = message.length === 0;
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) {
        element.className = className;
    }
    if (text !== undefined) {
        element.textContent = text;
    }
    return element;
}

function detailUrl(order) {
    return `order-detail.html?id=${encodeURIComponent(order.id)}`;
}

function orderNeedsAction(order) {
    return order.status === "shipped";
}

function renderOrderItem(item, status) {
    const row = createElement("li", "order-item");
    const thumb = createElement("span", "order-item__thumb");
    thumb.style.setProperty("--tone", item.tone || "#e8e8e8");
    thumb.setAttribute("aria-hidden", "true");
    const info = createElement("span", "order-item__info");
    info.append(
        createElement("span", "order-item__name", item.name),
        createElement("span", "order-item__spec", `${item.spec} × ${item.quantity}`)
    );
    if (status) {
        info.append(createElement("span", `order-badge order-badge--${status.badge} order-item__status`, status.label));
    }
    row.append(thumb, info, createElement("strong", "order-item__price", `$${Number(item.price).toLocaleString("zh-TW")}`));
    return row;
}

function getStatusLine(order) {
    if (order.status === "waiting") {
        const progress = getGroupBuyProgress(order.groupBuy.paid, order.groupBuy.minimum);
        return {
            progress: progress.percentage,
            text: `${progress.summary} 件・${formatOrderDate(order.groupBuy.deadline)} 截止`
        };
    }
    if (order.status === "preparing") {
        return { text: `賣家準備中・${order.estimatedShipping || "等待賣家出貨"}` };
    }
    if (order.status === "shipped") {
        return { text: `賣家已於 ${formatOrderDate(order.shipment?.shippedAt)} 出貨` };
    }
    if (order.status === "done") {
        return { text: `${formatOrderDate(order.completedAt).slice(0, 10)} 完成` };
    }
    return { text: `${order.cancelReason}・${formatOrderDate(order.refundedAt).slice(0, 10)} 已退款` };
}

function renderOrderCard(order) {
    const status = orderStatuses[order.status];
    const card = createElement("li", `order-card${order.status === "cancelled" ? " order-card--muted" : ""}`);
    card.dataset.status = order.status;
    card.dataset.orderId = order.id;

    const head = createElement("header", "order-card__head");
    const id = createElement("p", "order-card__id");
    id.append(
        createElement("span", "order-card__no", `訂單編號 #${order.id}`),
        createElement("time", "", formatOrderDate(order.createdAt))
    );
    id.lastElementChild.dateTime = order.createdAt;
    head.append(id, createElement("span", `order-badge order-badge--${status.badge}`, status.label));

    const items = createElement("ul", "order-items");
    order.items.slice(0, 2).forEach((item, index) => items.append(renderOrderItem(item, index === 0 ? status : null)));
    if (order.items.length > 2) {
        items.append(createElement("li", "order-item__more", `另外 ${order.items.length - 2} 項商品`));
    }

    const statusLine = getStatusLine(order);
    const statusRow = createElement("div", `order-card__status-line${statusLine.urgent ? " is-urgent" : ""}`);
    if (statusLine.progress !== undefined) {
        const progress = createElement("div", "order-card__progress");
        progress.setAttribute("role", "progressbar");
        progress.setAttribute("aria-label", "成團進度");
        progress.setAttribute("aria-valuenow", String(statusLine.progress));
        progress.setAttribute("aria-valuemin", "0");
        progress.setAttribute("aria-valuemax", "100");
        progress.style.setProperty("--value", String(statusLine.progress));
        statusRow.append(progress);
    }
    statusRow.append(createElement("p", "", statusLine.text));

    const foot = createElement("footer", "order-card__foot");
    foot.append(createElement("p", "order-card__total", `總計 $${Number(order.total).toLocaleString("zh-TW")}`));
    const actions = createElement("div", "order-actions");
    const primaryLabels = {
        waiting: "查看團購",
        shipped: "確認收貨",
        done: "填寫評價"
    };
    if (primaryLabels[order.status]) {
        const primary = createElement("a", "order-action order-action--primary", primaryLabels[order.status]);
        primary.href = detailUrl(order);
        actions.append(primary);
    }
    const more = createElement("a", "order-action order-action--more", "⋯");
    more.href = detailUrl(order);
    more.setAttribute("aria-label", `查看訂單 ${order.id} 詳情`);
    more.title = "查看詳情";
    actions.append(more);
    foot.append(actions);

    card.append(head, items, statusRow, foot);
    return card;
}

function sortedOrders(orders) {
    return [...orders].sort((left, right) => {
        const actionOrder = Number(orderNeedsAction(right)) - Number(orderNeedsAction(left));
        return actionOrder || new Date(right.createdAt) - new Date(left.createdAt);
    });
}

function setActiveFilter(filter) {
    activeFilter = filter;
    visibleCount = pageSize;
    filterButtons.forEach(button => {
        const selected = button.dataset.filter === filter;
        button.classList.toggle("is-active", selected);
        button.setAttribute("aria-pressed", String(selected));
    });
    reminder.setAttribute("aria-pressed", String(filter === "actionable"));
    renderOrders();
}

function renderOrders() {
    const counts = Object.fromEntries(Object.keys(orderStatuses).map(status => [
        status,
        orders.filter(order => order.status === status).length
    ]));
    const actionableCount = orders.filter(orderNeedsAction).length;
    totalCount.textContent = String(orders.length);
    reminder.hidden = actionableCount === 0;
    reminderText.textContent = `${actionableCount} 筆訂單需要你處理`;
    filterButtons.forEach(button => {
        const filter = button.dataset.filter;
        const count = filter === "all" ? orders.length : counts[filter];
        button.querySelector("[data-filter-count]").textContent = String(count);
        button.classList.toggle("is-empty", count === 0);
    });

    const filteredOrders = activeFilter === "all"
        ? orders.filter(order => order.status !== "cancelled")
        : activeFilter === "actionable"
            ? orders.filter(orderNeedsAction)
            : orders.filter(order => order.status === activeFilter);
    const cancelledMatches = activeFilter === "cancelled"
        ? sortedOrders(filteredOrders)
        : sortedOrders(orders.filter(order => order.status === "cancelled"));
    const cancelledOrders = activeFilter === "cancelled"
        ? cancelledMatches.slice(0, visibleCount)
        : cancelledMatches;
    const visibleOrders = sortedOrders(filteredOrders).slice(0, visibleCount);

    orderList.replaceChildren(...visibleOrders.map(renderOrderCard));
    endedOrderList.replaceChildren(...cancelledOrders.map(renderOrderCard));
    endedOrders.hidden = cancelledOrders.length === 0;
    endedCount.textContent = `（${cancelledOrders.length}）`;
    endedOrders.open = activeFilter === "cancelled";

    const hasResults = visibleOrders.length > 0 || cancelledOrders.length > 0;
    emptyState.hidden = hasResults;
    if (!hasResults) {
        const emptyMessages = {
            all: "目前還沒有訂單。",
            actionable: "目前沒有需要處理的訂單。",
            waiting: "目前沒有待成團的訂單。",
            preparing: "目前沒有準備出貨的訂單。",
            shipped: "目前沒有已出貨的訂單。",
            done: "目前沒有已完成的訂單。",
            cancelled: "目前沒有已取消或已退款的訂單。"
        };
        emptyState.querySelector("p").textContent = ordersLoadError
            || emptyMessages[activeFilter]
            || "目前沒有符合條件的訂單。";
    }
    loadMoreButton.hidden = activeFilter === "cancelled"
        ? cancelledMatches.length <= visibleCount
        : filteredOrders.length <= visibleCount;
}

async function loadUserOrders(user) {
    const userId = user?.id;
    if (!userId) {
        orders = [];
        ordersLoadError = "";
        showLoadStatus("");
        renderOrders();
        return;
    }

    try {
        const remoteOrders = await fetchOrders();
        orders = remoteOrders;
        try {
            const remoteOrderIds = new Set(remoteOrders.map(order => order.id));
            const legacyOrders = getOrders(userId).filter(order =>
                !["demo", "unpaid"].includes(order.status) && !remoteOrderIds.has(order.id));
            orders.push(...legacyOrders);
            ordersLoadError = "";
            showLoadStatus("");
        } catch (storageError) {
            ordersLoadError = `無法讀取本機舊訂單：${storageError.message}`;
            showLoadStatus(ordersLoadError);
        }
    } catch (error) {
        let storageError;
        try {
            orders = getOrders(userId).filter(order => !["demo", "unpaid"].includes(order.status));
        } catch (localError) {
            orders = [];
            storageError = localError;
        }
        ordersLoadError = storageError
            ? `${error.message} 本機舊訂單也無法讀取：${storageError.message}`
            : error.message;
        showLoadStatus(`無法同步伺服器訂單：${ordersLoadError}`);
    }
    if (window.authState?.user?.id !== userId) {
        return;
    }
    renderOrders();
}

document.addEventListener("auth:user-changed", event => loadUserOrders(event.detail.user));
document.addEventListener("auth:load-failed", event => {
    orders = [];
    ordersLoadError = `無法確認登入狀態：${event.detail.error}`;
    showLoadStatus(ordersLoadError);
    renderOrders();
});

if (window.authState?.ready) {
    loadUserOrders(window.authState.user);
}

filterButtons.forEach(button => {
    button.addEventListener("click", () => setActiveFilter(button.dataset.filter));
});

reminder.addEventListener("click", () => {
    setActiveFilter(activeFilter === "actionable" ? "all" : "actionable");
});

loadMoreButton.addEventListener("click", () => {
    visibleCount += pageSize;
    renderOrders();
});

document.addEventListener("orders:updated", () => loadUserOrders(window.authState?.user));
document.addEventListener("group-buy-progress:updated", () => loadUserOrders(window.authState?.user));
window.addEventListener("focus", () => {
    if (window.authState?.ready && window.authState.user) {
        loadUserOrders(window.authState.user);
    }
});

renderOrders();
