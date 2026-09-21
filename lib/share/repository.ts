import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { RoleId } from "@/lib/translate/roles";

export type ShareRecord = {
  id: string;
  masked_text: string;
  translation: string;
  from_role: RoleId;
  to_role: RoleId;
  likes: number;
  is_public: boolean;
  created_at: string;
};

export type NewShare = Omit<ShareRecord, "likes" | "is_public" | "created_at">;

export interface ShareRepository {
  create(share: NewShare): Promise<void>;
  findById(id: string): Promise<ShareRecord | null>;
  like(id: string): Promise<number>;
  listPublic(limit: number, fromRole?: RoleId): Promise<ShareRecord[]>;
}

class SupabaseShareRepository implements ShareRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(share: NewShare): Promise<void> {
    const { error } = await this.client.from("shares").insert(share);
    if (error) throw new Error(`share insert failed: ${error.code ?? error.message}`);
  }

  async findById(id: string): Promise<ShareRecord | null> {
    const { data, error } = await this.client.from("shares").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`share select failed: ${error.code ?? error.message}`);
    return (data as ShareRecord | null) ?? null;
  }

  async like(id: string): Promise<number> {
    const { data, error } = await this.client.rpc("increment_share_likes", { share_id: id });
    if (error) throw new Error(`share like failed: ${error.code ?? error.message}`);
    return Number(data ?? 0);
  }

  async listPublic(limit: number, fromRole?: RoleId): Promise<ShareRecord[]> {
    let q = this.client.from("shares").select("*").eq("is_public", true).order("likes", { ascending: false }).order("created_at", { ascending: false }).limit(limit);
    if (fromRole) q = q.eq("from_role", fromRole);
    const { data, error } = await q;
    if (error) throw new Error(`share list failed: ${error.code ?? error.message}`);
    return (data as ShareRecord[]) ?? [];
  }
}

/** 로컬 개발용. 서버 재시작 시 사라진다. Next 개발 서버는 번들마다 모듈이 따로 뜨므로 globalThis 에 저장소를 둔다. */
const MEMORY_KEY = "__wt_share_rows__";

function memoryRows(): Map<string, ShareRecord> {
  const g = globalThis as unknown as Record<string, Map<string, ShareRecord> | undefined>;
  if (!g[MEMORY_KEY]) g[MEMORY_KEY] = new Map<string, ShareRecord>();
  return g[MEMORY_KEY];
}

export class MemoryShareRepository implements ShareRepository {
  private readonly rows = memoryRows();

  async create(share: NewShare): Promise<void> {
    this.rows.set(share.id, { ...share, likes: 0, is_public: true, created_at: new Date().toISOString() });
  }

  async findById(id: string): Promise<ShareRecord | null> {
    return this.rows.get(id) ?? null;
  }

  async like(id: string): Promise<number> {
    const row = this.rows.get(id);
    if (!row) return 0;
    const next = { ...row, likes: row.likes + 1 };
    this.rows.set(id, next);
    return next.likes;
  }

  async listPublic(limit: number, fromRole?: RoleId): Promise<ShareRecord[]> {
    return [...this.rows.values()]
      .filter((r) => r.is_public && (!fromRole || r.from_role === fromRole))
      .sort((a, b) => b.likes - a.likes || b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }
}

let instance: ShareRepository | null | undefined;

/** 환경변수가 없으면 개발 환경에서는 메모리, 프로덕션에서는 null (기능 비활성화). */
export function getShareRepository(): ShareRepository | null {
  if (instance !== undefined) return instance;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    instance = new SupabaseShareRepository(createClient(url, key, { auth: { persistSession: false } }));
  } else {
    instance = process.env.NODE_ENV === "production" ? null : new MemoryShareRepository();
  }
  return instance;
}
