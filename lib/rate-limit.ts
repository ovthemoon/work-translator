import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const DAILY_FREE_LIMIT = 20;
const WINDOW = "1 d" as const;
const WINDOW_MS = 24 * 60 * 60 * 1000;

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  /** 한도가 다시 열리는 시각 (epoch ms) */
  reset: number;
};

export interface RateLimiter {
  limit(key: string): Promise<RateLimitResult>;
}

/** Upstash 가 없을 때(로컬 개발) 쓰는 메모리 카운터. 서버 인스턴스마다 따로 센다. */
export class MemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, { count: number; reset: number }>();

  constructor(
    private readonly max = DAILY_FREE_LIMIT,
    private readonly windowMs = WINDOW_MS,
    private readonly now: () => number = Date.now,
  ) {}

  async limit(key: string): Promise<RateLimitResult> {
    const current = this.now();
    const entry = this.hits.get(key);
    const fresh = !entry || entry.reset <= current ? { count: 0, reset: current + this.windowMs } : entry;
    const next = { count: fresh.count + 1, reset: fresh.reset };
    this.hits.set(key, next);
    return { success: next.count <= this.max, remaining: Math.max(0, this.max - next.count), reset: next.reset };
  }
}

class UpstashRateLimiter implements RateLimiter {
  private readonly limiter: Ratelimit;

  constructor(redis: Redis) {
    this.limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(DAILY_FREE_LIMIT, WINDOW),
      prefix: "wt:rl",
    });
  }

  async limit(key: string): Promise<RateLimitResult> {
    const r = await this.limiter.limit(key);
    return { success: r.success, remaining: r.remaining, reset: r.reset };
  }
}

let instance: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (instance) return instance;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  instance = url && token ? new UpstashRateLimiter(new Redis({ url, token })) : new MemoryRateLimiter();
  return instance;
}
