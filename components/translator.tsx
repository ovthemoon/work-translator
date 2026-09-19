"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RolePair } from "@/components/role-pair";
import { Segmented } from "@/components/segmented";
import { ResultView } from "@/components/result-view";
import { requestTranslate, type TranslateApiData } from "@/lib/translate/client";
import { DEPTHS, MAX_INPUT_CHARS, MODES, STYLES, type DepthId, type ModeId, type RoleId, type StyleId } from "@/lib/translate/roles";
import type { TranslateInput } from "@/lib/translate/schema";

const PLACEHOLDER: Record<ModeId, string> = {
  translate: "예: 급한 건 아닌데 이번 주 안에만 해주세요",
  reverse: "예: 그거 하려면 DB 구조를 좀 바꿔야 해서요",
};

type Status = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string } | { kind: "done"; input: TranslateInput; data: TranslateApiData };

export function Translator() {
  const [text, setText] = useState("");
  const [fromRole, setFromRole] = useState<RoleId>("client");
  const [toRole, setToRole] = useState<RoleId>("developer");
  const [depth, setDepth] = useState<DepthId>("practitioner");
  const [mode, setMode] = useState<ModeId>("translate");
  const [styleChoice, setStyleChoice] = useState<StyleId | null>(null);
  // 받는 사람이 개발자면 "개발자용 정리"가 기본. 사용자가 직접 고르면 그 선택을 유지한다.
  const style: StyleId = styleChoice ?? (toRole === "developer" ? "spec" : "explain");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const trimmed = text.trim();
  const overLimit = text.length > MAX_INPUT_CHARS;
  const canSubmit = trimmed.length > 0 && !overLimit && status.kind !== "loading";

  async function submit() {
    if (!canSubmit) return;
    const input: TranslateInput = { text: trimmed, fromRole, toRole, depth, mode, style };
    setStatus({ kind: "loading" });
    try {
      const data = await requestTranslate(input);
      setStatus({ kind: "done", input, data });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요." });
    }
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-6"
      >
        <Segmented label="모드" options={MODES} value={mode} onChange={setMode} />

        <RolePair fromRole={fromRole} toRole={toRole} mode={mode} onChange={(n) => { setFromRole(n.fromRole); setToRole(n.toRole); }} />

        <div>
          <label htmlFor="message" className="block text-sm text-muted-foreground">
            {mode === "translate" ? "받은 메시지" : "보내려는 메시지"}
          </label>
          <Textarea
            id="message"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void submit();
            }}
            placeholder={PLACEHOLDER[mode]}
            rows={6}
            aria-invalid={overLimit}
            className="mt-1 min-h-36 resize-y bg-card text-base leading-relaxed"
          />
          <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>⌘/Ctrl + Enter 로 바로 실행</span>
            <span className={overLimit ? "text-destructive" : undefined}>{text.length} / {MAX_INPUT_CHARS}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Segmented label="설명 깊이" options={DEPTHS} value={depth} onChange={setDepth} />
          {mode === "translate" && <Segmented label="번역 스타일" options={STYLES} value={style} onChange={setStyleChoice} />}
          <Button type="submit" disabled={!canSubmit} size="lg" className="ml-auto">
            {status.kind === "loading" ? (mode === "translate" ? "번역하는 중…" : "다듬는 중…") : mode === "translate" ? "번역하기" : "다듬기"}
          </Button>
        </div>
      </form>

      {status.kind === "error" && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {status.message}
        </p>
      )}

      {status.kind === "done" && <ResultView input={status.input} output={status.data.output} remaining={status.data.remaining} />}
    </div>
  );
}
