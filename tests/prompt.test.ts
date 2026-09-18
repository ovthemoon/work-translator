import { describe, expect, test } from "vitest";
import { buildMessages } from "@/lib/translate/prompt";

describe("buildMessages", () => {
  test("fills role and depth placeholders into the system prompt", () => {
    const msgs = buildMessages({
      text: "안녕",
      fromRole: "client",
      toRole: "developer",
      depth: "simple",
      mode: "translate",
      style: "explain",
    });
    const system = msgs[0];
    expect(system.role).toBe("system");
    expect(system.content).toContain("클라이언트(비개발자)");
    expect(system.content).toContain("개발자");
    expect(system.content).toContain("아주 쉽게");
    expect(system.content).not.toContain("{{");
  });

  test("inserts few-shot examples as user/assistant pairs before the real input", () => {
    const msgs = buildMessages({
      text: "안녕",
      fromRole: "client",
      toRole: "developer",
      depth: "simple",
      mode: "translate",
      style: "explain",
    });
    const roles = msgs.map((m) => m.role);
    expect(roles[0]).toBe("system");
    expect(roles.slice(1, -1).every((r, i) => r === (i % 2 === 0 ? "user" : "assistant"))).toBe(true);
    expect(roles.at(-1)).toBe("user");
    expect(msgs.at(-1)?.content).toContain("안녕");
    // examples are valid JSON on the assistant side
    const firstAssistant = msgs.find((m) => m.role === "assistant");
    expect(() => JSON.parse(firstAssistant!.content)).not.toThrow();
  });

  test("uses the reverse prompt in reverse mode", () => {
    const msgs = buildMessages({
      text: "안녕",
      fromRole: "developer",
      toRole: "executive",
      depth: "practitioner",
      mode: "reverse",
      style: "explain",
    });
    expect(msgs[0].content).toContain("다듬어");
  });

  test("uses the honest prompt and only honest examples in honest style", () => {
    const msgs = buildMessages({
      text: "안녕",
      fromRole: "client",
      toRole: "developer",
      depth: "simple",
      mode: "translate",
      style: "honest",
    });
    expect(msgs[0].content).toContain("속마음");
    const assistants = msgs.filter((m) => m.role === "assistant").map((m) => JSON.parse(m.content).translation as string);
    expect(assistants.length).toBeGreaterThan(0);
    expect(assistants.some((t) => t.includes("라는 뜻이에요"))).toBe(false);
  });

  test("ignores style in reverse mode", () => {
    const a = buildMessages({ text: "안녕", fromRole: "developer", toRole: "client", depth: "simple", mode: "reverse", style: "honest" });
    const b = buildMessages({ text: "안녕", fromRole: "developer", toRole: "client", depth: "simple", mode: "reverse", style: "explain" });
    expect(a).toEqual(b);
  });
});
