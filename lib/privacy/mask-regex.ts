/**
 * 1단계 마스킹: 정규식으로 잡히는 개인정보를 토큰으로 치환한다.
 * 순서가 중요하다. 이메일을 먼저 지워야 이메일 안의 숫자를 전화번호로 오인하지 않는다.
 */
export const MASK_TOKENS = {
  email: "[이메일]",
  phone: "[번호]",
  idNumber: "[번호]",
  card: "[번호]",
  url: "[링크]",
  company: "[회사]",
  name: "[이름]",
} as const;

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const URL = /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+/gi;
// 주민등록번호 / 외국인등록번호 (6자리-7자리)
const RESIDENT_ID = /\b\d{6}-?[1-8]\d{6}\b/g;
// 카드번호 16자리 (4-4-4-4 또는 붙여쓰기)
const CARD = /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g;
// 휴대폰·유선·국제 표기: 010-1234-5678, 01012345678, 02-123-4567, +82-10-1234-5678, 070-1234-5678
const PHONE = /(?:\+82[-\s]?1?0?|0(?:1[016789]|2|[3-6][1-5]|70|80))[-\s.]?\d{3,4}[-\s.]?\d{4}\b/g;
// (주)회사명, 회사명(주), 주식회사 회사명, 회사명 주식회사, ~컴퍼니/~테크/~랩스 등 흔한 접미
const COMPANY =
  /(?:\(주\)\s*[가-힣A-Za-z0-9&·]+|[가-힣A-Za-z0-9&·]+\s*\(주\)|주식회사\s+[가-힣A-Za-z0-9&·]+|[가-힣A-Za-z0-9&·]+\s+주식회사|[가-힣A-Za-z0-9]+(?:컴퍼니|테크|랩스|소프트|스튜디오)(?=\s|$|[,.!?]))/g;
// 한국식 이름 + 호칭: 김철수 님/씨/대리/과장/팀장/부장/이사/대표/사원/주임/매니저/PM/PD
const NAME_WITH_TITLE =
  /(?<![가-힣])([가-힣]{2,4})\s?(님|씨|대리|과장|차장|부장|팀장|실장|이사|상무|전무|대표님|대표|사원|주임|매니저|선임|책임|수석|PM|PD|프로)(?![가-힣]{2})/g;

export function maskWithRegex(text: string): string {
  return text
    .replace(EMAIL, MASK_TOKENS.email)
    .replace(URL, MASK_TOKENS.url)
    .replace(RESIDENT_ID, MASK_TOKENS.idNumber)
    .replace(CARD, MASK_TOKENS.card)
    .replace(PHONE, MASK_TOKENS.phone)
    .replace(COMPANY, MASK_TOKENS.company)
    .replace(NAME_WITH_TITLE, (_m, _name: string, title: string) => `${MASK_TOKENS.name} ${title}`);
}
