"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResultView } from "@/components/result-view";
import { roleLabel, type RoleId } from "@/lib/translate/roles";
import type { TranslateInput, TranslateOutput } from "@/lib/translate/schema";

type State = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string } | { kind: "done"; input: TranslateInput; output: TranslateOutput };

const TITLE: Partial<Record<RoleId, string>> = {
  developer: "개발자용으로 정리하기",
  designer: "디자이너용으로 정리하기",
  planner: "기획자용으로 정리하기",
  marketer: "마케터용으로 정리하기",
  executive: "결정할 것만 추리기",
  client: "쉬운 말로 풀어보기",
  newbie: "쉬운 말로 풀어보기",
};

export function SpecPanel({ state, myRole, onRequest }: { state: State; myRole: RoleId; onRequest: () => void }) {
  const title = TITLE[myRole] ?? `${roleLabel(myRole)}용으로 정리하기`;

  if (state.kind === "done") {
    return <ResultView input={state.input} output={state.output} remaining={-1} compact />;
  }

  return (
    <div className="rounded-xl border border-dashed border-border px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">해야 할 일, 정해지지 않은 것, 되물을 질문을 한 번에 뽑아요. 긴 메시지일수록 쓸모 있어요.</p>
        </div>
        <Button variant="outline" onClick={onRequest} disabled={state.kind === "loading"}>
          <ChevronDown className="size-4" />
          {state.kind === "loading" ? "정리하는 중… 5~10초" : "정리하기"}
        </Button>
      </div>
      {state.kind === "error" && <p role="alert" className="mt-3 text-sm text-destructive">{state.message}</p>}
    </div>
  );
}
