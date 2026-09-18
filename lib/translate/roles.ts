export const ROLES = [
  { id: "developer", label: "개발자" },
  { id: "planner", label: "기획자" },
  { id: "designer", label: "디자이너" },
  { id: "marketer", label: "마케터" },
  { id: "executive", label: "대표/경영진" },
  { id: "client", label: "클라이언트(비개발자)" },
  { id: "newbie", label: "신입" },
  { id: "pangyo", label: "판교어" },
  { id: "public_doc", label: "공공기관 문서" },
] as const;

export type RoleId = (typeof ROLES)[number]["id"];

export const ROLE_IDS = ROLES.map((r) => r.id) as [RoleId, ...RoleId[]];

export const DEPTHS = [
  { id: "simple", label: "아주 쉽게" },
  { id: "practitioner", label: "실무자 수준" },
] as const;

export type DepthId = (typeof DEPTHS)[number]["id"];
export const DEPTH_IDS = DEPTHS.map((d) => d.id) as [DepthId, ...DepthId[]];

export const MODES = [
  { id: "translate", label: "받은 메시지 해석하기" },
  { id: "reverse", label: "반대로 보내기 (내 문장 다듬기)" },
] as const;

export type ModeId = (typeof MODES)[number]["id"];
export const MODE_IDS = MODES.map((m) => m.id) as [ModeId, ...ModeId[]];

export const STYLES = [
  { id: "explain", label: "풀어서 설명" },
  { id: "honest", label: "속마음 직역" },
] as const;

export type StyleId = (typeof STYLES)[number]["id"];
export const STYLE_IDS = STYLES.map((s) => s.id) as [StyleId, ...StyleId[]];

export const MAX_INPUT_CHARS = 1000;
export const MAX_CLARIFYING_QUESTIONS = 3;

export function roleLabel(id: RoleId): string {
  return ROLES.find((r) => r.id === id)?.label ?? id;
}

export function depthLabel(id: DepthId): string {
  return DEPTHS.find((d) => d.id === id)?.label ?? id;
}
