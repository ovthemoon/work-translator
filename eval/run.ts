/**
 * examples.json 전체를 LLM 에 돌려 결과를 CSV 로 저장한다.
 *
 *   npm run eval                       # 기본 모델 (UPSTAGE_MODEL)
 *   npm run eval -- --model solar-pro3 # 모델 바꿔서 비교
 *   npm run eval -- --limit 2          # 앞 2개만
 *
 * 출력: eval/out/<model>-<timestamp>.csv
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });
import fs from "node:fs";
import path from "node:path";
import { getLlmProvider } from "@/lib/llm";
import { loadExamples } from "@/lib/translate/prompt";
import { translate } from "@/lib/translate/translate";

type Args = { model?: string; limit?: number };

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--model") args.model = argv[i + 1];
    if (argv[i] === "--limit") args.limit = Number(argv[i + 1]);
  }
  return args;
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : Array.isArray(value) ? value.join(" | ") : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

const HEADER = [
  "id", "from_role", "to_role", "depth", "mode", "input",
  "expected_translation", "translation", "split_requests", "clarifying_questions", "caution",
  "model", "latency_ms", "prompt_tokens", "completion_tokens", "error",
];

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const provider = getLlmProvider(args.model ? { model: args.model } : undefined);
  const examples = loadExamples().slice(0, args.limit ?? Infinity);
  const rows: string[] = [HEADER.join(",")];

  console.log(`model=${provider.model} examples=${examples.length}`);
  for (const ex of examples) {
    const input = { text: ex.input, fromRole: ex.from_role, toRole: ex.to_role, depth: ex.depth, mode: ex.mode };
    try {
      const r = await translate(input, provider);
      rows.push([
        ex.id, ex.from_role, ex.to_role, ex.depth, ex.mode, ex.input,
        ex.output.translation, r.output.translation, r.output.split_requests, r.output.clarifying_questions, r.output.caution,
        r.model, r.latencyMs, r.usage?.promptTokens, r.usage?.completionTokens, "",
      ].map(csvCell).join(","));
      console.log(`✓ ${ex.id} (${r.latencyMs}ms)\n  ${r.output.translation}\n  Q: ${r.output.clarifying_questions.join(" / ") || "-"}\n  ⚠ ${r.output.caution ?? "-"}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      rows.push([ex.id, ex.from_role, ex.to_role, ex.depth, ex.mode, ex.input, ex.output.translation, "", "", "", "", provider.model, "", "", "", message].map(csvCell).join(","));
      console.log(`✗ ${ex.id}: ${message}`);
    }
  }

  const outDir = path.join(process.cwd(), "eval", "out");
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(outDir, `${provider.model}-${stamp}.csv`);
  fs.writeFileSync(file, "﻿" + rows.join("\n"), "utf8");
  console.log(`saved: ${path.relative(process.cwd(), file)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
