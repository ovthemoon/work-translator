import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LikeButton } from "@/components/like-button";
import { isValidShareId } from "@/lib/share/id";
import { getShareRepository } from "@/lib/share/repository";
import { roleLabel } from "@/lib/translate/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function loadShare(id: string) {
  if (!isValidShareId(id)) return null;
  const repo = getShareRepository();
  if (!repo) return null;
  try {
    return await repo.findById(id);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const share = await loadShare(id);
  if (!share) return { title: "없는 카드" };
  const title = share.translation.length > 60 ? share.translation.slice(0, 60) + "…" : share.translation;
  return {
    title,
    description: `${roleLabel(share.from_role)}의 말 “${share.masked_text.slice(0, 80)}”의 속마음`,
    openGraph: { title, description: `“${share.masked_text.slice(0, 80)}” 의 속마음`, images: [`/s/${id}/opengraph-image`] },
    twitter: { card: "summary_large_image" },
  };
}

export default async function SharePage({ params }: Params) {
  const { id } = await params;
  const share = await loadShare(id);
  if (!share) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-10 sm:pt-16">
      <p className="text-sm text-muted-foreground">
        <Link href="/" className="font-semibold text-foreground">직장인 속마음 번역기</Link>
      </p>

      <section className="mt-6 rounded-xl border border-border bg-card p-5 sm:p-7">
        <p className="text-sm text-muted-foreground">{roleLabel(share.from_role)}의 말</p>
        <p className="mt-1 text-lg leading-snug text-foreground/80 whitespace-pre-wrap">“{share.masked_text}”</p>
        <p className="mt-6 text-sm"><span className="mark font-semibold">속마음</span></p>
        <p className="mt-2 text-2xl font-bold leading-snug sm:text-[28px] whitespace-pre-wrap">{share.translation}</p>
        <div className="mt-6 flex items-center gap-3 border-t border-border pt-5">
          <LikeButton id={share.id} initial={share.likes} />
          <span className="text-xs text-muted-foreground">{roleLabel(share.from_role)} → {roleLabel(share.to_role)}</span>
        </div>
      </section>

      <section className="mt-8 rounded-xl bg-accent px-5 py-5">
        <p className="font-semibold">나도 받은 말이 있다면</p>
        <p className="mt-1 text-sm text-muted-foreground">붙여넣으면 3초 안에 속마음이 나와요. 긴 요청은 해야 할 일로 정리해 드려요.</p>
        <Link href="/" className="mt-3 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">
          내 것도 번역하기
        </Link>
      </section>
    </main>
  );
}
