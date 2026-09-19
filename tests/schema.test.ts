import { describe, expect, test } from "vitest";
import {
  parseTranslateOutput,
  TranslateParseError,
  translateInputSchema,
} from "@/lib/translate/schema";

describe("parseTranslateOutput", () => {
  test("parses a clean JSON object", () => {
    const raw = JSON.stringify({
      translation: "여백을 늘려 달라는 뜻이에요.",
      split_requests: [],
      clarifying_questions: ["몇 px요?"],
      caution: null,
    });
    const out = parseTranslateOutput(raw);
    expect(out.translation).toBe("여백을 늘려 달라는 뜻이에요.");
    expect(out.clarifying_questions).toEqual(["몇 px요?"]);
    expect(out.caution).toBeNull();
  });

  test("strips markdown code fences around JSON", () => {
    const raw = '```json\n{"translation":"a","split_requests":[],"clarifying_questions":[],"caution":null}\n```';
    expect(parseTranslateOutput(raw).translation).toBe("a");
  });

  test("ignores chatter before and after the JSON object", () => {
    const raw = '알겠습니다. {"translation":"a","split_requests":[],"clarifying_questions":[],"caution":"b"} 끝.';
    expect(parseTranslateOutput(raw).caution).toBe("b");
  });

  test("fills defaults when optional arrays are missing", () => {
    const out = parseTranslateOutput('{"translation":"a"}');
    expect(out.split_requests).toEqual([]);
    expect(out.clarifying_questions).toEqual([]);
    expect(out.caution).toBeNull();
  });

  test("keeps only the first 3 clarifying questions", () => {
    const out = parseTranslateOutput(
      JSON.stringify({ translation: "a", clarifying_questions: ["1", "2", "3", "4"] }),
    );
    expect(out.clarifying_questions).toEqual(["1", "2", "3"]);
  });

  test("throws TranslateParseError on non-JSON", () => {
    expect(() => parseTranslateOutput("그냥 텍스트")).toThrow(TranslateParseError);
  });

  test("throws TranslateParseError when translation is empty", () => {
    expect(() => parseTranslateOutput('{"translation":""}')).toThrow(TranslateParseError);
  });
});

describe("translateInputSchema", () => {
  const base = { text: "로고만 살짝", fromRole: "client", toRole: "developer", depth: "simple" };

  test("accepts valid input and defaults mode to translate", () => {
    const r = translateInputSchema.parse(base);
    expect(r.mode).toBe("translate");
  });

  test("rejects text over 3000 chars", () => {
    expect(translateInputSchema.safeParse({ ...base, text: "가".repeat(3001) }).success).toBe(false);
  });

  test("rejects empty or whitespace text", () => {
    expect(translateInputSchema.safeParse({ ...base, text: "   " }).success).toBe(false);
  });

  test("rejects unknown role", () => {
    expect(translateInputSchema.safeParse({ ...base, fromRole: "ceo" }).success).toBe(false);
  });
});
