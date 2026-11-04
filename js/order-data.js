export const orders = [];

export const orderStatuses = {
    unpaid: { label: "待付款", badge: "unpaid" },
    waiting: { label: "待成團", badge: "waiting" },
    preparing: { label: "準備出貨", badge: "preparing" },
    shipped: { label: "已出貨", badge: "shipped" },
    done: { label: "已完成", badge: "done" },
    cancelled: { label: "已取消／已退款", badge: "cancelled" }
};

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
