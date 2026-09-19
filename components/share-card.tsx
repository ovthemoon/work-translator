"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { ImageDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { roleLabel } from "@/lib/translate/roles";
import type { TranslateInput, TranslateOutput } from "@/lib/translate/schema";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
const CARD_WIDTH = 640;
const FILE_NAME = "업무용어번역.png";

type Props = { input: TranslateInput; output: TranslateOutput };

async function blobFromDataUrl(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export function ShareCardButton({ input, output }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function exportCard() {
    if (!cardRef.current || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: "#ffffff" });
      const blob = await blobFromDataUrl(dataUrl);
      const file = new File([blob], FILE_NAME, { type: "image/png" });
      if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "업무 용어 번역기" });
        setNote("공유했어요.");
        return;
      }
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = FILE_NAME;
      a.click();
      setNote("이미지를 저장했어요.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setNote("이미지를 만들지 못했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={exportCard} disabled={busy}>
        <ImageDown className="size-4" />
        {busy ? "이미지 만드는 중…" : "이미지로 저장·공유"}
      </Button>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}

      {/* 화면 밖에서 렌더링되는 공유 카드. 스타일은 폰트 로딩 실패에도 깨지지 않도록 인라인. */}
      <div aria-hidden className="pointer-events-none fixed top-0 -left-[10000px]">
        <div
          ref={cardRef}
          style={{
            width: CARD_WIDTH,
            padding: "36px 40px",
            background: "#ffffff",
            color: "#1a2440",
            fontFamily: "'Pretendard Variable', Pretendard, -apple-system, system-ui, 'Apple SD Gothic Neo', sans-serif",
            lineHeight: 1.6,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#5f6676" }}>
            <span style={{ fontWeight: 600 }}>업무 용어 번역기</span>
            <span>{roleLabel(input.fromRole)} → {roleLabel(input.toRole)}</span>
          </div>

          <div style={{ marginTop: 22, fontSize: 13, color: "#5f6676" }}>원문</div>
          <div style={{ marginTop: 4, fontSize: 17, borderLeft: "3px solid #d9dde5", paddingLeft: 12, whiteSpace: "pre-wrap" }}>{input.text}</div>

          <div style={{ marginTop: 22, fontSize: 13, color: "#5f6676" }}>
            <span style={{ background: "linear-gradient(transparent 55%, #ffe45c 55%, #ffe45c 92%, transparent 92%)", padding: "0 2px", color: "#1a2440", fontWeight: 600 }}>
              {input.mode === "reverse" ? "이렇게 보내 보세요" : input.style === "spec" ? "개발자용으로 정리하면" : input.style === "honest" ? "속마음은 이래요" : "이런 뜻이에요"}
            </span>
          </div>
          <div style={{ marginTop: 6, fontSize: input.style === "spec" && input.mode !== "reverse" ? 15 : 21, fontWeight: input.style === "spec" && input.mode !== "reverse" ? 500 : 600, whiteSpace: "pre-wrap" }}>{output.translation}</div>

          {output.clarifying_questions.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, color: "#5f6676" }}>{input.mode === "reverse" ? "보내기 전에 정할 것" : "되물어 볼 것"}</div>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 15 }}>
                {output.clarifying_questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          {output.caution && (
            <div style={{ marginTop: 20, background: "#fff4e5", color: "#9a4a05", borderRadius: 10, padding: "10px 14px", fontSize: 14 }}>
              {output.caution}
            </div>
          )}

          <div style={{ marginTop: 28, paddingTop: 14, borderTop: "1px solid #d9dde5", fontSize: 13, color: "#5f6676", display: "flex", justifyContent: "space-between" }}>
            <span>직군이 다르면 같은 말도 다르게 들려요</span>
            <span style={{ fontWeight: 600, color: "#2456e6" }}>{SITE_HOST}</span>
          </div>
        </div>
      </div>
    </>
  );
}
