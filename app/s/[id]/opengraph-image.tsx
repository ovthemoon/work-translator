import { ImageResponse } from "next/og";
import { isValidShareId } from "@/lib/share/id";
import { getShareRepository } from "@/lib/share/repository";
import { roleLabel } from "@/lib/translate/roles";

export const runtime = "nodejs";
export const alt = "직장인 속마음 번역기";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FONT_URL = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/public/static/Pretendard-Bold.otf";
const FONT_REGULAR_URL = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/public/static/Pretendard-Regular.otf";

async function loadFont(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

function clamp(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = getShareRepository();
  const share = isValidShareId(id) && repo ? await repo.findById(id).catch(() => null) : null;
  const [bold, regular] = await Promise.all([loadFont(FONT_URL), loadFont(FONT_REGULAR_URL)]);
  const fonts = [
    ...(bold ? [{ name: "Pretendard", data: bold, weight: 700 as const }] : []),
    ...(regular ? [{ name: "Pretendard", data: regular, weight: 400 as const }] : []),
  ];

  const original = share ? clamp(share.masked_text, 90) : "받은 말을 붙여넣어 보세요";
  const translation = share ? clamp(share.translation, 70) : "직장인 속마음 번역기";
  const who = share ? `${roleLabel(share.from_role)}의 말` : "";
  const translationSize = translation.length > 40 ? 48 : 60;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "64px 72px", background: "#ffffff", color: "#1a2440", fontFamily: "Pretendard" }}>
        <div style={{ fontSize: 26, color: "#5f6676", fontWeight: 400 }}>{who}</div>
        <div style={{ marginTop: 12, fontSize: 34, lineHeight: 1.35, color: "#3b4258", fontWeight: 400 }}>“{original}”</div>
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex" }}>
            <span style={{ fontSize: 26, fontWeight: 700, background: "#ffe45c", padding: "2px 10px" }}>속마음</span>
          </div>
          <div style={{ marginTop: 16, fontSize: translationSize, lineHeight: 1.25, fontWeight: 700 }}>{translation}</div>
        </div>
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: "2px solid #d9dde5", display: "flex", justifyContent: "space-between", fontSize: 24, color: "#5f6676" }}>
          <span>직장인 속마음 번역기</span>
          <span style={{ color: "#2456e6", fontWeight: 700 }}>translate.opendesk.page</span>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
