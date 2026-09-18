import fs from "node:fs";
import path from "node:path";
import type { ChatMessage } from "@/lib/llm/provider";
import { depthLabel, roleLabel, type DepthId, type ModeId, type RoleId } from "./roles";
import type { TranslateInput, TranslateOutput } from "./schema";

export type Example = {
  id: string;
  from_role: RoleId;
  to_role: RoleId;
  depth: DepthId;
  mode: ModeId;
  input: string;
  output: TranslateOutput;
};

const ROOT = process.cwd();
const PROMPT_FILES: Record<ModeId, string> = {
  translate: path.join(ROOT, "prompts", "translate.system.md"),
  reverse: path.join(ROOT, "prompts", "reverse.system.md"),
};
const EXAMPLES_FILE = path.join(ROOT, "data", "examples.json");

const fileCache = new Map<string, string>();

function readCached(file: string): string {
  const hit = fileCache.get(file);
  if (hit !== undefined) return hit;
  const content = fs.readFileSync(file, "utf8");
  fileCache.set(file, content);
  return content;
}

export function loadExamples(): Example[] {
  return JSON.parse(readCached(EXAMPLES_FILE)) as Example[];
}

export function loadSystemPrompt(mode: ModeId, input: Pick<TranslateInput, "fromRole" | "toRole" | "depth">): string {
  return readCached(PROMPT_FILES[mode])
    .replaceAll("{{FROM_ROLE}}", roleLabel(input.fromRole))
    .replaceAll("{{TO_ROLE}}", roleLabel(input.toRole))
    .replaceAll("{{DEPTH}}", depthLabel(input.depth));
}

function formatUserTurn(input: Pick<TranslateInput, "text" | "fromRole" | "toRole" | "depth">): string {
  return [
    `[보낸 사람: ${roleLabel(input.fromRole)} → 받는 사람: ${roleLabel(input.toRole)} | 깊이: ${depthLabel(input.depth)}]`,
    input.text,
  ].join("\n");
}

/**
 * 시스템 프롬프트 + few-shot 예시(user/assistant 쌍) + 실제 입력 순서로 메시지를 조립한다.
 * 예시는 같은 모드의 것만 사용한다.
 */
export function buildMessages(input: TranslateInput, examples: Example[] = loadExamples()): ChatMessage[] {
  const system: ChatMessage = { role: "system", content: loadSystemPrompt(input.mode, input) };
  const shots = examples
    .filter((ex) => ex.mode === input.mode)
    .flatMap<ChatMessage>((ex) => [
      { role: "user", content: formatUserTurn({ text: ex.input, fromRole: ex.from_role, toRole: ex.to_role, depth: ex.depth }) },
      { role: "assistant", content: JSON.stringify(ex.output) },
    ]);
  return [system, ...shots, { role: "user", content: formatUserTurn(input) }];
}
