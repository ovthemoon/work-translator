import type { NextRequest } from "next/server";

const PROXY_SECRET_HEADER = "x-proxy-secret";
const PROXY_CLIENT_IP_HEADER = "x-client-ip";

/**
 * 요청의 클라이언트 IP 를 구한다.
 * 1) 우리 프록시(Cloudflare Worker)가 비밀값과 함께 넘긴 IP 를 최우선으로 믿는다
 * 2) 아니면 플랫폼(Vercel)이 채워 주는 x-forwarded-for / x-real-ip
 * 3) 아무것도 없으면 "unknown" (로컬 개발)
 */
export function getClientIp(req: NextRequest): string {
  const secret = process.env.PROXY_SECRET;
  if (secret && req.headers.get(PROXY_SECRET_HEADER) === secret) {
    const proxied = req.headers.get(PROXY_CLIENT_IP_HEADER)?.trim();
    if (proxied) return proxied;
  }
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
