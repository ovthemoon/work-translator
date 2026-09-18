import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";

export const CACHE_TTL_SECONDS = 10 * 60;
const MEMORY_MAX_ENTRIES = 500;

export interface KeyValueCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
}

/** 로컬 개발용 메모리 캐시. 항목 수 상한을 두어 무한히 커지지 않게 한다. */
export class MemoryCache implements KeyValueCache {
  private readonly store = new Map<string, { value: unknown; expires: number }>();

  constructor(private readonly now: () => number = Date.now) {}

  async get<T>(key: string): Promise<T | null> {
    const hit = this.store.get(key);
    if (!hit) return null;
    if (hit.expires <= this.now()) {
      this.store.delete(key);
      return null;
    }
    return hit.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (this.store.size >= MEMORY_MAX_ENTRIES) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { value, expires: this.now() + ttlSeconds * 1000 });
  }
}

class UpstashCache implements KeyValueCache {
  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    return (await this.redis.get<T>(key)) ?? null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, value, { ex: ttlSeconds });
  }
}

let instance: KeyValueCache | null = null;

export function getCache(): KeyValueCache {
  if (instance) return instance;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  instance = url && token ? new UpstashCache(new Redis({ url, token })) : new MemoryCache();
  return instance;
}

/**
 * 입력을 해시해 캐시 키를 만든다. 원문은 키에 들어가지 않고 해시만 남는다.
 * 공백 차이는 같은 입력으로 본다.
 */
export function cacheKeyFor(parts: Record<string, string>): string {
  const normalized = Object.keys(parts)
    .sort()
    .map((k) => `${k}=${parts[k].trim().replace(/\s+/g, " ")}`)
    .join("\n");
  return "wt:tr:" + createHash("sha256").update(normalized).digest("hex");
}
