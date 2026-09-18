import { describe, expect, test } from "vitest";
import { maskForStorage } from "@/lib/privacy/mask";
import type { LlmProvider, LlmRequest } from "@/lib/llm/provider";

describe("maskForStorage", () => {
  test("regex masks before the LLM sees the text, and re-masks the LLM result", async () => {
    let seen = "";
    const provider: LlmProvider = {
      name: "fake",
      model: "fake",
      async complete(req: LlmRequest) {
        seen = req.messages[1].content;
        // LLM 이 이름은 가렸지만 번호를 되살렸다고 가정
        return {
          text: JSON.stringify({
            masked_text: "[이름] 대리가 010-1111-2222 로 연락",
            masked_output: { translation: "[이름] 대리에게 연락", split_requests: [], clarifying_questions: [], caution: null },
          }),
          model: "fake",
        };
      },
    };
    const result = await maskForStorage(
      "김철수 대리가 010-1111-2222 로 연락",
      { translation: "김철수 대리에게 연락", split_requests: [], clarifying_questions: [], caution: null },
      provider,
    );
    expect(seen).not.toContain("010-1111-2222");
    expect(result.masked_text).toBe("[이름] 대리가 [번호] 로 연락");
    expect(result.masked_output.translation).toBe("[이름] 대리에게 연락");
  });
});
