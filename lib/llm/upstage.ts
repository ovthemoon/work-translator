import OpenAI from "openai";
import { LlmProviderError, type LlmProvider, type LlmRequest, type LlmResponse } from "./provider";

export const UPSTAGE_DEFAULT_BASE_URL = "https://api.upstage.ai/v1";
export const UPSTAGE_DEFAULT_MODEL = "solar-pro4";
/** 속도 우선. solar-pro4 는 "none" 으로 추론(생각하기)을 끌 수 있다. */
export const UPSTAGE_DEFAULT_REASONING_EFFORT = "none";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_TOKENS = 1024;

export type UpstageOptions = {
  apiKey: string;
  model?: string;
  baseURL?: string;
  reasoningEffort?: string;
  timeoutMs?: number;
};

export class UpstageProvider implements LlmProvider {
  readonly name = "upstage";
  readonly model: string;
  private readonly client: OpenAI;
  private readonly reasoningEffort: string;

  constructor(options: UpstageOptions) {
    if (!options.apiKey) {
      throw new LlmProviderError("UPSTAGE_API_KEY 가 설정되지 않았습니다.");
    }
    this.model = options.model ?? UPSTAGE_DEFAULT_MODEL;
    this.reasoningEffort = options.reasoningEffort ?? UPSTAGE_DEFAULT_REASONING_EFFORT;
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseURL ?? UPSTAGE_DEFAULT_BASE_URL,
      timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxRetries: 1,
    });
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: request.messages,
        max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: request.temperature ?? 0.2,
        // Upstage 는 "none" 도 받지만 OpenAI SDK 타입에는 없어서 캐스팅
        reasoning_effort: this.reasoningEffort as OpenAI.ReasoningEffort,
        ...(request.jsonSchema
          ? {
              response_format: {
                type: "json_schema" as const,
                json_schema: {
                  name: request.jsonSchema.name,
                  schema: request.jsonSchema.schema,
                  strict: true,
                },
              },
            }
          : {}),
      });
      const text = completion.choices[0]?.message?.content;
      if (!text) {
        throw new LlmProviderError("모델이 빈 응답을 반환했습니다.", undefined, true);
      }
      return {
        text,
        model: completion.model ?? this.model,
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
            }
          : undefined,
      };
    } catch (error) {
      throw toProviderError(error);
    }
  }
}

function toProviderError(error: unknown): LlmProviderError {
  if (error instanceof LlmProviderError) return error;
  if (error instanceof OpenAI.APIError) {
    const status = error.status;
    const retryable = status === 429 || (status !== undefined && status >= 500);
    // 요청 본문(원문)이 포함될 수 있는 error.message 는 그대로 노출하지 않는다
    return new LlmProviderError(`LLM 요청 실패 (status ${status ?? "?"})`, status, retryable);
  }
  if (error instanceof Error && error.name === "APIConnectionTimeoutError") {
    return new LlmProviderError("LLM 응답 시간이 초과되었습니다.", undefined, true);
  }
  return new LlmProviderError("LLM 요청 중 알 수 없는 오류가 발생했습니다.");
}
