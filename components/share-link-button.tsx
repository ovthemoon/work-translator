"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TranslateInput, TranslateOutput } from "@/lib/translate/schema";

type State = { kind: "idle" } | { kind: "loading" } | { kind: "done"; url: string; copied: boolean } | { kind: "error"; message: string };

/** "링크 만들기". 누를 때만 서버에 (개인정보를 가린) 카드가 저장된다. */
export function ShareLinkButton({ input, output }: { input: TranslateInput; output: TranslateOutput }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function create() {
    if (state.kind === "loading") return;
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input, output }) });
      const json = (await res.json()) as { success: boolean; data: { url: string } | null; error: string | null };
      if (!json.success || !json.data) throw new Error(json.error ?? "링크를 만들지 못했어요.");
      const url = json.data.url;
      let copied = false;
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch {
        copied = false;
      }
      setState({ kind: "done", url, copied });
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : "링크를 만들지 못했어요." });
    }
  }

  if (state.kind === "done") {
    return (
      <span className="inline-flex flex-wrap items-center gap-2 text-sm">
        <a href={state.url} target="_blank" rel="noreferrer" className="font-medium text-primary underline underline-offset-4">{state.url.replace(/^https?:\/\//, "")}</a>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Check className="size-3.5" />
          {state.copied ? "복사됨" : "링크 생성됨"}
        </span>
      </span>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={create} disabled={state.kind === "loading"}>
        <Link2 className="size-4" />
        {state.kind === "loading" ? "만드는 중…" : "링크 만들기"}
      </Button>
      {state.kind === "error" && <span className="text-xs text-destructive">{state.message}</span>}
    </>
  );
}
