import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { TranslateOutput } from "@/lib/translate/schema";

export type FeedbackSample = {
  masked_text: string;
  from_role: string;
  to_role: string;
  depth: string;
  mode: string;
  output: TranslateOutput;
  rating: "up" | "down";
};

export interface FeedbackRepository {
  save(sample: FeedbackSample): Promise<void>;
}

class SupabaseFeedbackRepository implements FeedbackRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(sample: FeedbackSample): Promise<void> {
    const { error } = await this.client.from("wt_feedback_samples").insert(sample);
    if (error) throw new Error(`feedback insert failed: ${error.code ?? error.message}`);
  }
}

let instance: FeedbackRepository | null | undefined;

/** 환경변수가 없으면 null (저장 기능 비활성화). */
export function getFeedbackRepository(): FeedbackRepository | null {
  if (instance !== undefined) return instance;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  instance = url && key ? new SupabaseFeedbackRepository(createClient(url, key, { auth: { persistSession: false } })) : null;
  return instance;
}
