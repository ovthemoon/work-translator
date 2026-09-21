"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HonestCard } from "@/components/honest-card";
import { SpecPanel } from "@/components/spec-panel";
import { useMyRole } from "@/lib/my-role-store";
import { requestTranslate } from "@/lib/translate/client";
import { MAX_INPUT_CHARS, ROLES, type RoleId } from "@/lib/translate/roles";
import type { TranslateInput, TranslateOutput } from "@/lib/translate/schema";

const PLACEHOLDER = "예: 급한 건 아닌데 이번 주 안에만 해주세요\n\n긴 메시지도 그대로 붙여넣어 보세요. 기획서, 이메일, 카톡 전부 돼요.";

type HonestState = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string } | { kind: "done"; input: TranslateInput; output: TranslateOutput };
type SpecState = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string } | { kind: "done"; input: TranslateInput; output: TranslateOutput };

function RoleSelect({ id, label, value, onChange, className }: { id: string; label: string; value: RoleId; onChange: (v: RoleId) => void; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm text-muted-foreground">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as RoleId)} className="role-select mt-1 text-2xl sm:text-[28px]">
        {ROLES.map((r) => (
          <option key={r.id} value={r.id}>{r.label}</option>
        ))}
      </select>
    </div>
  );
}

export function Translator() {
  const [text, setText] = useState("");
  const [fromRole, setFromRole] = useState<RoleId>("client");
  const [myRole, changeMyRole] = useMyRole();
  const [honest, setHonest] = useState<HonestState>({ kind: "idle" });
  const [spec, setSpec] = useState<SpecState>({ kind: "idle" });

  const trimmed = text.trim();
  const overLimit = text.length > MAX_INPUT_CHARS;
  const canSubmit = trimmed.length > 0 && !overLimit && honest.kind !== "loading";

  async function submitHonest() {
    if (!canSubmit) return;
    const input: TranslateInput = { text: trimmed, fromRole, toRole: myRole, depth: "practitioner", mode: "translate", style: "honest" };
    setHonest({ kind: "loading" });
    setSpec({ kind: "idle" });
    try {
      const data = await requestTranslate(input);
      setHonest({ kind: "done", input, output: data.output });
    } catch (error) {
      setHonest({ kind: "error", message: error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요." });
    }
  }

  async function submitSpec() {
    if (honest.kind !== "done" || spec.kind === "loading") return;
    const input: TranslateInput = { ...honest.input, style: "spec" };
    setSpec({ kind: "loading" });
    try {
      const data = await requestTranslate(input);
      setSpec({ kind: "done", input, output: data.output });
    } catch (error) {
      setSpec({ kind: "error", message: error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요." });
    }
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submitHonest();
        }}
        className="space-y-6"
      >
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <RoleSelect id="from-role" label="이 말을 한 사람" value={fromRole} onChange={setFromRole} className="min-w-0" />
          <span className="mb-1 text-2xl text-muted-foreground">→</span>
          <RoleSelect id="my-role" label="나" value={myRole} onChange={changeMyRole} className="min-w-0" />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm text-muted-foreground">받은 말</label>
          <Textarea
            id="message"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void submitHonest();
            }}
            placeholder={PLACEHOLDER}
            rows={5}
            aria-invalid={overLimit}
            className="mt-1 min-h-32 resize-y bg-card text-base leading-relaxed"
          />
          <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>⌘/Ctrl + Enter</span>
            <span className={overLimit ? "text-destructive" : undefined}>{text.length} / {MAX_INPUT_CHARS}</span>
          </div>
        </div>

        <Button type="submit" disabled={!canSubmit} size="lg" className="w-full sm:w-auto">
          {honest.kind === "loading" ? "속마음 읽는 중…" : "속마음 보기"}
        </Button>
      </form>

      {honest.kind === "error" && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{honest.message}</p>
      )}

      {honest.kind === "done" && (
        <>
          <HonestCard input={honest.input} output={honest.output} />
          <SpecPanel state={spec} myRole={myRole} onRequest={submitSpec} />
        </>
      )}
    </div>
  );
}
