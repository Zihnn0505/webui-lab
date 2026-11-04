export const demoOrders = [
    {
        id: "20261104-08",
        createdAt: "2026-11-04T09:22:00+08:00",
        status: "unpaid",
        total: 980,
        paymentDue: "2026-11-04T15:22:00+08:00",
        items: [
            { name: "手工餅乾禮盒", spec: "原味", quantity: 2, price: 980, tone: "#D6E8DF" }
        ],
        recipient: { name: "展示收件人", phone: "09**-***-123", address: "台北市信義區（展示資料）" },
        timeline: [
            { label: "下單", at: "2026-11-04T09:22:00+08:00", complete: true },
            { label: "付款", at: "", complete: false },
            { label: "成團", at: "", complete: false },
            { label: "出貨", at: "", complete: false },
            { label: "完成", at: "", complete: false }
        ]
    },
    {
        id: "20261103-21",
        createdAt: "2026-11-03T11:05:00+08:00",
        status: "waiting",
        total: 399,
        groupBuy: { paid: 40, minimum: 100, deadline: "2026-11-12T09:00:00+08:00" },
        items: [
            { name: "有機水果箱", spec: "標準箱", quantity: 1, price: 399, tone: "#F3E4C9" }
        ],
        recipient: { name: "展示收件人", phone: "09**-***-123", address: "台北市信義區（展示資料）" },
        timeline: [
            { label: "下單", at: "2026-11-03T11:05:00+08:00", complete: true },
            { label: "付款", at: "2026-11-03T11:08:00+08:00", complete: true },
            { label: "成團", at: "", complete: false },
            { label: "出貨", at: "", complete: false },
            { label: "完成", at: "", complete: false }
        ]
    },
    {
        id: "20261102-14",
        createdAt: "2026-11-02T20:40:00+08:00",
        status: "preparing",
        total: 680,
        estimatedShipping: "成團後 3–5 天出貨",
        items: [
            { name: "保溫杯組", spec: "藍色", quantity: 1, price: 680, tone: "#E3DDF0" }
        ],
        recipient: { name: "展示收件人", phone: "09**-***-123", address: "台北市信義區（展示資料）" },
        timeline: [
            { label: "下單", at: "2026-11-02T20:40:00+08:00", complete: true },
            { label: "付款", at: "2026-11-02T20:43:00+08:00", complete: true },
            { label: "成團", at: "2026-11-03T10:00:00+08:00", complete: true },
            { label: "出貨", at: "", complete: false },
            { label: "完成", at: "", complete: false }
        ]
    },
    {
        id: "20261101-05",
        createdAt: "2026-11-01T11:15:00+08:00",
        status: "shipped",
        total: 960,
        shipment: { carrier: "黑貓宅急便", trackingNumber: "TC-1234-5678-90" },
        items: [
            { name: "手沖咖啡濾掛", spec: "淺烘焙", quantity: 3, price: 960, tone: "#DCE6F2" }
        ],
        recipient: { name: "展示收件人", phone: "09**-***-123", address: "台北市信義區（展示資料）" },
        timeline: [
            { label: "下單", at: "2026-11-01T11:15:00+08:00", complete: true },
            { label: "付款", at: "2026-11-01T11:18:00+08:00", complete: true },
            { label: "成團", at: "2026-11-02T09:00:00+08:00", complete: true },
            { label: "出貨", at: "2026-11-03T15:30:00+08:00", complete: true },
            { label: "完成", at: "", complete: false }
        ]
    },
    {
        id: "20261030-33",
        createdAt: "2026-10-30T16:50:00+08:00",
        status: "done",
        total: 1010,
        completedAt: "2026-11-02T14:00:00+08:00",
        items: [
            { name: "手工餅乾禮盒", spec: "巧克力", quantity: 1, price: 520, tone: "#D6E8DF" },
            { name: "手工餅乾禮盒", spec: "原味", quantity: 1, price: 490, tone: "#D6E8DF" }
        ],
        recipient: { name: "展示收件人", phone: "09**-***-123", address: "台北市信義區（展示資料）" },
        timeline: [
            { label: "下單", at: "2026-10-30T16:50:00+08:00", complete: true },
            { label: "付款", at: "2026-10-30T16:55:00+08:00", complete: true },
            { label: "成團", at: "2026-10-31T12:00:00+08:00", complete: true },
            { label: "出貨", at: "2026-11-01T09:30:00+08:00", complete: true },
            { label: "完成", at: "2026-11-02T14:00:00+08:00", complete: true }
        ]
    },
    {
        id: "20261029-19",
        createdAt: "2026-10-29T08:30:00+08:00",
        status: "cancelled",
        total: 1280,
        cancelReason: "未達成團門檻",
        refundedAt: "2026-11-01T12:00:00+08:00",
        items: [
            { name: "無線藍牙耳機", spec: "黑色", quantity: 1, price: 1280, tone: "#DDE3E8" }
        ],
        recipient: { name: "展示收件人", phone: "09**-***-123", address: "台北市信義區（展示資料）" },
        timeline: [
            { label: "下單", at: "2026-10-29T08:30:00+08:00", complete: true },
            { label: "付款", at: "2026-10-29T08:36:00+08:00", complete: true },
            { label: "成團", at: "2026-11-01T09:00:00+08:00", complete: false },
            { label: "出貨", at: "", complete: false },
            { label: "完成", at: "", complete: false }
        ]
    }
];

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
