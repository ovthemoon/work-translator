/**
 * 문구 세트를 LLM 에 돌려 결과를 CSV + JSONL 로 저장한다.
 *
 *   npm run eval                                  # data/examples.json, 로컬 provider (UPSTAGE_API_KEY 필요)
 *   npm run eval -- --model solar-pro3            # 모델 바꿔서 비교
 *   npm run eval -- --set eval/phrases.json       # 다른 문구 세트
 *   npm run eval -- --remote https://work-translator.vercel.app   # 배포된 API 로 실행 (키 불필요)
 *   npm run eval -- --limit 5
 *
 * 원격 모드는 EVAL_BYPASS_TOKEN 환경변수가 있으면 x-eval-token 헤더로 보내 한도·캐시를 건너뛴다.
 * 출력: eval/out/<label>-<timestamp>.csv, .jsonl
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });
import fs from "node:fs";
import path from "node:path";
import { getLlmProvider } from "@/lib/llm";
import { loadExamples } from "@/lib/translate/prompt";
import { translateOutputSchema, type TranslateInput, type TranslateOutput } from "@/lib/translate/schema";
import { translate } from "@/lib/translate/translate";

type Args = { model?: string; limit?: number; set?: string; remote?: string };

type Phrase = {
  id: string;
  from_role: TranslateInput["fromRole"];
  to_role: TranslateInput["toRole"];
  depth: TranslateInput["depth"];
  mode: TranslateInput["mode"];
  input: string;
  category?: string;
  expect?: string;
  output?: TranslateOutput;
};

type RunResult = {
  id: string;
  category: string;
  from_role: string;
  to_role: string;
  depth: string;
  mode: string;
  input: string;
  expect: string;
  output: TranslateOutput | null;
  model: string;
  latency_ms: number;
  error: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--model") args.model = argv[i + 1];
    if (argv[i] === "--limit") args.limit = Number(argv[i + 1]);
    if (argv[i] === "--set") args.set = argv[i + 1];
    if (argv[i] === "--remote") args.remote = argv[i + 1];
  }
  return args;
}

function loadPhrases(file?: string): Phrase[] {
  if (!file) return loadExamples() as Phrase[];
  return JSON.parse(fs.readFileSync(path.resolve(file), "utf8")) as Phrase[];
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : Array.isArray(value) ? value.join(" | ") : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

async function runRemote(base: string, input: TranslateInput): Promise<{ output: TranslateOutput; model: string }> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": "Mozilla/5.0 work-translator-eval",
  };
  if (process.env.EVAL_BYPASS_TOKEN) headers["x-eval-token"] = process.env.EVAL_BYPASS_TOKEN;
  const res = await fetch(`${base.replace(/\/$/, "")}/api/translate`, { method: "POST", headers, body: JSON.stringify(input) });
  const envelope = (await res.json()) as { success: boolean; data: { output: unknown } | null; error: string | null };
  if (!envelope.success || !envelope.data) throw new Error(envelope.error ?? `HTTP ${res.status}`);
  return { output: translateOutputSchema.parse(envelope.data.output), model: "remote" };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const phrases = loadPhrases(args.set).slice(0, args.limit ?? Infinity);
  const provider = args.remote ? null : getLlmProvider(args.model ? { model: args.model } : undefined);
  const label = args.remote ? new URL(args.remote).hostname : provider!.model.replaceAll("/", "_");
  const results: RunResult[] = [];

  console.log(`target=${args.remote ?? provider!.model} phrases=${phrases.length}`);
  for (const p of phrases) {
    const input: TranslateInput = { text: p.input, fromRole: p.from_role, toRole: p.to_role, depth: p.depth, mode: p.mode ?? "translate" };
    const started = Date.now();
    const base = { id: p.id, category: p.category ?? "", from_role: p.from_role, to_role: p.to_role, depth: p.depth, mode: input.mode, input: p.input, expect: p.expect ?? "" };
    try {
      const r = args.remote ? await runRemote(args.remote, input) : await translate(input, provider!);
      results.push({ ...base, output: r.output, model: r.model, latency_ms: Date.now() - started, error: "" });
      console.log(`✓ ${p.id} (${Date.now() - started}ms) ${r.output.translation.slice(0, 60)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ ...base, output: null, model: label, latency_ms: Date.now() - started, error: message });
      console.log(`✗ ${p.id}: ${message}`);
    }
  }

  const outDir = path.join(process.cwd(), "eval", "out");
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const HEADER = ["id", "category", "from_role", "to_role", "depth", "mode", "input", "expect", "translation", "split_requests", "clarifying_questions", "caution", "model", "latency_ms", "error"];
  const rows = results.map((r) =>
    [r.id, r.category, r.from_role, r.to_role, r.depth, r.mode, r.input, r.expect, r.output?.translation, r.output?.split_requests, r.output?.clarifying_questions, r.output?.caution, r.model, r.latency_ms, r.error].map(csvCell).join(","),
  );
  const csvFile = path.join(outDir, `${label}-${stamp}.csv`);
  fs.writeFileSync(csvFile, "﻿" + [HEADER.join(","), ...rows].join("\n"), "utf8");
  fs.writeFileSync(csvFile.replace(/\.csv$/, ".jsonl"), results.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  const ok = results.filter((r) => !r.error).length;
  const avg = Math.round(results.filter((r) => !r.error).reduce((s, r) => s + r.latency_ms, 0) / Math.max(1, ok));
  console.log(`done: ${ok}/${results.length} ok, avg ${avg}ms\nsaved: ${path.relative(process.cwd(), csvFile)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
