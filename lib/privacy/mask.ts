import { getLlmProvider } from "@/lib/llm";
import type { LlmProvider } from "@/lib/llm/provider";
import type { TranslateOutput } from "@/lib/translate/schema";
import { maskWithLlm, type MaskResult } from "./mask-llm";
import { maskWithRegex } from "./mask-regex";

export function maskOutputWithRegex(output: TranslateOutput): TranslateOutput {
  return {
    translation: maskWithRegex(output.translation),
    split_requests: output.split_requests.map(maskWithRegex),
    clarifying_questions: output.clarifying_questions.map(maskWithRegex),
    caution: output.caution === null ? null : maskWithRegex(output.caution),
  };
}

/**
 * 정규식(1단계) → LLM(2단계) 순서로 개인정보를 가린다.
 * LLM 단계가 실패하면 저장하지 않도록 오류를 그대로 던진다 (덜 가린 채 저장하는 것보다 안전).
 */
export async function maskForStorage(
  text: string,
  output: TranslateOutput,
  provider: LlmProvider = getLlmProvider(),
): Promise<MaskResult> {
  const regexText = maskWithRegex(text);
  const regexOutput = maskOutputWithRegex(output);
  const llm = await maskWithLlm(regexText, regexOutput, provider);
  // LLM 이 토큰을 되돌리는 일이 없도록 결과에 정규식을 한 번 더 건다
  return {
    masked_text: maskWithRegex(llm.masked_text),
    masked_output: maskOutputWithRegex(llm.masked_output),
  };
}
