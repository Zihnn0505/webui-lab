fetch("/aside.html")
    .then(response => {
        if (!response.ok) {
            throw new Error("載入 aside.html 失敗");
        }
        return response.text();
    })
    .then(html => {
        document.querySelector("#aside-container").innerHTML = html;
        setActiveMenu();
        setupSettingModal();
    })
    .catch(error => {
        console.error(error);
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
        });
    });
    closeButton.addEventListener("click", () => {
        modal.hidden = true;
    });
    overlay.addEventListener("click", () => {
        modal.hidden = true;
    });
}