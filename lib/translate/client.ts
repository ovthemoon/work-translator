import type { ApiEnvelope } from "@/lib/api-response";
import type { TranslateApiData } from "@/app/api/translate/route";
import type { TranslateInput, TranslateOutput } from "./schema";

export type { TranslateApiData };

async function postJson<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error("네트워크 연결을 확인해 주세요.");
  }
  let envelope: ApiEnvelope<T> | null = null;
  try {
    envelope = (await res.json()) as ApiEnvelope<T>;
  } catch {
    envelope = null;
  }
  if (!envelope) throw new Error(`서버 응답을 읽지 못했어요. (${res.status})`);
  if (!envelope.success || envelope.data === null) throw new Error(envelope.error ?? "알 수 없는 오류가 발생했어요.");
  return envelope.data;
}

export function requestTranslate(input: TranslateInput): Promise<TranslateApiData> {
  return postJson<TranslateApiData>("/api/translate", input);
}

export type FeedbackResult = { stored: boolean; reason?: string };

export function sendFeedback(body: {
  input: TranslateInput;
  output: TranslateOutput;
  rating: "up" | "down";
  consent: boolean;
}): Promise<FeedbackResult> {
  return postJson<FeedbackResult>("/api/feedback", body);
}
