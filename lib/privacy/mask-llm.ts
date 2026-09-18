import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { LlmProvider } from "@/lib/llm/provider";
import { translateOutputSchema, type TranslateOutput } from "@/lib/translate/schema";

const PROMPT_FILE = path.join(process.cwd(), "prompts", "mask.system.md");
let promptCache: string | null = null;

const maskResultSchema = z.object({
  masked_text: z.string(),
  masked_output: translateOutputSchema,
});

export type MaskResult = z.infer<typeof maskResultSchema>;

const MASK_JSON_SCHEMA = {
  name: "mask_result",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      masked_text: { type: "string" },
      masked_output: {
        type: "object",
        additionalProperties: false,
        properties: {
          translation: { type: "string" },
          split_requests: { type: "array", items: { type: "string" } },
          clarifying_questions: { type: "array", items: { type: "string" } },
          caution: { type: ["string", "null"] },
        },
        required: ["translation", "split_requests", "clarifying_questions", "caution"],
      },
    },
    required: ["masked_text", "masked_output"],
  },
} as const;

function loadPrompt(): string {
  if (promptCache === null) promptCache = fs.readFileSync(PROMPT_FILE, "utf8");
  return promptCache;
}

/**
 * 2단계 마스킹: 정규식이 못 잡는 이름·회사명을 LLM 이 가린다.
 * 한 번의 호출로 원문과 결과물을 함께 처리한다.
 */
export async function maskWithLlm(
  text: string,
  output: TranslateOutput,
  provider: LlmProvider,
): Promise<MaskResult> {
  const response = await provider.complete({
    messages: [
      { role: "system", content: loadPrompt() },
      { role: "user", content: JSON.stringify({ text, output }) },
    ],
    jsonSchema: MASK_JSON_SCHEMA,
    temperature: 0,
  });
  const parsed = maskResultSchema.safeParse(JSON.parse(response.text));
  if (!parsed.success) {
    throw new Error("마스킹 결과가 스키마와 맞지 않습니다.");
  }
  return parsed.data;
}
