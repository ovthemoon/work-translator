/**
 * translate.opendesk.page → Vercel 배포로 넘겨주는 얇은 프록시.
 * opendesk.page 존은 정적 사이트 Worker 가 모든 경로를 받으므로,
 * 더 구체적인 라우트를 이 Worker 에 걸어 앞지른다.
 *
 * - 원본 요청의 클라이언트 IP 를 x-client-ip 로 넘기고, 위조를 막기 위해 x-proxy-secret 을 함께 보낸다.
 *   앱은 비밀값이 맞을 때만 x-client-ip 를 믿는다 (lib/request-ip.ts).
 */
const proxyWorker = {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    if (incoming.pathname === "/favicon.ico" && (request.method === "GET" || request.method === "HEAD")) {
      return fetch("https://nerdevs.co.kr/favicon-v3.png", {
        method: request.method,
        cf: { cacheEverything: true, cacheTtl: 86400 },
      });
    }
    const origin = env.ORIGIN;
    if (!origin) return new Response("ORIGIN is not configured", { status: 500 });

    const target = new URL(origin);
    target.pathname = incoming.pathname;
    target.search = incoming.search;

    // 원 요청을 그대로 복제(메서드·본문 포함)하고 헤더만 손본다.
    const proxied = new Request(target.toString(), request);
    proxied.headers.set("x-forwarded-host", incoming.host);
    proxied.headers.set("x-forwarded-proto", "https");
    proxied.headers.delete("x-client-ip");
    proxied.headers.delete("x-proxy-secret");
    const clientIp = request.headers.get("cf-connecting-ip");
    if (clientIp) proxied.headers.set("x-client-ip", clientIp);
    if (env.PROXY_SECRET) proxied.headers.set("x-proxy-secret", env.PROXY_SECRET);

    const upstream = await fetch(proxied, { redirect: "manual" });

    // Vercel 이 자기 호스트로 리다이렉트하면 우리 호스트로 되돌린다
    const location = upstream.headers.get("location");
    if (location && new URL(location, target).origin === target.origin) {
      const fixed = new Headers(upstream.headers);
      const redirected = new URL(location, target);
      fixed.set("location", `https://${incoming.host}${redirected.pathname}${redirected.search}${redirected.hash}`);
      return new Response(upstream.body, { status: upstream.status, headers: fixed });
    }
    return upstream;
  },
};

export default proxyWorker;
