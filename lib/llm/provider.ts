export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type JsonSchemaSpec = {
  name: string;
  schema: Record<string, unknown>;
};

export type LlmRequest = {
  messages: ChatMessage[];
  /** 지정하면 provider가 지원하는 방식으로 JSON 출력을 강제한다 */
  jsonSchema?: JsonSchemaSpec;
  maxTokens?: number;
  temperature?: number;
};

export type LlmUsage = {
  promptTokens: number;
  completionTokens: number;
};

export type LlmResponse = {
  text: string;
  model: string;
  usage?: LlmUsage;
};

/**
 * LLM 공급자 인터페이스. Upstage 외 다른 공급자로 바꾸려면 이 인터페이스만 구현하면 된다.
 * 구현체는 원문(messages 내용)을 절대 로그에 남기지 않아야 한다.
 */
export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  complete(request: LlmRequest): Promise<LlmResponse>;
}

export class LlmProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "LlmProviderError";
  }
}
