import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "업무 용어 번역기", template: "%s · 업무 용어 번역기" },
  description: "직군이 다르면 같은 말도 다르게 들려요. 개발자·기획자·디자이너·클라이언트 사이의 애매한 메시지를 상대가 이해할 수 있는 말로 바꿔 드려요.",
  openGraph: {
    title: "업무 용어 번역기",
    description: "직군이 다르면 같은 말도 다르게 들려요. 애매한 업무 메시지를 상대 직군의 말로 번역해요.",
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
            <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">개인정보처리방침</Link>
            <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">이용약관</Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
