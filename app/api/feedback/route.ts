import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { getFeedbackRepository } from "@/lib/db";
import { maskForStorage } from "@/lib/privacy/mask";
import { getRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { translateInputSchema, translateOutputSchema } from "@/lib/translate/schema";

export const runtime = "nodejs";
export const maxDuration = 30;

const feedbackSchema = z.object({
  input: translateInputSchema,
  output: translateOutputSchema,
  rating: z.enum(["up", "down"]),
  consent: z.boolean(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("요청 형식이 올바르지 않습니다.", 400);
  }
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) return fail("입력값을 확인해 주세요.", 400);
  const { input, output, rating, consent } = parsed.data;

  // 동의하지 않았으면 아무것도 저장하지 않는다. 평가 자체도 서버에 남기지 않는다.
  if (!consent) return ok({ stored: false });

  const repo = getFeedbackRepository();
  if (!repo) return ok({ stored: false, reason: "storage_disabled" });

  const limit = await getRateLimiter().limit(`fb:${getClientIp(req)}`);
  if (!limit.success) return fail("오늘은 더 이상 피드백을 보낼 수 없어요.", 429);

  try {
    const masked = await maskForStorage(input.text, output);
    await repo.save({
      masked_text: masked.masked_text,
      from_role: input.fromRole,
      to_role: input.toRole,
      depth: input.depth,
      mode: input.mode,
      output: masked.masked_output,
      rating,
    });
    return ok({ stored: true });
  } catch (error) {
    console.error("[feedback] store failed", error instanceof Error ? error.name : typeof error);
    return fail("피드백을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.", 503);
  }
}
