import { getLlmProvider } from "@/lib/llm";
import type { LlmProvider, LlmUsage } from "@/lib/llm/provider";
import { buildMessages } from "./prompt";
import { parseTranslateOutput, TRANSLATE_OUTPUT_JSON_SCHEMA, type TranslateInput, type TranslateOutput } from "./schema";

export type TranslateResult = {
  output: TranslateOutput;
  model: string;
  usage?: LlmUsage;
  latencyMs: number;
};

/**
 * 입력을 받아 LLM 을 호출하고 검증된 결과를 돌려준다.
 * 원문을 로그에 남기지 않는다. 실패 시 LlmProviderError 또는 TranslateParseError 를 던진다.
 */
export async function translate(
  input: TranslateInput,
  provider: LlmProvider = getLlmProvider(),
): Promise<TranslateResult> {
  const started = Date.now();
  const response = await provider.complete({
    messages: buildMessages(input),
    jsonSchema: TRANSLATE_OUTPUT_JSON_SCHEMA,
  });
  const output = parseTranslateOutput(response.text);
  return { output, model: response.model, usage: response.usage, latencyMs: Date.now() - started };
}
