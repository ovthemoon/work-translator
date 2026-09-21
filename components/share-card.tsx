"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { ImageDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { roleLabel } from "@/lib/translate/roles";
import type { TranslateInput, TranslateOutput } from "@/lib/translate/schema";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
const CARD_WIDTH = 540;
const CARD_HEIGHT = 675; // 4:5 세로. 인스타·스레드·카톡 미리보기에 맞는 비율
const FILE_NAME = "속마음번역.png";
const FONT = "'Pretendard Variable', Pretendard, -apple-system, system-ui, 'Apple SD Gothic Neo', sans-serif";

type Props = { input: TranslateInput; output: TranslateOutput };

function fontSizeFor(text: string, base: number, min: number): number {
  const len = text.length;
  if (len <= 30) return base;
  if (len <= 60) return Math.round(base * 0.85);
  if (len <= 120) return Math.round(base * 0.7);
  return min;
}

async function blobFromDataUrl(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export function ShareCardButton({ input, output }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const isHonest = input.mode === "translate" && input.style === "honest";
  const original = input.text.length > 220 ? input.text.slice(0, 220) + "…" : input.text;

  async function exportCard() {
    if (!cardRef.current || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: "#ffffff" });
      const blob = await blobFromDataUrl(dataUrl);
      const file = new File([blob], FILE_NAME, { type: "image/png" });
      if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "속마음 번역" });
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
      <Button variant="outline" size="sm" onClick={exportCard} disabled={busy}>
        <ImageDown className="size-4" />
        {busy ? "만드는 중…" : "이미지로 공유"}
      </Button>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}

      {/* 화면 밖에서 렌더링되는 공유 카드. 폰트 로딩과 무관하게 깨지지 않도록 인라인 스타일. */}
      <div aria-hidden className="pointer-events-none fixed top-0 -left-[10000px]">
        <div
          ref={cardRef}
          style={{
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            padding: "44px 44px 36px",
            background: "#ffffff",
            color: "#1a2440",
            fontFamily: FONT,
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
          }}
        >
          <div style={{ fontSize: 15, color: "#5f6676" }}>{roleLabel(input.fromRole)}의 말</div>
          <div style={{ marginTop: 10, fontSize: fontSizeFor(original, 26, 17), lineHeight: 1.4, color: "#3b4258", whiteSpace: "pre-wrap", wordBreak: "keep-all" }}>
            “{original}”
          </div>

          <div style={{ marginTop: "auto" }}>
            <div style={{ display: "inline-block", fontSize: 15, fontWeight: 700, background: "linear-gradient(transparent 50%, #ffe45c 50%, #ffe45c 92%, transparent 92%)", padding: "0 3px" }}>
              {isHonest ? "속마음" : input.mode === "reverse" ? "이렇게 보내 보세요" : "이런 뜻"}
            </div>
            <div style={{ marginTop: 12, fontSize: fontSizeFor(output.translation, 40, 22), fontWeight: 800, lineHeight: 1.28, whiteSpace: "pre-wrap", wordBreak: "keep-all" }}>
              {output.translation}
            </div>
          </div>

          <div style={{ marginTop: 32, paddingTop: 14, borderTop: "1px solid #d9dde5", fontSize: 13, color: "#5f6676", display: "flex", justifyContent: "space-between" }}>
            <span>직장인 속마음 번역기</span>
            <span style={{ fontWeight: 600, color: "#2456e6" }}>{SITE_HOST}</span>
          </div>
        </div>
      </div>
    </>
  );
}
