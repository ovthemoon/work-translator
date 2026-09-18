import { describe, expect, test } from "vitest";
import { MemoryRateLimiter } from "@/lib/rate-limit";
import { cacheKeyFor, MemoryCache } from "@/lib/cache";

describe("MemoryRateLimiter", () => {
  test("allows up to the limit then blocks", async () => {
    const rl = new MemoryRateLimiter(2, 1000, () => 0);
    expect((await rl.limit("a")).success).toBe(true);
    expect((await rl.limit("a")).success).toBe(true);
    const third = await rl.limit("a");
    expect(third.success).toBe(false);
    expect(third.remaining).toBe(0);
  });

  test("resets after the window passes", async () => {
    let now = 0;
    const rl = new MemoryRateLimiter(1, 1000, () => now);
    await rl.limit("a");
    expect((await rl.limit("a")).success).toBe(false);
    now = 1001;
    expect((await rl.limit("a")).success).toBe(true);
  });

  test("keys are independent", async () => {
    const rl = new MemoryRateLimiter(1, 1000, () => 0);
    await rl.limit("a");
    expect((await rl.limit("b")).success).toBe(true);
  });
});

describe("MemoryCache", () => {
  test("returns stored value before expiry and null after", async () => {
    let now = 0;
    const cache = new MemoryCache(() => now);
    await cache.set("k", { v: 1 }, 10);
    expect(await cache.get("k")).toEqual({ v: 1 });
    now = 10_001;
    expect(await cache.get("k")).toBeNull();
  });
});

describe("cacheKeyFor", () => {
  test("same input with different whitespace yields the same key", () => {
    const a = cacheKeyFor({ text: "로고만  살짝 ", from: "client" });
    const b = cacheKeyFor({ text: " 로고만 살짝", from: "client" });
    expect(a).toBe(b);
  });

  test("does not contain the original text", () => {
    expect(cacheKeyFor({ text: "비밀문장" })).not.toContain("비밀문장");
  });

  test("different roles yield different keys", () => {
    expect(cacheKeyFor({ text: "a", from: "client" })).not.toBe(cacheKeyFor({ text: "a", from: "designer" }));
  });
});
