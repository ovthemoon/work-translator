/**
 * 갤러리 씨앗 만들기: 고른 문구를 속마음 번역 → 공유 링크로 저장한다.
 *
 *   npm run seed:gallery -- --remote https://translate.opendesk.page   # 배포 서비스에 (Supabase 연결 후)
 *   npm run seed:gallery -- --remote http://localhost:3111             # 로컬 메모리 저장소에
 *
 * EVAL_BYPASS_TOKEN 이 있으면 번역 한도를 건너뛴다. 공유 링크 생성은 /api/share 를 그대로 타므로 마스킹도 그대로 적용된다.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });
import fs from "node:fs";
import path from "node:path";

type Seed = { from_role: string; to_role: string; input: string };

function parseArgs(argv: string[]): { remote: string; file: string } {
  let remote = "";
  let file = path.join("eval", "gallery-seeds.json");
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--remote") remote = argv[i + 1];
    if (argv[i] === "--file") file = argv[i + 1];
  }
  if (!remote) throw new Error("--remote <url> 이 필요합니다");
  return { remote: remote.replace(/\/$/, ""), file };
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json", "user-agent": "Mozilla/5.0 work-translator-seed" };
  if (process.env.EVAL_BYPASS_TOKEN) headers["x-eval-token"] = process.env.EVAL_BYPASS_TOKEN;
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const json = (await res.json()) as { success: boolean; data: T | null; error: string | null };
  if (!json.success || !json.data) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json.data;
}

async function main() {
  const { remote, file } = parseArgs(process.argv.slice(2));
  const seeds = JSON.parse(fs.readFileSync(file, "utf8")) as Seed[];
  console.log(`target=${remote} seeds=${seeds.length}`);
  let ok = 0;
  for (const s of seeds) {
    const input = { text: s.input, fromRole: s.from_role, toRole: s.to_role, depth: "practitioner", mode: "translate", style: "honest" };
    try {
      const t = await post<{ output: unknown }>(`${remote}/api/translate`, input);
      const share = await post<{ url: string }>(`${remote}/api/share`, { input, output: t.output });
      ok += 1;
      console.log(`✓ ${share.url}  「${s.input.slice(0, 30)}」`);
    } catch (error) {
      console.log(`✗ 「${s.input.slice(0, 30)}」 ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log(`done ${ok}/${seeds.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
