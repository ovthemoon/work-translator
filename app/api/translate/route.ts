import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { cacheKeyFor, CACHE_TTL_SECONDS, getCache } from "@/lib/cache";
import { LlmProviderError } from "@/lib/llm";
import { getRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { translateInputSchema, TranslateParseError, type TranslateOutput } from "@/lib/translate/schema";
import { translate } from "@/lib/translate/translate";

export const runtime = "nodejs";
export const maxDuration = 30;

export type TranslateApiData = {
  output: TranslateOutput;
  cached: boolean;
  remaining: number;
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("요청 형식이 올바르지 않습니다.", 400);
  }

  const parsed = translateInputSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.", 400);
  }
  const input = parsed.data;

  const ip = getClientIp(req);
  const limit = await getRateLimiter().limit(ip);
  if (!limit.success) {
    const resetAt = new Date(limit.reset).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    return fail(`오늘 사용 가능한 횟수를 모두 썼어요. ${resetAt} 이후에 다시 시도해 주세요.`, 429, {
      "Retry-After": String(Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000))),
    });
  }

  const cache = getCache();
  const key = cacheKeyFor({ text: input.text, from: input.fromRole, to: input.toRole, depth: input.depth, mode: input.mode });
  const hit = await cache.get<TranslateOutput>(key).catch(() => null);
  if (hit) {
    return ok<TranslateApiData>({ output: hit, cached: true, remaining: limit.remaining });
  }

  try {
    const result = await translate(input);
    await cache.set(key, result.output, CACHE_TTL_SECONDS).catch(() => undefined);
    return ok<TranslateApiData>({ output: result.output, cached: false, remaining: limit.remaining });
  } catch (error) {
    // 원문은 절대 로그에 남기지 않는다. 오류 종류와 상태 코드만 기록한다.
    if (error instanceof LlmProviderError) {
      console.error(`[translate] provider error status=${error.status ?? "?"} retryable=${error.retryable}`);
      const message = error.message.includes("API_KEY")
        ? "서버에 번역 모델 설정이 아직 되어 있지 않아요."
        : "번역 서비스가 잠시 응답하지 않아요. 잠시 후 다시 시도해 주세요.";
      return fail(message, error.retryable ? 503 : 502);
    }
    if (error instanceof TranslateParseError) {
      console.error("[translate] parse error");
      return fail("번역 결과를 읽는 데 실패했어요. 다시 한 번 시도해 주세요.", 502);
    }
    console.error("[translate] unexpected error", error instanceof Error ? error.name : typeof error);
    return fail("알 수 없는 오류가 발생했어요.", 500);
  }
}
