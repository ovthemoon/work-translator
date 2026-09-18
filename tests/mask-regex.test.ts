import { describe, expect, test } from "vitest";
import { maskWithRegex } from "@/lib/privacy/mask-regex";

describe("maskWithRegex", () => {
  test("masks emails", () => {
    expect(maskWithRegex("담당자 hong.gd@example.co.kr 로 보내주세요")).toBe("담당자 [이메일] 로 보내주세요");
  });

  test("masks Korean mobile and landline numbers in common formats", () => {
    expect(maskWithRegex("010-1234-5678 로 연락")).toBe("[번호] 로 연락");
    expect(maskWithRegex("01012345678 로 연락")).toBe("[번호] 로 연락");
    expect(maskWithRegex("02-123-4567 사무실")).toBe("[번호] 사무실");
    expect(maskWithRegex("+82-10-1234-5678")).toBe("[번호]");
  });

  test("masks resident registration numbers", () => {
    expect(maskWithRegex("주민번호 900101-1234567")).toBe("주민번호 [번호]");
  });

  test("masks URLs", () => {
    expect(maskWithRegex("여기 https://acme.co/x?y=1 보세요")).toBe("여기 [링크] 보세요");
  });

  test("masks company names with (주) or 주식회사", () => {
    expect(maskWithRegex("(주)한빛소프트 건")).toBe("[회사] 건");
    expect(maskWithRegex("주식회사 미래테크 담당")).toBe("[회사] 담당");
  });

  test("masks names followed by a title but keeps the title", () => {
    expect(maskWithRegex("김철수 대리가 말한")).toBe("[이름] 대리가 말한");
    expect(maskWithRegex("박영희 님께")).toBe("[이름] 님께");
  });

  test("leaves ordinary text untouched", () => {
    const text = "일단 MVP니까 최소한으로만요";
    expect(maskWithRegex(text)).toBe(text);
  });
});
