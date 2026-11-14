export const orderStatuses = {
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

async function readOrderResponse(response) {
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(result.error || `訂單請求失敗（${response.status}）。`);
    }
    return result;
}

export async function fetchOrders() {
    const result = await readOrderResponse(await fetch("api/orders/mine", { cache: "no-store" }));
    if (!Array.isArray(result.orders)) {
        throw new Error("訂單列表回應格式不正確。");
    }
    return result.orders;
}

export async function createPaidOrder(items, recipient, paymentMethod) {
    const result = await readOrderResponse(await fetch("api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            items: items.map(item => ({
                groupBuyId: item.groupBuy?.id,
                variantName: item.variantName || "",
                quantity: Number(item.quantity)
            })),
            recipient,
            paymentMethod
        })
    }));
    if (!result.order || typeof result.order.id !== "string") {
        throw new Error("訂單建立回應格式不正確。");
    }
    return result.order;
}

export async function completeOrder(orderId) {
    const result = await readOrderResponse(await fetch(`api/orders/${encodeURIComponent(orderId)}/complete`, {
        method: "POST"
    }));
    if (!result.order || typeof result.order.id !== "string") {
        throw new Error("訂單更新回應格式不正確。");
    }
    return result.order;
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
