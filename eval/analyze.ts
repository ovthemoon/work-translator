/**
 * eval/out/*.jsonl 결과에 자동 점검을 돌려 요약을 출력한다.
 *   npx tsx eval/analyze.ts eval/out/<file>.jsonl
 *
 * 점검 항목 (규칙 위반 후보를 표시할 뿐, 최종 판단은 사람이 한다):
 *  - 실패/지연 통계
 *  - 질문 3개 초과, 존댓말(~요/~다) 미준수
 *  - 원문에 없는 숫자 등장 (지어내기 의심)
 *  - 반대로 보내기: 질문이 "~세요" 형태인지, 본문에 머리말/설명이 섞였는지
 *  - 비하 표현 후보
 */
import fs from "node:fs";

type Output = { translation: string; split_requests: string[]; clarifying_questions: string[]; caution: string | null };
type Row = { id: string; category: string; from_role: string; to_role: string; depth: string; mode: string; input: string; expect: string; output: Output | null; latency_ms: number; error: string };

const DEROGATORY = ["무식", "멍청", "한심", "게으", "무능", "답답한 사람", "꼰대", "노예", "갑질"];
const PREFACE = /^(다듬은|번역|수정된|메시지)\s*[:：]/;

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

function numbersIn(text: string): Set<string> {
  return new Set((text.match(/\d+/g) ?? []).map((n) => String(Number(n))));
}

function endsPolite(sentence: string): boolean {
  const s = sentence.trim().replace(/["'”’)]+$/, "");
  return /(요|다|죠|까|니다|세요|네요|어요|아요|에요)[.!?]?$/.test(s);
}

export function checkRow(r: Row): string[] {
  const flags: string[] = [];
  if (r.error || !r.output) return ["오류: " + r.error];
  const o = r.output;
  if (o.clarifying_questions.length > 3) flags.push("질문 3개 초과");
  const sentences = o.translation.split(/(?<=[.!?])\s+/).filter(Boolean);
  const impolite = sentences.filter((s) => !endsPolite(s));
  if (impolite.length > 0 && r.mode === "translate") flags.push(`존댓말 의심: "${impolite[0].slice(0, 30)}"`);
  const inputNums = numbersIn(r.input);
  const allText = [o.translation, ...o.split_requests, ...o.clarifying_questions, o.caution ?? ""].join(" ");
  const newNums = [...numbersIn(allText)].filter((n) => !inputNums.has(n) && !["1", "2", "3"].includes(n));
  if (newNums.length > 0) flags.push(`원문에 없는 숫자: ${newNums.join(",")}`);
  if (r.mode === "reverse") {
    const notDirective = o.clarifying_questions.filter((q) => !/(세요|하세요|십시오|정할 것|확인할 것)[.]?$/.test(q.trim()));
    if (notDirective.length > 0) flags.push(`반대로: 질문이 지시형 아님 "${notDirective[0].slice(0, 30)}"`);
    if (PREFACE.test(o.translation)) flags.push("반대로: 본문에 머리말");
    if (/\?$/.test(o.translation.trim()) && o.translation.length < 25) flags.push("반대로: 본문이 너무 짧음");
  }
  const hit = DEROGATORY.find((w) => allText.includes(w));
  if (hit) flags.push(`비하 후보: ${hit}`);
  if (o.translation.length < 15) flags.push("번역이 너무 짧음");
  if (o.translation.length > 400) flags.push("번역이 너무 김");
  return flags;
}

function main() {
  const file = process.argv[2];
  if (!file) throw new Error("usage: tsx eval/analyze.ts <results.jsonl>");
  const rows: Row[] = fs.readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const ok = rows.filter((r) => !r.error && r.output);
  const lat = ok.map((r) => r.latency_ms);
  console.log(`총 ${rows.length}개 · 성공 ${ok.length} · 실패 ${rows.length - ok.length}`);
  console.log(`지연 평균 ${Math.round(lat.reduce((a, b) => a + b, 0) / Math.max(1, lat.length))}ms · p50 ${percentile(lat, 50)}ms · p95 ${percentile(lat, 95)}ms · 최대 ${Math.max(...lat)}ms`);
  const qCount = ok.map((r) => r.output!.clarifying_questions.length);
  console.log(`질문 수 분포: 0개 ${qCount.filter((n) => n === 0).length} · 1개 ${qCount.filter((n) => n === 1).length} · 2개 ${qCount.filter((n) => n === 2).length} · 3개 ${qCount.filter((n) => n === 3).length}`);
  console.log(`주의(caution) 있음 ${ok.filter((r) => r.output!.caution).length} · 요청 분리 사용 ${ok.filter((r) => r.output!.split_requests.length > 0).length}`);
  const avgLen = Math.round(ok.reduce((s, r) => s + r.output!.translation.length, 0) / Math.max(1, ok.length));
  console.log(`번역 길이 평균 ${avgLen}자`);

  console.log("\n카테고리별 (건수 / 평균 지연 / 질문 평균 / 주의 비율)");
  const cats = [...new Set(rows.map((r) => r.category))];
  for (const c of cats) {
    const rs = ok.filter((r) => r.category === c);
    const q = rs.reduce((s, r) => s + r.output!.clarifying_questions.length, 0) / Math.max(1, rs.length);
    const cau = rs.filter((r) => r.output!.caution).length;
    const l = Math.round(rs.reduce((s, r) => s + r.latency_ms, 0) / Math.max(1, rs.length));
    console.log(`  ${c.padEnd(12)} ${String(rs.length).padStart(2)} / ${l}ms / ${q.toFixed(1)} / ${Math.round((100 * cau) / Math.max(1, rs.length))}%`);
  }

  console.log("\n자동 점검 표시");
  let flagged = 0;
  for (const r of rows) {
    const flags = checkRow(r);
    if (flags.length === 0) continue;
    flagged += 1;
    console.log(`- ${r.id} [${r.mode}] 「${r.input.slice(0, 40)}」 → ${flags.join(" / ")}`);
  }
  console.log(`표시된 항목 ${flagged}/${rows.length}`);
}

main();
