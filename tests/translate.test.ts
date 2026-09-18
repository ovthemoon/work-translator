import { describe, expect, test } from "vitest";
import { translate } from "@/lib/translate/translate";
import type { LlmProvider, LlmRequest, LlmResponse } from "@/lib/llm/provider";

function fakeProvider(text: string, onCall?: (req: LlmRequest) => void): LlmProvider {
  return {
    name: "fake",
    model: "fake-model",
    async complete(req): Promise<LlmResponse> {
      onCall?.(req);
      return { text, model: "fake-model" };
    },
  };
}

const input = {
  text: "로고만 살짝 바꿔주시면 돼요",
  fromRole: "client" as const,
  toRole: "developer" as const,
  depth: "simple" as const,
  mode: "translate" as const,
  style: "explain" as const,
};

describe("translate", () => {
  test("returns parsed output and asks the provider for JSON", async () => {
    let seen: LlmRequest | undefined;
    const provider = fakeProvider(
      '{"translation":"로고 교체 요청","split_requests":[],"clarifying_questions":["파일 있나요?"],"caution":null}',
      (req) => (seen = req),
    );
    const result = await translate(input, provider);
    expect(result.output.translation).toBe("로고 교체 요청");
    expect(result.model).toBe("fake-model");
    expect(seen?.jsonSchema?.name).toBe("translation_result");
    expect(seen?.messages[0].role).toBe("system");
  });

  test("propagates a parse error when the model returns garbage", async () => {
    await expect(translate(input, fakeProvider("nope"))).rejects.toThrow(/JSON/);
  });
});
