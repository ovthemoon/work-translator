import type { LlmProvider } from "./provider";
import { UpstageProvider } from "./upstage";

export type { LlmProvider, LlmRequest, LlmResponse, ChatMessage } from "./provider";
export { LlmProviderError } from "./provider";

let cached: LlmProvider | null = null;

/**
 * 환경변수로 설정된 기본 LLM 공급자를 반환한다 (서버 전용).
 * 다른 공급자를 추가하려면 LLM_PROVIDER 환경변수로 분기하면 된다.
 */
export function getLlmProvider(overrides?: { model?: string }): LlmProvider {
  if (cached && !overrides) return cached;
  const provider = new UpstageProvider({
    apiKey: process.env.UPSTAGE_API_KEY ?? "",
    model: overrides?.model ?? process.env.UPSTAGE_MODEL,
    baseURL: process.env.UPSTAGE_BASE_URL,
    reasoningEffort: process.env.UPSTAGE_REASONING_EFFORT,
  });
  if (!overrides) cached = provider;
  return provider;
}
