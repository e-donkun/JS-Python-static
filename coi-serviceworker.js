/*
 * GitHub Pages などでは、サーバが返すHTTPヘッダ（COOP/COEP）を自分で設定できない。
 * しかし input() を本当に一時停止させるための SharedArrayBuffer は、これらのヘッダによる
 * cross-origin isolation が無いと使えない。そこで、このService Workerがページの応答に
 * 次の2つのヘッダを付け足して返す（動的版では PHP の initialize() が同じヘッダを出している）。
 *   Cross-Origin-Opener-Policy: same-origin
 *   Cross-Origin-Embedder-Policy: require-corp
 * ページ側（index.html の先頭）が、このWorkerを登録し、有効になった後に一度だけ再読み込みする。
 * 外部CDN（esm.sh / cdn.jsdelivr.net）はCORS/CORPで読み込める。
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // Chromeの既知の不具合: only-if-cached は same-origin 以外ではエラーになる
  if (request.cache === "only-if-cached" && request.mode !== "same-origin") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // opaque（status 0）なクロスオリジン応答はヘッダを触れないのでそのまま返す
        if (response.status === 0) return response;
        const headers = new Headers(response.headers);
        headers.set("Cross-Origin-Opener-Policy", "same-origin");
        headers.set("Cross-Origin-Embedder-Policy", "require-corp");
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      })
      .catch((error) => {
        console.error("coi-serviceworker fetch failed:", error);
        return Response.error();
      })
  );
});
