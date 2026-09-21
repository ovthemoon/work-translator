import Link from "next/link";
import { getShareRepository } from "@/lib/share/repository";
import { ROLES, roleLabel, type RoleId } from "@/lib/translate/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "속마음 모음" };

const PAGE_SIZE = 30;

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const fromRole = ROLES.some((r) => r.id === from) ? (from as RoleId) : undefined;
  const repo = getShareRepository();
  const rows = repo ? await repo.listPublic(PAGE_SIZE, fromRole).catch(() => []) : [];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-10 sm:pt-16">
      <p className="text-sm text-muted-foreground">
        <Link href="/" className="font-semibold text-foreground">직장인 속마음 번역기</Link>
      </p>
      <h1 className="mt-4 text-2xl font-bold">속마음 모음</h1>
      <p className="mt-1 text-sm text-muted-foreground">사람들이 공유한 번역이에요. 이름과 연락처는 가려져 있어요.</p>

      <nav className="mt-5 flex flex-wrap gap-2 text-sm">
        <Link href="/gallery" className={!fromRole ? "rounded-full bg-foreground px-3 py-1 text-background" : "rounded-full bg-muted px-3 py-1"}>전체</Link>
        {ROLES.map((r) => (
          <Link key={r.id} href={`/gallery?from=${r.id}`} className={fromRole === r.id ? "rounded-full bg-foreground px-3 py-1 text-background" : "rounded-full bg-muted px-3 py-1"}>
            {r.label}의 말
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="mt-10 text-muted-foreground">아직 공유된 카드가 없어요. <Link href="/" className="underline underline-offset-4">첫 번째로 만들어 볼까요?</Link></p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/s/${r.id}`} className="block rounded-xl border border-border bg-card p-4 hover:border-foreground/40">
                <p className="text-sm text-muted-foreground">{roleLabel(r.from_role)}의 말 · 공감 {r.likes}</p>
                <p className="mt-1 text-foreground/80">“{r.masked_text}”</p>
                <p className="mt-2 text-lg font-bold leading-snug">{r.translation}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
