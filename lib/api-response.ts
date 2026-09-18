import { NextResponse } from "next/server";

export type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
};

export function ok<T>(data: T, init?: ResponseInit): NextResponse<ApiEnvelope<T>> {
  return NextResponse.json({ success: true, data, error: null }, init);
}

export function fail(message: string, status: number, headers?: HeadersInit): NextResponse<ApiEnvelope<never>> {
  return NextResponse.json({ success: false, data: null, error: message }, { status, headers });
}
