import asyncio
import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request as UpstreamRequest, urlopen

from fastapi import FastAPI
from fastapi import Request, Response
from fastapi.staticfiles import StaticFiles

app = FastAPI()
node_api_url = os.getenv("NODE_API_URL", "http://127.0.0.1:3000").rstrip("/")


def forward_auth_request(method, url, body, headers):
    upstream_request = UpstreamRequest(url, data=body, headers=headers, method=method)

    try:
        with urlopen(upstream_request, timeout=10) as upstream_response:
            return upstream_response.status, upstream_response.headers, upstream_response.read()
    except HTTPError as error:
        return error.code, error.headers, error.read()


@app.api_route("/api/auth/{path:path}", methods=["GET", "POST"])
async def proxy_auth_request(path: str, request: Request):
    query = f"?{request.url.query}" if request.url.query else ""
    upstream_url = f"{node_api_url}/api/auth/{path}{query}"
    forwarded_headers = {
        name: request.headers[name]
        for name in ("accept", "content-type", "cookie")
        if name in request.headers
    }

    try:
        status, upstream_headers, body = await asyncio.to_thread(
            forward_auth_request,
            request.method,
            upstream_url,
            await request.body(),
            forwarded_headers,
        )
    except URLError as error:
        print(f"Node.js auth API is unavailable at {node_api_url}: {error}")
        return Response(
            content=json.dumps({"error": "登入服務暫時無法連線，請確認 Node.js API 伺服器正在執行。"}),
            status_code=502,
            media_type="application/json",
        )

    response_headers = {
        name: upstream_headers[name]
        for name in ("cache-control", "content-type", "set-cookie")
        if name in upstream_headers
    }
    return Response(content=body, status_code=status, headers=response_headers)

app.mount("/css", StaticFiles(directory="css"), name="css")
app.mount("/js", StaticFiles(directory="js"), name="js")

# 關鍵：html=True 讓它自動找 index.html
app.mount("/", StaticFiles(directory="html", html=True), name="site")