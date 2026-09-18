import { Translator } from "@/components/translator";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-10 sm:pt-16">
      <header className="mb-10">
        <h1 className="text-lg font-semibold tracking-tight">업무 용어 번역기</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          직군이 다르면 같은 말도 다르게 들려요. 받은 메시지가 무슨 뜻인지, 무엇을 되물어야 하는지 알려 드려요.
        </p>
      </header>
      <Translator />
    </main>
  );
}
