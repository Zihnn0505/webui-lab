import "dotenv/config";

import { randomBytes, randomUUID, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import session from "express-session";
import { promisify } from "node:util";

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.join(projectDirectory, "data");
const usersFile = path.join(dataDirectory, "users.json");
const sessionSecret = process.env.SESSION_SECRET ?? "";
const sessionCookieSecure = process.env.NODE_ENV === "production";
const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const passwordLength = 64;
const scrypt = promisify(nodeScrypt);

if (sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters. Copy .env.example to .env and set a secure secret.");
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port between 1 and 65535.");
}

const app = express();
let userWriteQueue = Promise.resolve();
const dummyPasswordSalt = randomBytes(16).toString("hex");
const dummyPasswordHash = await scrypt("not-a-real-password", dummyPasswordSalt, passwordLength);

app.disable("x-powered-by");
app.use(express.json({ limit: "12kb" }));
app.use(session({
    name: "webui.sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: sessionCookieSecure,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

function publicUser(user) {
    const { id, email, name, role, sellerStatus } = user;
    return { id, email, name, role, sellerStatus };
}

function normalizeGmail(value) {
    if (typeof value !== "string") {
        return null;
    }

    const email = value.trim().toLowerCase();
    const match = /^([a-z0-9.!#$%&'*+/=?^_`{|}~-]+)@gmail\.com$/.exec(email);
    if (!match || email.length > 254 || match[1].length > 64) {
        return null;
    }

    const canonicalLocalPart = match[1].split("+", 1)[0].replaceAll(".", "");
    if (!canonicalLocalPart) {
        return null;
    }

    return { email, emailKey: `${canonicalLocalPart}@gmail.com` };
}

function normalizeUsername(value) {
    if (typeof value !== "string") {
        return null;
    }

    const username = value.trim();
    if (!/^[\p{L}\p{N}_.-]{2,30}$/u.test(username)) {
        return null;
    }

    return { username, usernameKey: username.toLowerCase() };
}

function validatePassword(value) {
    return typeof value === "string" && value.length >= 8 && value.length <= 128;
}

function passwordError() {
    return Object.assign(new Error("密碼長度需為 8 到 128 個字元。"), { status: 400 });
}

function invalidGmailError() {
    return Object.assign(new Error("請輸入有效的 @gmail.com 信箱。"), { status: 400 });
}

function invalidLoginIdentifierError() {
    return Object.assign(new Error("請輸入有效的 @gmail.com 信箱或使用者名稱。"), { status: 400 });
}

async function startSession(req, user) {
    await regenerateSession(req);
    req.session.userId = user.id;
    await saveSession(req);
}

async function readUsers() {
    let contents;
    try {
        contents = await fs.readFile(usersFile, "utf8");
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }

        await fs.mkdir(dataDirectory, { recursive: true });
        try {
            await fs.writeFile(usersFile, "[]\n", { encoding: "utf8", flag: "wx" });
        } catch (createError) {
            if (createError.code !== "EEXIST") {
                throw createError;
            }
        }
        contents = await fs.readFile(usersFile, "utf8");
    }

    const users = JSON.parse(contents);

    if (!Array.isArray(users)) {
        throw new Error("data/users.json must contain a JSON array.");
    }

    return users;
}

async function writeUsers(users) {
    await fs.mkdir(dataDirectory, { recursive: true });
    const temporaryFile = `${usersFile}.${process.pid}.${randomUUID()}.tmp`;
    await fs.writeFile(temporaryFile, `${JSON.stringify(users, null, 2)}\n`, "utf8");

    try {
        await fs.rename(temporaryFile, usersFile);
    } catch (error) {
        await fs.rm(temporaryFile, { force: true });
        throw error;
    }
}

function updateUsers(update) {
    const operation = userWriteQueue.then(async () => {
        const users = await readUsers();
        const result = update(users);
        await writeUsers(users);
        return result;
    });

    userWriteQueue = operation.then(() => undefined, () => undefined);
    return operation;
}

function findUserById(id) {
    return readUsers().then(users => users.find(user => user.id === id) ?? null);
}

function saveSession(req) {
    return new Promise((resolve, reject) => {
        req.session.save(error => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
}

function regenerateSession(req) {
    return new Promise((resolve, reject) => {
        req.session.regenerate(error => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
}

function destroySession(req) {
    return new Promise((resolve, reject) => {
        req.session.destroy(error => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
}

app.get("/api/auth/me", async (req, res) => {
    res.set("Cache-Control", "no-store");

    if (!req.session.userId) {
        return res.json({ user: null });
    }

    const user = await findUserById(req.session.userId);
    if (!user) {
        await destroySession(req);
        res.clearCookie("webui.sid", { httpOnly: true, sameSite: "lax", secure: sessionCookieSecure });
        return res.json({ user: null });
    }

    return res.json({ user: publicUser(user) });
});

app.post("/api/auth/register", async (req, res) => {
    const gmail = normalizeGmail(req.body?.email);
    if (!gmail) {
        return res.status(400).json({ error: invalidGmailError().message });
    }
    const username = normalizeUsername(req.body?.username);
    if (!username) {
        return res.status(400).json({ error: "使用者名稱需為 2 到 30 個字元，只能包含中英文、數字、底線、句點或連字號。" });
    }
    if (!validatePassword(req.body?.password)) {
        return res.status(400).json({ error: passwordError().message });
    }

    const passwordSalt = randomBytes(16).toString("hex");
    const passwordHash = (await scrypt(req.body.password, passwordSalt, passwordLength)).toString("hex");
    const user = await updateUsers(users => {
        if (users.some(candidate => candidate.emailKey === gmail.emailKey)) {
            throw Object.assign(new Error("這個 Gmail 已註冊，請直接登入。"), { status: 409 });
        }
        if (users.some(candidate => (candidate.usernameKey ?? candidate.name?.trim().toLowerCase()) === username.usernameKey)) {
            throw Object.assign(new Error("這個使用者名稱已有人使用，請換一個名稱。"), { status: 409 });
        }

        const createdUser = {
            id: randomUUID(),
            email: gmail.email,
            emailKey: gmail.emailKey,
            username: username.username,
            usernameKey: username.usernameKey,
            name: username.username,
            passwordSalt,
            passwordHash,
            role: "buyer",
            sellerStatus: "none",
            createdAt: new Date().toISOString()
        };
        users.push(createdUser);
        return createdUser;
    });

    await startSession(req, user);
    res.set("Cache-Control", "no-store");
    return res.json({ user: publicUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
    const loginValue = req.body?.identifier ?? req.body?.email;
    const identifier = typeof loginValue === "string" ? loginValue.trim() : "";
    const gmail = normalizeGmail(identifier);
    const username = gmail ? null : normalizeUsername(identifier);
    if (!gmail && !username) {
        return res.status(400).json({ error: invalidLoginIdentifierError().message });
    }
    if (!validatePassword(req.body?.password)) {
        return res.status(400).json({ error: passwordError().message });
    }

    const users = await readUsers();
    const user = users.find(candidate => gmail
        ? candidate.emailKey === gmail.emailKey
        : (candidate.usernameKey ?? candidate.name?.trim().toLowerCase()) === username.usernameKey) ?? null;
    const passwordSalt = user?.passwordSalt ?? dummyPasswordSalt;
    const expectedHash = user ? Buffer.from(user.passwordHash, "hex") : dummyPasswordHash;
    const actualHash = await scrypt(req.body.password, passwordSalt, passwordLength);
    const passwordMatches = timingSafeEqual(actualHash, expectedHash);

    if (!user || !passwordMatches) {
        return res.status(401).json({ error: "帳號或密碼不正確。" });
    }

    await startSession(req, user);
    res.set("Cache-Control", "no-store");
    return res.json({ user: publicUser(user) });
});

app.post("/api/auth/logout", async (req, res) => {
    await destroySession(req);
    res.clearCookie("webui.sid", { httpOnly: true, sameSite: "lax", secure: sessionCookieSecure });
    return res.status(204).end();
});

app.use("/css", express.static(path.join(projectDirectory, "css")));
app.use("/js", express.static(path.join(projectDirectory, "js")));
app.use("/images", express.static(path.join(projectDirectory, "images")));
app.use(express.static(path.join(projectDirectory, "html")));

app.use((req, res) => {
    res.status(404).json({ error: "找不到此頁面或 API。" });
});

app.use((error, _req, res, next) => {
    console.error("Request failed:", error);

    if (res.headersSent) {
        return next(error);
    }

    const status = Number.isInteger(error.status) ? error.status : 500;
    const message = status >= 400 && status < 500 ? error.message : "伺服器發生錯誤，請稍後再試。";
    return res.status(status).json({ error: message });
});

app.listen(port, () => {
    console.log(`WebUI Lab is running at http://localhost:${port}`);
});
