import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "직장인 속마음 번역기", template: "%s · 직장인 속마음 번역기" },
  description: "“급한 건 아닌데 이번 주 안에만요.” 그 말의 속마음을 읽어 드려요. 긴 요청은 해야 할 일로 정리해 드리고요.",
  openGraph: {
    title: "직장인 속마음 번역기",
    description: "“급한 건 아닌데 이번 주 안에만요.” 그 말의 속마음을 읽어 드려요.",
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <div className="flex-1">{children}</div>
        <footer className="mx-auto w-full max-w-2xl px-4 py-10 text-sm text-muted-foreground">
          <p>입력한 메시지와 결과는 서버에 저장하지 않아요. 피드백에서 동의한 경우에만 개인정보를 가린 뒤 저장해요.</p>
          <nav className="mt-3 flex gap-4">
            <Link href="/gallery" className="underline underline-offset-4 hover:text-foreground">속마음 모음</Link>
            <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">개인정보처리방침</Link>
            <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">이용약관</Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
