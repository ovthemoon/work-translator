import { randomBytes } from "node:crypto";

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // 헷갈리는 글자(i, l, o, 0, 1) 제외
export const SHARE_ID_LENGTH = 8;

export function newShareId(): string {
  const bytes = randomBytes(SHARE_ID_LENGTH);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function isValidShareId(id: string): boolean {
  return new RegExp(`^[${ALPHABET}]{${SHARE_ID_LENGTH}}$`).test(id);
}
