# 업무 용어 번역기

직군 사이에 오가는 애매한 메시지를 상대 직군이 이해할 수 있는 말로 번역해 주는 웹 서비스 (한국어 전용).

## 시작하기

```bash
cp .env.example .env.local   # UPSTAGE_API_KEY 채우기
npm install
npm run dev
```

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm test` | 단위 테스트 (vitest) |
| `npm run typecheck` | 타입 검사 |
| `npm run eval -- [--model X] [--limit N]` | `data/examples.json` 전체를 LLM에 돌려 `eval/out/*.csv` 로 저장 |

## 구조

- `prompts/` 시스템 프롬프트 (translate / reverse / mask)
- `data/examples.json` few-shot 예시
- `lib/llm/` LLM 공급자 인터페이스와 Upstage 구현
- `lib/translate/` 입력·출력 스키마, 프롬프트 조립, 번역 호출
- `lib/privacy/` 피드백 저장 전 개인정보 마스킹
- `eval/` 평가 스크립트

## 데이터 원칙

입력 원문과 결과는 서버에 저장하지 않고 로그에도 남기지 않는다. 👍/👎 피드백에서 동의한 경우에만, 이름·연락처·회사명을 토큰으로 치환한 뒤 저장한다.

## 배포

| 구성 | 위치 |
|---|---|
| 앱 | Vercel 프로젝트 `work-translator` (프로덕션 `work-translator.vercel.app`) |
| 공개 주소 | `translate.opendesk.page` → `deploy/opendesk-proxy` Cloudflare Worker 가 Vercel 로 프록시 |

Vercel 프로덕션 환경변수: `UPSTAGE_API_KEY`(필수, 직접 입력), `UPSTAGE_MODEL`, `UPSTAGE_BASE_URL`, `UPSTAGE_REASONING_EFFORT`, `NEXT_PUBLIC_SITE_URL`, `PROXY_SECRET`.
선택: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`(피드백 저장, `supabase/migrations` 적용 필요), `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`(레이트 리밋·캐시).

```bash
vercel --prod                                   # 앱
cd deploy/opendesk-proxy && npx wrangler deploy  # 프록시 (PROXY_SECRET 은 wrangler secret 으로)
```

API 오류 응답은 502/504 를 쓰지 않는다. Cloudflare 가 그 코드를 자기 오류 페이지로 바꿔 버리기 때문이다.
