const authDialog = document.querySelector("#auth-dialog");
const authForm = document.querySelector("#auth-form");
const authOpenButton = document.querySelector("#auth-open-button");
const authCloseButton = document.querySelector("#auth-close-button");
const authModeToggle = document.querySelector("#auth-mode-toggle");
const authTitle = document.querySelector("#auth-title");
const authSubmitButton = document.querySelector("#auth-submit-button");
const authGoogleButton = document.querySelector("#auth-google-button");
const authIdentifier = document.querySelector("#auth-identifier");
const authIdentifierLabel = document.querySelector("#auth-identifier-label");
const authUsernameField = document.querySelector("#auth-username-field");
const authUsername = document.querySelector("#auth-username");
const authPassword = document.querySelector("#auth-password");
const authUser = document.querySelector("#auth-user");
const userName = document.querySelector("#user-name");
const logoutButton = document.querySelector("#logout-button");
const authStatus = document.querySelector("#auth-status");

let isRegisterMode = false;

function showAuthMessage(message) {
    if (!authStatus) {
        return;
    }

    authStatus.textContent = message;
    authStatus.hidden = message.length === 0;
}

function renderUser(user) {
    const isSignedIn = Boolean(user);

    if (userName) {
        userName.textContent = user?.name ?? "";
    }
    if (authUser) {
        authUser.hidden = !isSignedIn;
    }
    if (authOpenButton) {
        authOpenButton.hidden = isSignedIn;
    }
    if (logoutButton) {
        logoutButton.hidden = !isSignedIn;
    }
    document.dispatchEvent(new CustomEvent("auth:user-changed", { detail: { user } }));
}

async function readResponse(response) {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(body.error || `伺服器請求失敗（${response.status}）。`);
    }
    return body;
}

function setAuthMode(registerMode) {
    isRegisterMode = registerMode;
    authTitle.textContent = isRegisterMode ? "建立帳號" : "登入";
    authSubmitButton.textContent = isRegisterMode ? "註冊並登入" : "登入";
    authModeToggle.textContent = isRegisterMode ? "已經有帳號？登入" : "還沒有帳號？註冊";
    authPassword.autocomplete = isRegisterMode ? "new-password" : "current-password";
    authIdentifierLabel.textContent = isRegisterMode ? "Gmail" : "使用者名稱或 Mail";
    authIdentifier.placeholder = isRegisterMode ? "name@gmail.com" : "請輸入使用者名稱或 Mail";
    authIdentifier.autocomplete = isRegisterMode ? "email" : "username";
    authUsernameField.hidden = !isRegisterMode;
    authUsername.required = isRegisterMode;
    authPassword.value = "";
    showAuthMessage("");
}

async function submitCredentials(event) {
    event.preventDefault();
    authSubmitButton.disabled = true;
    showAuthMessage(isRegisterMode ? "正在建立帳號…" : "正在登入…");

    try {
        const endpoint = isRegisterMode ? "api/auth/register" : "api/auth/login";
        const result = await readResponse(await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...(isRegisterMode
                    ? { email: authIdentifier.value, username: authUsername.value }
                    : { identifier: authIdentifier.value }),
                password: authPassword.value
            })
        }));
        renderUser(result.user);
        showAuthMessage("");
        authDialog.close();
        authForm.reset();
        setAuthMode(false);
    } catch (error) {
        showAuthMessage(error.message);
    } finally {
        authSubmitButton.disabled = false;
    }
}

async function loadCurrentUser() {
    try {
        const result = await readResponse(await fetch("api/auth/me", { cache: "no-store" }));
        renderUser(result.user);

        const url = new URL(window.location.href);
        if (url.searchParams.has("authError")) {
            setAuthMode(false);
            showAuthMessage("Google 登入未完成，請確認設定或再試一次。");
            authDialog.showModal();
            url.searchParams.delete("authError");
            window.history.replaceState({}, "", url);
        }
    } catch (error) {
        showAuthMessage(error.message);
        document.dispatchEvent(new CustomEvent("auth:load-failed", { detail: { error: error.message } }));
    }
}

authOpenButton?.addEventListener("click", () => {
    setAuthMode(false);
    authDialog.showModal();
    authIdentifier.focus();
});

authCloseButton?.addEventListener("click", () => authDialog.close());
authModeToggle?.addEventListener("click", () => setAuthMode(!isRegisterMode));
authForm?.addEventListener("submit", submitCredentials);
authGoogleButton?.addEventListener("click", () => {
    authGoogleButton.disabled = true;
    showAuthMessage("正在連線至 Google…");
    window.location.assign("api/auth/google");
});

logoutButton?.addEventListener("click", async () => {
    if (!window.confirm("確定要登出嗎？")) {
        return;
    }

    logoutButton.disabled = true;
    try {
        const response = await fetch("api/auth/logout", { method: "POST" });
        if (!response.ok) {
            await readResponse(response);
        }

        renderUser(null);
        showAuthMessage("");
    } catch (error) {
        showAuthMessage(error.message);
    } finally {
        logoutButton.disabled = false;
    }
});

loadCurrentUser();
