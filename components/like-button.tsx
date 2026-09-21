"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

export function LikeButton({ id, initial }: { id: string; initial: number }) {
  const [likes, setLikes] = useState(initial);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function like() {
    if (done || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/share/${id}`, { method: "POST" });
      const json = (await res.json()) as { success: boolean; data: { likes: number } | null };
      if (json.success && json.data) setLikes(json.data.likes);
      setDone(true);
    } catch {
      /* 실패해도 조용히. 좋아요는 핵심 기능이 아니다 */
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={like}
      disabled={done || busy}
      aria-pressed={done}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm hover:bg-muted disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <Heart className={done ? "size-4 fill-current text-red-500" : "size-4"} />
      {likes > 0 ? likes : "공감"}
    </button>
  );
}
