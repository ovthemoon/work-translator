import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { maskForStorage } from "@/lib/privacy/mask";
import { getRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { newShareId } from "@/lib/share/id";
import { getShareRepository } from "@/lib/share/repository";
import { translateInputSchema, translateOutputSchema } from "@/lib/translate/schema";

export const runtime = "nodejs";
export const maxDuration = 30;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const MAX_SHARE_TEXT = 500;

const shareRequestSchema = z.object({
  input: translateInputSchema,
  output: translateOutputSchema,
});

/** "링크 만들기"를 눌렀을 때만 호출된다. 저장 전 정규식 + LLM 으로 개인정보를 가린다. */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("요청 형식이 올바르지 않습니다.", 400);
  }
  const parsed = shareRequestSchema.safeParse(body);
  if (!parsed.success) return fail("입력값을 확인해 주세요.", 400);
  const { input, output } = parsed.data;
  if (input.text.length > MAX_SHARE_TEXT) {
    return fail(`공유 링크는 ${MAX_SHARE_TEXT}자 이하 메시지만 만들 수 있어요.`, 400);
  }

  const repo = getShareRepository();
  if (!repo) return fail("공유 링크 기능은 아직 준비 중이에요.", 503);

  const limit = await getRateLimiter().limit(`share:${getClientIp(req)}`);
  if (!limit.success) return fail("오늘은 더 이상 공유 링크를 만들 수 없어요.", 429);

  try {
    const masked = await maskForStorage(input.text, output);
    const id = newShareId();
    await repo.create({
      id,
      masked_text: masked.masked_text,
      translation: masked.masked_output.translation,
      from_role: input.fromRole,
      to_role: input.toRole,
    });
    return ok({ id, url: `${SITE_URL}/s/${id}` });
  } catch (error) {
    console.error("[share] create failed", error instanceof Error ? error.name : typeof error);
    return fail("공유 링크를 만들지 못했어요. 잠시 후 다시 시도해 주세요.", 503);
  }
}
