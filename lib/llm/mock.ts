import type { LlmProvider, LlmRequest, LlmResponse } from "./provider";

const MOCK_DELAY_MS = 600;

const CANNED_TRANSLATION = {
  translation: "(개발용 가짜 응답) 이 메시지는 실제 모델이 아니라 예시 응답으로 번역됐어요. UPSTAGE_API_KEY 를 설정하면 실제 번역이 나와요.",
  split_requests: ["예시 요청 1", "예시 요청 2"],
  clarifying_questions: ["언제까지 필요한가요?", "우선순위는 어떻게 되나요?"],
  caution: "예시 주의 문구예요. 실제 결과가 아니에요.",
};

const CANNED_MASK = (userContent: string) => {
  const parsed = JSON.parse(userContent) as { text: string; output: unknown };
  return { masked_text: parsed.text, masked_output: parsed.output };
};

/**
 * 개발·UI 테스트용 가짜 공급자. LLM_PROVIDER=mock 일 때만 사용된다.
 * 요청한 JSON 스키마 이름에 따라 번역 또는 마스킹 모양의 응답을 돌려준다.
 */
export class MockProvider implements LlmProvider {
  readonly name = "mock";
  readonly model = "mock";

  async complete(request: LlmRequest): Promise<LlmResponse> {
    await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));
    const last = request.messages.at(-1)?.content ?? "";
    const body = request.jsonSchema?.name === "mask_result" ? CANNED_MASK(last) : CANNED_TRANSLATION;
    return { text: JSON.stringify(body), model: this.model };
  }
}
