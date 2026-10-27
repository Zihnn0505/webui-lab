import "dotenv/config";

import { createHash, randomBytes, randomUUID, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import session from "express-session";
import { promisify } from "node:util";

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.join(projectDirectory, "data");
const usersFile = path.join(dataDirectory, "users.json");
const groupBuysFile = path.join(dataDirectory, "group-buys.json");
const groupBuyImagesDirectory = path.join(dataDirectory, "group-buy-images");
const sessionSecret = process.env.SESSION_SECRET ?? "";
const sessionCookieSecure = process.env.NODE_ENV === "production";
const port = Number.parseInt(process.env.PORT ?? "7777", 10);
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
let groupBuyWriteQueue = Promise.resolve();
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

function googleUsername(users, email) {
    let base = email.split("@", 1)[0].replace(/[^\p{L}\p{N}_.-]/gu, "_").slice(0, 30) || "google";
    if (base.length < 2) {
        base = `${base}_`;
    }

    for (let suffix = 1; ; suffix += 1) {
        const suffixText = suffix === 1 ? "" : `-${suffix}`;
        const username = `${base.slice(0, 30 - suffixText.length)}${suffixText}`;
        const normalized = normalizeUsername(username);
        if (!users.some(user => (user.usernameKey ?? user.name?.trim().toLowerCase()) === normalized.usernameKey)) {
            return normalized;
        }
    }
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

async function readGroupBuys() {
    let contents;
    try {
        contents = await fs.readFile(groupBuysFile, "utf8");
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }

        await fs.mkdir(dataDirectory, { recursive: true });
        try {
            await fs.writeFile(groupBuysFile, "[]\n", { encoding: "utf8", flag: "wx" });
        } catch (createError) {
            if (createError.code !== "EEXIST") {
                throw createError;
            }
        }
        contents = await fs.readFile(groupBuysFile, "utf8");
    }

    const groupBuys = JSON.parse(contents);
    if (!Array.isArray(groupBuys)) {
        throw new Error("data/group-buys.json must contain a JSON array.");
    }

    return groupBuys;
}

async function writeGroupBuys(groupBuys) {
    await fs.mkdir(dataDirectory, { recursive: true });
    const temporaryFile = `${groupBuysFile}.${process.pid}.${randomUUID()}.tmp`;
    await fs.writeFile(temporaryFile, `${JSON.stringify(groupBuys, null, 2)}\n`, "utf8");

    try {
        await fs.rename(temporaryFile, groupBuysFile);
    } catch (error) {
        await fs.rm(temporaryFile, { force: true });
        throw error;
    }
}

function updateGroupBuys(update) {
    const operation = groupBuyWriteQueue.then(async () => {
        const groupBuys = await readGroupBuys();
        const result = update(groupBuys);
        await writeGroupBuys(groupBuys);
        return result;
    });

    groupBuyWriteQueue = operation.then(() => undefined, () => undefined);
    return operation;
}

function groupBuyStatus(groupBuy) {
    const remainingQuantity = groupBuy.inventory - groupBuy.paidQuantity - groupBuy.reservedQuantity;
    if (remainingQuantity <= 0) {
        return "full";
    }
    if (groupBuy.paidQuantity >= groupBuy.minimumQuantity) {
        return "done";
    }

    const deadline = new Date(groupBuy.deadline).getTime();
    if (deadline <= Date.now()) {
        return "ended";
    }
    if (deadline - Date.now() <= 24 * 60 * 60 * 1000) {
        return "soon";
    }
    return "open";
}

function groupBuyWithComputedFields(groupBuy) {
    return {
        ...groupBuy,
        remainingQuantity: groupBuy.inventory - groupBuy.paidQuantity - groupBuy.reservedQuantity,
        status: groupBuyStatus(groupBuy)
    };
}

async function validateGroupBuy(body, user) {
    const invalid = message => {
        throw Object.assign(new Error(message), { status: 400 });
    };
    const parseNumber = value => {
        if (typeof value !== "number" && (typeof value !== "string" || value.trim() === "")) {
            return NaN;
        }
        return Number(value);
    };
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    if (title.length < 1 || title.length > 100) {
        invalid("商品名稱為必填，最多 100 個字元。");
    }

    const categories = ["食品飲料", "生活用品", "服飾配件", "3C家電", "其他"];
    if (!categories.includes(body.category)) {
        invalid("請選擇有效的商品分類。");
    }

    const variants = body.variants;
    if (!Array.isArray(variants) || variants.length < 1 || variants.length > 20) {
        invalid("至少新增一種規格，最多 20 種。");
    }

    const normalizedVariants = [];
    const variantNames = new Set();
    for (const variant of variants) {
        const name = typeof variant?.name === "string" ? variant.name.trim() : "";
        const price = parseNumber(variant?.price);
        const stock = parseNumber(variant?.stock);
        if (!name || name.length > 50) {
            invalid("規格名稱為必填，最多 50 個字元。");
        }
        const nameKey = name.toLocaleLowerCase("zh-Hant-TW");
        if (variantNames.has(nameKey)) {
            invalid("同一個商品的規格名稱不能重複。");
        }
        variantNames.add(nameKey);

        if (!Number.isFinite(price) || price <= 0 || price > 100000000) {
            invalid("單價必須大於 0。");
        }
        if (!Number.isSafeInteger(stock) || stock <= 0) {
            invalid("每種規格的庫存數量必須是正整數。");
        }
        normalizedVariants.push({ name, price, stock });
    }

    const inventory = normalizedVariants.reduce((total, variant) => total + variant.stock, 0);
    if (!Number.isSafeInteger(inventory)) {
        invalid("庫存合計超出可接受範圍。");
    }
    if (normalizedVariants.some(variant => variant.price !== normalizedVariants[0].price)) {
        invalid("同一商品的各規格必須使用相同單價。");
    }
    const minimumQuantity = parseNumber(body.minimumQuantity);
    if (!Number.isSafeInteger(minimumQuantity) || minimumQuantity <= 0) {
        invalid("成團最低數量必須是正整數。");
    }
    if (minimumQuantity > inventory) {
        invalid("成團最低數量不能大於庫存合計。");
    }

    const deadline = typeof body.deadline === "string" ? new Date(body.deadline) : new Date(NaN);
    if (Number.isNaN(deadline.getTime()) || deadline.getTime() <= Date.now()) {
        invalid("截止時間必須晚於現在。");
    }

    const images = body.images;
    if (!Array.isArray(images) || images.length < 1 || images.length > 5) {
        invalid("商品圖片至少 1 張，最多 5 張。");
    }
    for (const image of images) {
        if (typeof image !== "string" || image.length > 2048) {
            invalid("商品圖片連結格式不正確。");
        }

        if (image.startsWith("api/group-buys/images/")) {
            const imageName = image.slice("api/group-buys/images/".length);
            const ownedImagePattern = new RegExp(`^${user.id}-[0-9a-f-]{36}\\.(jpg|png|webp)$`, "i");
            if (!ownedImagePattern.test(imageName)) {
                invalid("上傳的商品圖片無效。");
            }
            try {
                await fs.access(path.join(groupBuyImagesDirectory, imageName));
            } catch (error) {
                if (error.code === "ENOENT") {
                    invalid("上傳的商品圖片不存在，請重新上傳。");
                }
                throw error;
            }
        } else {
            let imageUrl;
            try {
                imageUrl = new URL(image);
            } catch {
                invalid("請輸入有效的商品圖片連結。");
            }
            if (!["http:", "https:"].includes(imageUrl.protocol)) {
                invalid("商品圖片連結必須使用 HTTP 或 HTTPS。");
            }
        }
    }

    if (body.description !== undefined && body.description !== null && typeof body.description !== "string") {
        invalid("商品描述格式不正確。");
    }
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (description.length > 2000) {
        invalid("商品描述最多 2000 個字元。");
    }

    const estimatedShipDate = body.estimatedShipDate === undefined || body.estimatedShipDate === null || body.estimatedShipDate === ""
        ? null
        : body.estimatedShipDate;
    if (estimatedShipDate) {
        const parsedShipDate = new Date(estimatedShipDate);
        if (
            typeof estimatedShipDate !== "string"
            || !/^\d{4}-\d{2}-\d{2}$/.test(estimatedShipDate)
            || Number.isNaN(parsedShipDate.getTime())
            || parsedShipDate.toISOString().slice(0, 10) !== estimatedShipDate
        ) {
            invalid("預計出貨日期格式不正確。");
        }
    }

    let limitPerBuyer = null;
    if (body.limitPerBuyer !== "" && body.limitPerBuyer !== null && body.limitPerBuyer !== undefined) {
        limitPerBuyer = parseNumber(body.limitPerBuyer);
        if (!Number.isSafeInteger(limitPerBuyer) || limitPerBuyer <= 0) {
            invalid("限購數量必須是正整數。");
        }
    }

    let shippingFee = null;
    if (body.shippingFee !== "" && body.shippingFee !== null && body.shippingFee !== undefined) {
        shippingFee = parseNumber(body.shippingFee);
        if (!Number.isFinite(shippingFee) || shippingFee < 0 || shippingFee > 100000000) {
            invalid("運費必須是大於或等於 0 的金額。");
        }
    }

    const shippingMethods = ["home-delivery", "convenience-store", "pickup"];
    const shippingMethod = body.shippingMethod === undefined || body.shippingMethod === null || body.shippingMethod === ""
        ? null
        : body.shippingMethod;
    if (shippingMethod !== null && typeof shippingMethod !== "string") {
        invalid("請選擇有效的配送方式。");
    }
    if (shippingMethod && !shippingMethods.includes(shippingMethod)) {
        invalid("請選擇有效的配送方式。");
    }

    return {
        title,
        category: body.category,
        description,
        images,
        variants: normalizedVariants,
        inventory,
        minimumQuantity,
        deadline: deadline.toISOString(),
        estimatedShipDate,
        limitPerBuyer,
        shippingFee,
        shippingMethod,
        sellerId: user.id
    };
}

async function getRequestUser(req) {
    if (!req.session.userId) {
        return null;
    }
    return findUserById(req.session.userId);
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

app.get("/api/auth/google", async (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !process.env.GOOGLE_CLIENT_SECRET || !redirectUri) {
        return res.redirect("/?authError=google");
    }

    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    req.session.googleOAuth = { state, verifier };
    await saveSession(req);

    const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorizationUrl.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        state,
        code_challenge: challenge,
        code_challenge_method: "S256"
    }).toString();
    return res.redirect(authorizationUrl.toString());
});

app.get("/api/auth/google/callback", async (req, res) => {
    const pendingAuth = req.session.googleOAuth;
    delete req.session.googleOAuth;
    if (!pendingAuth || typeof req.query.state !== "string" || req.query.state !== pendingAuth.state) {
        await saveSession(req);
        return res.redirect("/?authError=google");
    }
    if (typeof req.query.error === "string" || typeof req.query.code !== "string") {
        await saveSession(req);
        return res.redirect("/?authError=google");
    }
    await saveSession(req);

    try {
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code: req.query.code,
                client_id: process.env.GOOGLE_CLIENT_ID ?? "",
                client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
                redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? "",
                grant_type: "authorization_code",
                code_verifier: pendingAuth.verifier
            }),
            signal: AbortSignal.timeout(10000)
        });
        if (!tokenResponse.ok) {
            throw new Error(`Google token exchange failed (${tokenResponse.status}).`);
        }
        const token = await tokenResponse.json();
        if (typeof token.access_token !== "string") {
            throw new Error("Google token response did not include an access token.");
        }

        const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
            headers: { Authorization: `Bearer ${token.access_token}` },
            signal: AbortSignal.timeout(10000)
        });
        if (!profileResponse.ok) {
            throw new Error(`Google user profile request failed (${profileResponse.status}).`);
        }
        const profile = await profileResponse.json();
        const gmail = normalizeGmail(profile.email);
        if (typeof profile.sub !== "string" || !profile.sub || profile.email_verified !== true || !gmail) {
            throw new Error("Google account must have a verified @gmail.com address.");
        }

        const user = await updateUsers(users => {
            let existing = users.find(candidate => candidate.googleId === profile.sub);
            if (!existing) {
                existing = users.find(candidate => candidate.emailKey === gmail.emailKey);
                if (existing?.googleId && existing.googleId !== profile.sub) {
                    throw Object.assign(new Error("這個 Gmail 已連結其他 Google 帳戶。"), { status: 409 });
                }
                if (existing) {
                    existing.googleId = profile.sub;
                } else {
                    const username = googleUsername(users, gmail.email);
                    existing = {
                        id: randomUUID(),
                        email: gmail.email,
                        emailKey: gmail.emailKey,
                        username: username.username,
                        usernameKey: username.usernameKey,
                        name: typeof profile.name === "string" && profile.name.trim()
                            ? profile.name.trim().slice(0, 100)
                            : username.username,
                        passwordSalt: randomBytes(16).toString("hex"),
                        passwordHash: randomBytes(passwordLength).toString("hex"),
                        googleId: profile.sub,
                        role: "buyer",
                        sellerStatus: "none",
                        createdAt: new Date().toISOString()
                    };
                    users.push(existing);
                }
            }
            return existing;
        });

        await startSession(req, user);
        return res.redirect("/");
    } catch (error) {
        console.error("Google sign-in failed:", error);
        return res.redirect("/?authError=google");
    }
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

app.get("/api/group-buys", async (_req, res) => {
    res.set("Cache-Control", "no-store");
    const groupBuys = await readGroupBuys();
    return res.json({
        groupBuys: groupBuys
            .map(groupBuyWithComputedFields)
    });
});

app.get("/api/group-buys/mine", async (req, res) => {
    const user = await getRequestUser(req);
    if (!user) {
        return res.status(401).json({ error: "請先登入再管理團購。" });
    }

    res.set("Cache-Control", "no-store");
    const groupBuys = await readGroupBuys();
    return res.json({
        groupBuys: groupBuys
            .filter(groupBuy => groupBuy.sellerId === user.id)
            .map(groupBuyWithComputedFields)
    });
});

app.post("/api/group-buys", async (req, res) => {
    const user = await getRequestUser(req);
    if (!user) {
        return res.status(401).json({ error: "請先登入再建立團購。" });
    }

    const details = await validateGroupBuy(req.body, user);
    const createdAt = new Date().toISOString();
    const groupBuy = {
        id: randomUUID(),
        groupNumber: `GB-${createdAt.slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`,
        ...details,
        createdAt,
        paidQuantity: 0,
        reservedQuantity: 0
    };
    const savedGroupBuy = await updateGroupBuys(groupBuys => {
        groupBuys.push(groupBuy);
        return groupBuy;
    });

    return res.status(201).json({ groupBuy: groupBuyWithComputedFields(savedGroupBuy) });
});

app.put("/api/group-buys/:groupId", async (req, res) => {
    const user = await getRequestUser(req);
    if (!user) {
        return res.status(401).json({ error: "請先登入再編輯團購。" });
    }

    const groupBuys = await readGroupBuys();
    const existingGroupBuy = groupBuys.find(groupBuy => groupBuy.id === req.params.groupId && groupBuy.sellerId === user.id);
    if (!existingGroupBuy) {
        return res.status(404).json({ error: "找不到這筆團購。" });
    }

    const details = await validateGroupBuy(req.body, user);
    const updatedGroupBuy = await updateGroupBuys(records => {
        const index = records.findIndex(groupBuy => groupBuy.id === existingGroupBuy.id && groupBuy.sellerId === user.id);
        if (index < 0) {
            throw Object.assign(new Error("找不到這筆團購。"), { status: 404 });
        }

        const current = records[index];
        if (new Date(details.deadline).getTime() < new Date(current.deadline).getTime()) {
            throw Object.assign(new Error("團購截止時間只能延後，不能提前。"), { status: 400 });
        }

        const hasOrders = current.paidQuantity > 0 || current.reservedQuantity > 0;
        if (hasOrders) {
            const buyerTermsChanged = details.title !== current.title
                || details.category !== current.category
                || details.minimumQuantity !== current.minimumQuantity
                || details.limitPerBuyer !== current.limitPerBuyer
                || details.shippingFee !== current.shippingFee
                || details.shippingMethod !== current.shippingMethod;
            if (buyerTermsChanged) {
                throw Object.assign(new Error("已有訂單後，商品名稱、分類、成團門檻、限購與配送條件不可修改。"), { status: 400 });
            }

            const editedVariants = new Map(details.variants.map(variant => [variant.name, variant]));
            for (const variant of current.variants) {
                const editedVariant = editedVariants.get(variant.name);
                if (!editedVariant || editedVariant.price !== variant.price || editedVariant.stock < variant.stock) {
                    throw Object.assign(new Error("已有訂單後不可更改規格名稱、單價或刪除規格，庫存只能增加。"), { status: 400 });
                }
            }
        }

        const updated = {
            ...current,
            ...details,
            id: current.id,
            groupNumber: current.groupNumber,
            sellerId: current.sellerId,
            createdAt: current.createdAt,
            paidQuantity: current.paidQuantity,
            reservedQuantity: current.reservedQuantity
        };
        records[index] = updated;
        return updated;
    });

    return res.json({ groupBuy: groupBuyWithComputedFields(updatedGroupBuy) });
});

app.post(
    "/api/group-buys/images",
    express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "5mb" }),
    async (req, res) => {
        const user = await getRequestUser(req);
        if (!user) {
            return res.status(401).json({ error: "請先登入再上傳商品圖片。" });
        }
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
            return res.status(400).json({ error: "請選擇要上傳的圖片。" });
        }

        let extension;
        let mimeType;
        if (req.body.length >= 3 && req.body[0] === 0xff && req.body[1] === 0xd8 && req.body[2] === 0xff) {
            extension = "jpg";
            mimeType = "image/jpeg";
        } else if (req.body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
            extension = "png";
            mimeType = "image/png";
        } else if (
            req.body.length >= 12
            && req.body.toString("ascii", 0, 4) === "RIFF"
            && req.body.toString("ascii", 8, 12) === "WEBP"
        ) {
            extension = "webp";
            mimeType = "image/webp";
        } else {
            return res.status(400).json({ error: "圖片內容必須是 JPG、PNG 或 WebP 格式。" });
        }

        const imageName = `${user.id}-${randomUUID()}.${extension}`;
        await fs.mkdir(groupBuyImagesDirectory, { recursive: true });
        await fs.writeFile(path.join(groupBuyImagesDirectory, imageName), req.body, { flag: "wx" });
        return res.status(201).json({
            image: {
                url: `api/group-buys/images/${imageName}`,
                mimeType,
                size: req.body.length
            }
        });
    }
);

app.get("/api/group-buys/images/:imageName", async (req, res) => {
    const imageName = req.params.imageName;
    const ownedImagePattern = /^[0-9a-f-]{36}-[0-9a-f-]{36}\.(jpg|png|webp)$/i;
    if (!ownedImagePattern.test(imageName)) {
        return res.status(404).json({ error: "找不到商品圖片。" });
    }

    const groupBuys = await readGroupBuys();
    const imageUrl = `api/group-buys/images/${imageName}`;
    if (!groupBuys.some(groupBuy => groupBuy.images.includes(imageUrl))) {
        return res.status(404).json({ error: "找不到商品圖片。" });
    }

    let image;
    try {
        image = await fs.readFile(path.join(groupBuyImagesDirectory, imageName));
    } catch (error) {
        if (error.code === "ENOENT") {
            return res.status(404).json({ error: "找不到商品圖片。" });
        }
        throw error;
    }

    const extension = path.extname(imageName).toLowerCase();
    const mimeType = extension === ".jpg" ? "image/jpeg" : extension === ".png" ? "image/png" : "image/webp";
    return res
        .set("Content-Type", mimeType)
        .set("Cache-Control", "private, max-age=3600")
        .send(image);
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
