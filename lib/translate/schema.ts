import { z } from "zod";
import {
  DEPTH_IDS,
  MAX_CLARIFYING_QUESTIONS,
  MAX_INPUT_CHARS,
  MODE_IDS,
  ROLE_IDS,
  STYLE_IDS,
} from "./roles";

export const translateInputSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "메시지를 입력해 주세요.")
    .max(MAX_INPUT_CHARS, `메시지는 ${MAX_INPUT_CHARS}자까지 입력할 수 있어요.`),
  fromRole: z.enum(ROLE_IDS),
  toRole: z.enum(ROLE_IDS),
  depth: z.enum(DEPTH_IDS),
  mode: z.enum(MODE_IDS).default("translate"),
  /** 해석 모드에서만 의미 있음. reverse 에서는 무시 */
  style: z.enum(STYLE_IDS).default("explain"),
});

export type TranslateInput = z.infer<typeof translateInputSchema>;

export const translateOutputSchema = z.object({
  translation: z.string().trim().min(1),
  split_requests: z.array(z.string().trim().min(1)).default([]),
  clarifying_questions: z
    .array(z.string().trim().min(1))
    .max(MAX_CLARIFYING_QUESTIONS)
    .default([]),
  caution: z.string().trim().min(1).nullable().default(null),
});

export type TranslateOutput = z.infer<typeof translateOutputSchema>;

/**
 * LLM에 강제할 JSON Schema (response_format: json_schema 용).
 * zod 스키마와 동일한 모양을 손으로 유지한다. (strict 모드는 optional 필드를 허용하지 않으므로 모두 required)
 */
export const TRANSLATE_OUTPUT_JSON_SCHEMA = {
  name: "translation_result",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      translation: { type: "string", description: "번역된 문장" },
      split_requests: {
        type: "array",
        items: { type: "string" },
        description: "요청이 여러 개면 분리한 목록. 없으면 빈 배열",
      },
      clarifying_questions: {
        type: "array",
        items: { type: "string" },
        maxItems: MAX_CLARIFYING_QUESTIONS,
        description: "받는 사람이 되물어야 할 질문. 최대 3개. 없으면 빈 배열",
      },
      caution: {
        type: ["string", "null"],
        description: "일정·범위·비용 관련 주의점. 없으면 null",
      },
    },
    required: ["translation", "split_requests", "clarifying_questions", "caution"],
  },
} as const;

/**
 * 모델 출력(문자열)을 안전하게 파싱한다.
 * - 코드펜스(```json ... ```)로 감싸진 경우 벗겨낸다
 * - 앞뒤에 잡담이 붙은 경우 첫 { 부터 마지막 } 까지만 취한다
 * - clarifying_questions 가 3개를 넘으면 앞 3개만 남긴다 (모델이 규칙을 어겨도 실패시키지 않음)
 */
export function parseTranslateOutput(raw: string): TranslateOutput {
  const jsonText = extractJsonObject(raw);
  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch {
    throw new TranslateParseError("모델 응답이 JSON 형식이 아닙니다.");
  }
  const normalized = clampQuestions(data);
  const result = translateOutputSchema.safeParse(normalized);
  if (!result.success) {
    throw new TranslateParseError(
      `모델 응답이 스키마와 맞지 않습니다: ${result.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}`,
    );
  }
  return result.data;
}

export class TranslateParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranslateParseError";
  }
}

function extractJsonObject(raw: string): string {
  const stripped = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return stripped.trim();
  return stripped.slice(start, end + 1);
}

function clampQuestions(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.clarifying_questions)) return data;
  return {
    ...obj,
    clarifying_questions: obj.clarifying_questions.slice(0, MAX_CLARIFYING_QUESTIONS),
  };
}
