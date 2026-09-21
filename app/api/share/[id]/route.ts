import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { DAILY_FREE_LIMIT, getRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { isValidShareId } from "@/lib/share/id";
import { getShareRepository } from "@/lib/share/repository";

export const runtime = "nodejs";

/** 좋아요. 같은 IP 는 같은 카드에 하루 한 번만 센다. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isValidShareId(id)) return fail("없는 카드예요.", 404);
  const repo = getShareRepository();
  if (!repo) return fail("준비 중이에요.", 503);

  const limit = await getRateLimiter().limit(`like:${id}:${getClientIp(req)}`);
  const hitsToday = DAILY_FREE_LIMIT - limit.remaining;
  if (hitsToday > 1) return fail("이미 눌렀어요.", 429);

  try {
    const likes = await repo.like(id);
    return ok({ likes });
  } catch (error) {
    console.error("[share] like failed", error instanceof Error ? error.name : typeof error);
    return fail("잠시 후 다시 시도해 주세요.", 503);
  }
}
