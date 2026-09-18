"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { sendFeedback } from "@/lib/translate/client";
import type { TranslateInput, TranslateOutput } from "@/lib/translate/schema";

type Rating = "up" | "down";
type Stage = { kind: "ask" } | { kind: "consent"; rating: Rating } | { kind: "sending" } | { kind: "done"; message: string };

export function FeedbackBar({ input, output }: { input: TranslateInput; output: TranslateOutput }) {
  const [stage, setStage] = useState<Stage>({ kind: "ask" });
  const [consent, setConsent] = useState(false);

  async function submit(rating: Rating, agreed: boolean) {
    setStage({ kind: "sending" });
    try {
      const result = await sendFeedback({ input, output, rating, consent: agreed });
      setStage({
        kind: "done",
        message: result.stored ? "고마워요. 개인정보를 가린 사례가 저장됐어요." : "고마워요. 이 사례는 저장하지 않았어요.",
      });
    } catch (error) {
      setStage({ kind: "done", message: error instanceof Error ? error.message : "피드백을 보내지 못했어요." });
    }
  }

  if (stage.kind === "done") {
    return <p className="mt-5 text-sm text-muted-foreground">{stage.message}</p>;
  }

  if (stage.kind === "sending") {
    return <p className="mt-5 text-sm text-muted-foreground">보내는 중…</p>;
  }

  if (stage.kind === "consent") {
    return (
      <div className="mt-5 rounded-lg bg-muted p-4 text-sm">
        <div className="flex items-start gap-2.5">
          <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
          <Label htmlFor="consent" className="leading-relaxed font-normal">
            이 사례를 서비스 개선에 사용해도 될까요? 저장 전에 이름·전화번호·이메일·회사명은 [이름], [번호] 같은 표시로 바꿔요.
          </Label>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={() => submit(stage.rating, consent)}>
            {consent ? "동의하고 보내기" : "저장 없이 보내기"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setStage({ kind: "ask" })}>취소</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
      <span>이 결과가 도움이 됐나요?</span>
      <Button size="sm" variant="outline" onClick={() => setStage({ kind: "consent", rating: "up" })} aria-label="도움이 됐어요">
        <ThumbsUp className="size-4" />
      </Button>
      <Button size="sm" variant="outline" onClick={() => setStage({ kind: "consent", rating: "down" })} aria-label="아쉬워요">
        <ThumbsDown className="size-4" />
      </Button>
    </div>
  );
}
