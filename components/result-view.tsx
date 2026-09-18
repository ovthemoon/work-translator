"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { FeedbackBar } from "@/components/feedback-bar";
import { ShareCardButton } from "@/components/share-card";
import { roleLabel } from "@/lib/translate/roles";
import type { TranslateInput, TranslateOutput } from "@/lib/translate/schema";

type Props = { input: TranslateInput; output: TranslateOutput; remaining: number };

function CopyButton({ text, label = "복사" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "복사됨" : label}
    </button>
  );
}

export function ResultView({ input, output, remaining }: Props) {
  const isReverse = input.mode === "reverse";
  const heading = isReverse ? "이렇게 보내 보세요" : input.style === "honest" ? "속마음은 이래요" : "이런 뜻이에요";
  return (
    <section aria-live="polite" className="rounded-xl border border-border bg-card p-5 sm:p-7">
      <p className="text-sm text-muted-foreground">
        {roleLabel(input.fromRole)} → {roleLabel(input.toRole)}
      </p>
      <blockquote className="mt-2 border-l-2 border-border pl-3 text-[15px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
        {input.text}
      </blockquote>

      <h2 className="mt-7 text-base font-semibold">
        <span className="mark">{heading}</span>
      </h2>
      <p className="mt-3 text-lg leading-relaxed sm:text-xl whitespace-pre-wrap">{output.translation}</p>
      <div className="mt-2">
        <CopyButton text={output.translation} label={isReverse ? "메시지 복사" : "번역 복사"} />
      </div>

      {output.split_requests.length > 0 && (
        <div className="mt-7">
          <h3 className="text-base font-semibold">요청은 사실 {output.split_requests.length}개예요</h3>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-relaxed">
            {output.split_requests.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        </div>
      )}

      {output.clarifying_questions.length > 0 && (
        <div className="mt-7">
          <h3 className="text-base font-semibold">{isReverse ? "보내기 전에 정할 것" : "이렇게 되물어 보세요"}</h3>
          <ul className="mt-2 space-y-2">
            {output.clarifying_questions.map((q, i) => (
              <li key={i} className="flex items-start justify-between gap-3 rounded-lg bg-accent px-3 py-2 leading-relaxed">
                <span>{q}</span>
                <CopyButton text={q} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {output.caution && (
        <div className="mt-7 rounded-lg px-4 py-3 leading-relaxed" style={{ background: "var(--caution-bg)", color: "var(--caution)" }}>
          <strong className="font-semibold">일정·범위·비용 주의</strong>
          <p className="mt-1">{output.caution}</p>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <ShareCardButton input={input} output={output} />
        <span className="ml-auto text-xs text-muted-foreground">오늘 남은 횟수 {remaining}회</span>
      </div>

      <FeedbackBar input={input} output={output} />
    </section>
  );
}

