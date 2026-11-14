let authenticatedUser = null;

fetch("aside.html")
    .then(response => {
        if (!response.ok) {
            throw new Error("載入 aside.html 失敗");
        }
        return response.text();
    })
    .then(html => {
        document.querySelector("#aside-container").innerHTML = html;
        document.body.append(document.querySelector("#setting-modal"));
        updateSellerMenu();
        setActiveMenu();
        setupSidebarCounts();
        setupSettingModal();
        setupSidebarToggle();
        document.dispatchEvent(new Event("aside:ready"));
    })
    .catch(error => {
        console.error(error);
    });

function updateSellerMenu() {
    const sellerMenu = document.querySelector("#seller__menu");
    if (sellerMenu) {
        sellerMenu.hidden = !authenticatedUser?.isSeller;
    }
}

document.addEventListener("auth:user-changed", event => {
    authenticatedUser = event.detail.user;
    updateSellerMenu();
});

// 自動設定目前頁面的選中狀態
function setActiveMenu() {

    const currentPage = location.pathname.split("/").pop();
    const menuLinks = document.querySelectorAll(".menu__link");

    menuLinks.forEach(link => {
        const linkPage = link.getAttribute("href");

        link.classList.remove("is-active");
        link.removeAttribute("aria-current");
        if (linkPage === currentPage) {
            link.classList.add("is-active");
            link.setAttribute("aria-current", "page");
        }
    });
}

function setupSidebarCounts() {
    setupProductCount();
    setupOrderCount();
}

function setupProductCount() {
    const badge = document.querySelector('[data-count-for="products"]');
    if (!badge) {
        return;
    }

    const storageKey = "webui-demo-product-count";
    try {
        const cachedCount = Number(localStorage.getItem(storageKey));
        if (Number.isSafeInteger(cachedCount) && cachedCount >= 0) {
            badge.textContent = String(cachedCount);
        }
    } catch (error) {
        console.error("無法讀取快取的商品數量。", error);
    }

    fetch("api/group-buys", { cache: "no-store" })
        .then(async response => {
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.error || `商品列表載入失敗（${response.status}）。`);
            }
            if (!Array.isArray(result.groupBuys)) {
                throw new Error("商品列表回應格式錯誤。");
            }
            return result.groupBuys.length;
        })
        .then(count => {
            badge.textContent = String(count);
            try {
                localStorage.setItem(storageKey, String(count));
            } catch (error) {
                console.error("無法快取商品數量。", error);
            }
        })
        .catch(error => console.error(error));
}

function setupOrderCount() {
    const badge = document.querySelector('[data-count-for="orders"]');
    if (!badge) {
        return;
    }

    function updateCount(user = authenticatedUser) {
        badge.removeAttribute("title");
        if (!user?.id) {
            badge.textContent = "0";
            return;
        }

        fetch("api/orders/mine", { cache: "no-store" })
            .then(async response => {
                const result = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(result.error || `訂單數量載入失敗（${response.status}）。`);
                }
                if (!Array.isArray(result.orders)) {
                    throw new Error("訂單列表回應格式錯誤。");
                }
                if (authenticatedUser?.id !== user.id) {
                    return;
                }
                badge.textContent = String(result.orders.filter(order => order.status !== "done").length);
            })
            .catch(error => {
                if (authenticatedUser?.id !== user.id) {
                    return;
                }
                badge.textContent = "!";
                badge.title = "訂單數量讀取失敗";
                console.error(error);
            });
    }

    updateCount();
    document.addEventListener("auth:user-changed", event => updateCount(event.detail.user));
    document.addEventListener("orders:updated", () => updateCount());
    window.addEventListener("focus", () => updateCount());
    window.addEventListener("storage", event => {
        if (event.key === null || event.key === `webui-demo-orders:${authenticatedUser?.id}`) {
            updateCount();
        }
    });

}

// 設定小視窗
function setupSettingModal() {

    const modal = document.querySelector("#setting-modal");
    const closeButton = document.querySelector("#setting-modal-close");
    const overlay = document.querySelector(".setting-modal__overlay");
    const buttons = document.querySelectorAll(".setting-btn");
    const modalTitle = document.querySelector("#setting-modal-title");
    const modalBody = document.querySelector("#setting-modal-body");

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            const setting = button.dataset.setting;
            if (setting === "profile") {
                modalTitle.textContent = "個人資料";
                modalBody.innerHTML = "<p>這裡是個人資料設定。</p>";
            }
            if (setting === "notification") {
                modalTitle.textContent = "通知設定";
                modalBody.innerHTML = "<p>這裡是通知設定。</p>";
            }
            if (setting === "security") {
                modalTitle.textContent = "帳號安全";
                modalBody.innerHTML = "<p>這裡是帳號安全設定。</p>";
            }
            modal.hidden = false;
            closeButton.focus();
        });
    });
    function closeModal() {
        modal.hidden = true;
        modal.querySelector(".setting-modal__content").classList.remove("setting-modal__content--wide");
    }

    closeButton.addEventListener("click", () => {
        closeModal();
    });
    overlay.addEventListener("click", () => {
        closeModal();
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !modal.hidden) {
            closeModal();
        }
    });
}

// Topbar 按鈕控制側邊欄；桌機收合、手機抽屜式開啟
function setupSidebarToggle() {
    const app = document.querySelector(".app");
    const button = document.querySelector("#sidebar-toggle");
    const overlay = document.querySelector(".overlay");
    if (!app || !button) return;

    const mobileQuery = window.matchMedia("(max-width: 960px)");

    function setCollapsed(collapsed) {
        app.classList.toggle("sidebar-collapsed", collapsed);
        button.setAttribute("aria-expanded", String(!collapsed));
        button.setAttribute("aria-label", collapsed ? "開啟側邊欄" : "收合側邊欄");
    }

    // 桌機預設展開；手機預設收合，避免一進頁面就遮住內容
    setCollapsed(mobileQuery.matches);

    button.addEventListener("click", () => {
        setCollapsed(!app.classList.contains("sidebar-collapsed"));
    });

    if (overlay) {
        overlay.addEventListener("click", () => setCollapsed(true));
    }

    mobileQuery.addEventListener("change", event => {
        setCollapsed(event.matches);
    });
}
