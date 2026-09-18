/**
 * translate.opendesk.page → Vercel 배포로 넘겨주는 얇은 프록시.
 * opendesk.page 존은 정적 사이트 Worker 가 모든 경로를 받으므로,
 * 더 구체적인 라우트를 이 Worker 에 걸어 앞지른다.
 *
 * - 원본 요청의 클라이언트 IP 를 x-client-ip 로 넘기고, 위조를 막기 위해 x-proxy-secret 을 함께 보낸다.
 *   앱은 비밀값이 맞을 때만 x-client-ip 를 믿는다 (lib/request-ip.ts).
 */
export default {
  async fetch(request, env) {
    const origin = env.ORIGIN;
    if (!origin) return new Response("ORIGIN is not configured", { status: 500 });

    const incoming = new URL(request.url);
    const target = new URL(incoming.pathname + incoming.search, origin);

    const headers = new Headers(request.headers);
    headers.set("host", target.host);
    headers.set("x-forwarded-host", incoming.host);
    headers.set("x-forwarded-proto", "https");
    const clientIp = request.headers.get("cf-connecting-ip");
    if (clientIp) headers.set("x-client-ip", clientIp);
    if (env.PROXY_SECRET) headers.set("x-proxy-secret", env.PROXY_SECRET);

    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual",
    });

    // Vercel 이 자기 호스트로 리다이렉트하면 우리 호스트로 되돌린다
    const location = upstream.headers.get("location");
    if (location && location.startsWith(origin)) {
      const fixed = new Headers(upstream.headers);
      fixed.set("location", location.replace(origin, `https://${incoming.host}`));
      return new Response(upstream.body, { status: upstream.status, headers: fixed });
    }
    return upstream;
  },
};
