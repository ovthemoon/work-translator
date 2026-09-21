"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { ShareCardButton } from "@/components/share-card";
import { ShareLinkButton } from "@/components/share-link-button";
import { FeedbackBar } from "@/components/feedback-bar";
import { roleLabel } from "@/lib/translate/roles";
import type { TranslateInput, TranslateOutput } from "@/lib/translate/schema";

type Props = { input: TranslateInput; output: TranslateOutput };

export function HonestCard({ input, output }: Props) {
  const [copied, setCopied] = useState(false);
  const caption = `"${input.text}"\n→ ${output.translation}\n\n${roleLabel(input.fromRole)}의 말, 번역해봄`;

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section aria-live="polite" className="rounded-xl border border-border bg-card p-5 sm:p-7">
      <p className="text-sm text-muted-foreground">{roleLabel(input.fromRole)}의 말</p>
      <p className="mt-1 text-lg leading-snug text-foreground/80 whitespace-pre-wrap">“{input.text}”</p>

      <p className="mt-6 text-sm text-muted-foreground"><span className="mark font-semibold text-foreground">속마음</span></p>
      <p className="mt-2 text-2xl font-bold leading-snug sm:text-[28px] whitespace-pre-wrap">{output.translation}</p>

      {output.clarifying_questions.length > 0 && (
        <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
          되물어 볼 것: {output.clarifying_questions[0]}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-5">
        <ShareCardButton input={input} output={output} />
        <ShareLinkButton input={input} output={output} />
        <button
          type="button"
          onClick={copyCaption}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "복사됨" : "글로 복사"}
        </button>
      </div>

      <FeedbackBar input={input} output={output} />
    </section>
  );
}
