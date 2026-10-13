fetch("/index.html")

.then(response => {
    if (!response.ok) {
        throw new Error("載入 index.html 失敗");
    }
    return response.text();
})

