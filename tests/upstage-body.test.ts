import { describe, expect, test } from "vitest";
import { buildChatBody, reasoningParams } from "@/lib/llm/upstage";

const request = { messages: [{ role: "user" as const, content: "hi" }], jsonSchema: { name: "x", schema: { type: "object" } } };

describe("reasoningParams", () => {
  test("Upstage direct uses reasoning_effort including none", () => {
    expect(reasoningParams("none", "https://api.upstage.ai/v1")).toEqual({ reasoning_effort: "none" });
  });

  test("OpenRouter disables reasoning for none/minimal", () => {
    expect(reasoningParams("none", "https://openrouter.ai/api/v1")).toEqual({ reasoning: { enabled: false } });
  });

  test("OpenRouter passes effort otherwise", () => {
    expect(reasoningParams("high", "https://openrouter.ai/api/v1")).toEqual({ reasoning: { effort: "high" } });
  });

  test("empty effort sends nothing", () => {
    expect(reasoningParams("", "https://api.upstage.ai/v1")).toEqual({});
    expect(reasoningParams(undefined, "https://openrouter.ai/api/v1")).toEqual({});
  });
});

describe("buildChatBody", () => {
  test("includes strict json_schema response_format when requested", () => {
    const body = buildChatBody(request, { model: "upstage/solar-pro4", baseURL: "https://openrouter.ai/api/v1", reasoningEffort: "none" });
    expect(body.model).toBe("upstage/solar-pro4");
    expect(body.response_format).toEqual({ type: "json_schema", json_schema: { name: "x", schema: { type: "object" }, strict: true } });
    expect((body as unknown as Record<string, unknown>).reasoning).toEqual({ enabled: false });
    expect((body as unknown as Record<string, unknown>).reasoning_effort).toBeUndefined();
  });
});
