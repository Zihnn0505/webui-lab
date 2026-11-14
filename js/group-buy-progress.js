export function getGroupBuyProgress(paidQuantity, minimumQuantity) {
    const paid = Number(paidQuantity) || 0;
    const minimum = Number(minimumQuantity) || 0;
    const remainingToGoal = Math.max(0, minimum - paid);

    return {
        percentage: minimum > 0 ? Math.min(100, Math.floor(paid / minimum * 100)) : 0,
        summary: `已付款 ${paid}／最低 ${minimum}`,
        detail: remainingToGoal > 0
            ? `已付款 ${paid}／${minimum} 件，還差 ${remainingToGoal} 件成團`
            : `已付款 ${paid} 件，已達成團門檻`
    };
}

export function updateGroupBuyProgressBar(element, { percentage }) {
    element.style.setProperty("--value", String(percentage));
    element.setAttribute("role", "progressbar");
    element.setAttribute("aria-label", "成團進度");
    element.setAttribute("aria-valuenow", String(percentage));
    element.setAttribute("aria-valuemin", "0");
    element.setAttribute("aria-valuemax", "100");
}

window.setInterval(() => {
    if (document.visibilityState === "visible") {
        document.dispatchEvent(new Event("group-buy-progress:updated"));
    }
}, 10000);
