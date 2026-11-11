export const orderStatuses = {
    demo: { label: "已建立（未付款）", badge: "waiting" },
    unpaid: { label: "待付款", badge: "unpaid" },
    waiting: { label: "待成團", badge: "waiting" },
    preparing: { label: "準備出貨", badge: "preparing" },
    shipped: { label: "已出貨", badge: "shipped" },
    done: { label: "已完成", badge: "done" },
    cancelled: { label: "已取消／已退款", badge: "cancelled" }
};

function ordersStorageKey(userId) {
    return `webui-demo-orders:${userId}`;
}

export function getOrders(userId) {
    if (!userId) {
        return [];
    }

    const storedOrders = localStorage.getItem(ordersStorageKey(userId));
    if (!storedOrders) {
        return [];
    }

    const parsedOrders = JSON.parse(storedOrders);
    if (!Array.isArray(parsedOrders)) {
        throw new Error("訂單資料格式錯誤，請清除瀏覽器的示範訂單資料後再試。");
    }
    return parsedOrders;
}

export function saveOrder(userId, order) {
    if (!userId) {
        throw new Error("請先登入再建立訂單。");
    }

    const orders = getOrders(userId);
    orders.unshift(order);
    localStorage.setItem(ordersStorageKey(userId), JSON.stringify(orders));
    document.dispatchEvent(new Event("orders:updated"));
}

export function formatOrderDate(value) {
    if (!value) {
        return "";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    return date.toLocaleString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
}
