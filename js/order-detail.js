import { completeOrder, fetchOrders, getOrders, formatOrderDate, orderStatuses } from "./order-data.js";

const detailRoot = document.querySelector("#order-detail-content");
const orderId = new URLSearchParams(window.location.search).get("id");
let order;
let orderLoadError = "";

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

function renderOrderMessage(title, messageText) {
    const message = createElement("section", "order-empty");
    message.append(
        createElement("h1", "page-title", title),
        createElement("p", "", messageText)
    );
    const back = createElement("a", "btn", "返回我的訂單");
    back.href = "order.html";
    message.append(back);
    detailRoot.replaceChildren(message);
}

function renderMissingOrder() {
    renderOrderMessage("找不到這筆訂單", "請從我的訂單列表選擇一筆訂單查看。");
}

async function loadOrder(user) {
    if (!user?.id) {
        orderLoadError = "";
        renderMissingOrder();
        return;
    }

    try {
        const remoteOrders = await fetchOrders();
        order = remoteOrders.find(item => item.id === orderId)
            || getOrders(user.id).find(item => item.id === orderId);
        orderLoadError = "";
    } catch (error) {
        orderLoadError = error.message;
        try {
            order = getOrders(user.id).find(item => item.id === orderId);
        } catch (storageError) {
            renderOrderMessage("訂單無法載入", `${error.message} ${storageError.message}`);
            return;
        }
    }

    if (window.authState?.user?.id !== user.id) {
        return;
    }

    if (order) {
        renderOrderDetail();
        if (orderLoadError) {
            detailRoot.querySelector(".order-detail__main").append(
                createElement("p", "order-detail__notice", `無法同步最新訂單狀態：${orderLoadError}`)
            );
        }
    } else if (orderLoadError) {
        renderOrderMessage("訂單無法載入", orderLoadError);
    } else {
        renderMissingOrder();
    }
}

function renderItems(items) {
    const list = createElement("ul", "order-detail__items");
    items.forEach(item => {
        const row = createElement("li", "order-detail__item");
        const thumb = createElement("span", "order-item__thumb");
        thumb.style.setProperty("--tone", item.tone || "#e8e8e8");
        thumb.setAttribute("aria-hidden", "true");
        const info = createElement("span", "order-item__info");
        info.append(
            createElement("strong", "order-item__name", item.name),
            createElement("span", "order-item__spec", `${item.spec} × ${item.quantity}`)
        );
        if (item.shippedAt) {
            info.append(createElement("span", "order-item__spec", `已出貨 ${formatOrderDate(item.shippedAt)}`));
        }
        row.append(thumb, info, createElement("strong", "order-item__price", `$${Number(item.price).toLocaleString("zh-TW")}`));
        list.append(row);
    });
    return list;
}

function renderTimeline(events) {
    const timeline = createElement("ol", "order-timeline");
    events.forEach(event => {
        const row = createElement("li", `order-timeline__step${event.complete ? " is-complete" : ""}`);
        row.append(createElement("span", "order-timeline__marker"));
        const content = createElement("div", "order-timeline__content");
        content.append(createElement("strong", "", event.label));
        const eventTime = event.complete && event.at ? event.at : "";
        content.append(createElement("time", "", eventTime
            ? formatOrderDate(eventTime)
            : event.complete ? "已完成" : "尚未完成"));
        if (eventTime) {
            content.lastElementChild.dateTime = eventTime;
        }
        row.append(content);
        timeline.append(row);
    });
    return timeline;
}

function renderOrderDetail() {
    const status = orderStatuses[order.status] || { label: "處理中", badge: "waiting" };
    const header = createElement("header", "order-detail__header");
    const titleBlock = createElement("div");
    titleBlock.append(
        createElement("h1", "page-title", "訂單詳情"),
        createElement("p", "order-detail__number", `訂單編號 #${order.id}・下單時間 ${formatOrderDate(order.createdAt)}`)
    );
    header.append(titleBlock, createElement("span", `order-badge order-badge--${status.badge}`, status.label));

    const layout = createElement("div", "order-detail__layout");
    const mainColumn = createElement("div", "order-detail__main");
    const itemSection = createElement("section", "order-detail__section");
    itemSection.append(createElement("h2", "", "商品明細"), renderItems(order.items));
    const total = createElement("p", "order-detail__total");
    total.append(createElement("span", "", "訂單總計"), createElement("strong", "", `$${Number(order.total).toLocaleString("zh-TW")}`));
    itemSection.append(total);

    const shipping = createElement("section", "order-detail__section");
    shipping.append(createElement("h2", "", "收件資訊"));
    const address = createElement("dl", "order-detail__shipping");
    [
        ["購買人", order.recipient.buyerName],
        ["收件人", order.recipient.name],
        ["Email", order.recipient.email],
        ["聯絡電話", order.recipient.phone],
        ["付款方式", order.paymentMethod],
        ["取貨方式", order.recipient.method],
        ["收件地址", order.recipient.address]
    ].filter(([, value]) => value).forEach(([label, value]) => {
        address.append(createElement("dt", "", label), createElement("dd", "", value));
    });
    shipping.append(address);

    if (order.shipment?.shippedAt) {
        const tracking = createElement("p", "order-detail__tracking", `訂單商品已於 ${formatOrderDate(order.shipment.shippedAt)} 全數出貨。`);
        shipping.append(tracking);
    }
    if (order.status === "waiting") {
        shipping.append(createElement("p", "order-detail__notice", "付款已完成，團購尚未達標；達標後賣家就會開始準備出貨。這是示範付款，不會實際扣款。"));
    } else if (order.status === "preparing") {
        shipping.append(createElement("p", "order-detail__notice", "團購已達標，訂單目前等待賣家出貨；這是示範付款，不會實際扣款。"));
    } else if (order.status === "shipped") {
        const confirmButton = createElement("button", "btn", "確認收貨");
        confirmButton.type = "button";
        confirmButton.addEventListener("click", async () => {
            confirmButton.disabled = true;
            try {
                order = await completeOrder(order.id);
                document.dispatchEvent(new Event("orders:updated"));
                renderOrderDetail();
            } catch (error) {
                confirmButton.disabled = false;
                shipping.append(createElement("p", "order-detail__notice", error.message));
            }
        });
        shipping.append(confirmButton);
    } else if (order.status === "cancelled") {
        shipping.append(createElement("p", "order-detail__notice", `${order.cancelReason}，退款日期 ${formatOrderDate(order.refundedAt)}。`));
    }
    mainColumn.append(itemSection, shipping);

    const timelineSection = createElement("section", "order-detail__section order-detail__timeline-section");
    timelineSection.append(createElement("h2", "", "訂單狀態時間軸"), renderTimeline(order.timeline));
    layout.append(mainColumn, timelineSection);
    detailRoot.replaceChildren(header, layout);
}

document.addEventListener("auth:user-changed", event => loadOrder(event.detail.user));
document.addEventListener("orders:updated", () => loadOrder(window.authState?.user));
document.addEventListener("group-buy-progress:updated", () => loadOrder(window.authState?.user));
window.addEventListener("focus", () => {
    if (window.authState?.ready && window.authState.user) {
        loadOrder(window.authState.user);
    }
});

document.addEventListener("auth:load-failed", event => {
    renderOrderMessage("無法確認登入狀態", event.detail.error);
});

if (window.authState?.ready) {
    if (window.authState.error) {
        renderOrderMessage("無法確認登入狀態", window.authState.error);
    } else {
        loadOrder(window.authState.user);
    }
}
