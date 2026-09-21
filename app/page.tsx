import { Translator } from "@/components/translator";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-10 sm:pt-16">
      <header className="mb-10">
        <h1 className="text-lg font-semibold tracking-tight">직장인 속마음 번역기</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          “급한 건 아닌데 이번 주 안에만요.” 그 말의 속마음을 읽어 드려요. 긴 요청은 해야 할 일로 정리해 드리고요.
        </p>
      </header>
      <Translator />
    </main>
  );
}
