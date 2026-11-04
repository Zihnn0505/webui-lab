import { orders, formatOrderDate, orderStatuses } from "./order-data.js";

const detailRoot = document.querySelector("#order-detail-content");
const orderId = new URLSearchParams(window.location.search).get("id");
const order = orders.find(item => item.id === orderId);

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

function renderMissingOrder() {
    const message = createElement("section", "order-empty");
    message.append(
        createElement("h1", "page-title", "找不到這筆訂單"),
        createElement("p", "", "請從我的訂單列表選擇一筆訂單查看。")
    );
    const back = createElement("a", "btn", "返回我的訂單");
    back.href = "order.html";
    message.append(back);
    detailRoot.replaceChildren(message);
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
        content.append(createElement("time", "", eventTime ? formatOrderDate(eventTime) : "尚未完成"));
        if (eventTime) {
            content.lastElementChild.dateTime = eventTime;
        }
        row.append(content);
        timeline.append(row);
    });
    return timeline;
}

function renderOrderDetail() {
    const status = orderStatuses[order.status];
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
        ["收件人", order.recipient.name],
        ["聯絡電話", order.recipient.phone],
        ["收件地址", order.recipient.address]
    ].forEach(([label, value]) => {
        address.append(createElement("dt", "", label), createElement("dd", "", value));
    });
    shipping.append(address);

    if (order.shipment) {
        const tracking = createElement("p", "order-detail__tracking", `${order.shipment.carrier}・物流單號 ${order.shipment.trackingNumber}`);
        shipping.append(tracking);
    }
    if (order.status === "unpaid") {
        shipping.append(createElement("p", "order-detail__notice", `請於 ${formatOrderDate(order.paymentDue)} 前完成付款。付款功能尚未串接。`));
    } else if (order.status === "cancelled") {
        shipping.append(createElement("p", "order-detail__notice", `${order.cancelReason}，退款日期 ${formatOrderDate(order.refundedAt)}。`));
    }
    mainColumn.append(itemSection, shipping);

    const timelineSection = createElement("section", "order-detail__section order-detail__timeline-section");
    timelineSection.append(createElement("h2", "", "訂單狀態時間軸"), renderTimeline(order.timeline));
    layout.append(mainColumn, timelineSection);
    detailRoot.replaceChildren(header, layout);
}

if (order) {
    renderOrderDetail();
} else {
    renderMissingOrder();
}
