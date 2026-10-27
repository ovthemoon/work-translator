# 업무 용어 번역기

직군 사이에 오가는 애매한 메시지를 상대 직군이 이해할 수 있는 말로 풀어주는 AI 웹 서비스입니다.

[서비스](https://translate.opendesk.page/) / [공유 결과 예시](https://translate.opendesk.page/s/jkdgvtmh)

## 시작하기

```bash
cp .env.example .env.local   # UPSTAGE_API_KEY 채우기
npm ci
npm run dev
```

키 없이 로컬 화면과 흐름을 확인하려면 `.env.local`의 `LLM_PROVIDER=mock`을 사용합니다. 모의 응답은 개발 환경에서만 동작합니다. 실제 번역에는 `UPSTAGE_API_KEY`가 필요하며, OpenRouter를 사용할 때는 같은 변수에 해당 키를 넣고 `UPSTAGE_BASE_URL`과 모델명을 함께 설정합니다.

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
- `lib/translate/` 입력, 출력 스키마, 프롬프트 조립, 번역 호출
- `lib/privacy/` 피드백 저장 전 개인정보 마스킹
- `eval/` 평가 스크립트

## 데이터 원칙

일반 번역 요청의 원문과 결과는 저장하지 않습니다. 피드백 저장에 동의하거나 공유 링크 만들기를 선택한 경우에는 개인정보를 마스킹한 뒤 저장합니다. 공유 링크로 만든 내용은 다른 사람이 열어볼 수 있습니다.

## 배포

| 구성 | 위치 |
|---|---|
| 앱 | Vercel 프로젝트 `work-translator` (프로덕션 `work-translator.vercel.app`) |
| 공개 주소 | `translate.opendesk.page` → `deploy/opendesk-proxy` Cloudflare Worker 가 Vercel 로 프록시 |

Vercel 프로덕션 환경변수: `UPSTAGE_API_KEY`(필수, 직접 입력), `UPSTAGE_MODEL`, `UPSTAGE_BASE_URL`, `UPSTAGE_REASONING_EFFORT`, `NEXT_PUBLIC_SITE_URL`, `PROXY_SECRET`.
선택: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`(피드백 저장, `supabase/migrations` 적용 필요), `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`(레이트 리밋, 캐시).

```bash
vercel --prod                                   # 앱
cd deploy/opendesk-proxy && npx wrangler deploy  # 프록시 (PROXY_SECRET 은 wrangler secret 으로)
```

API 오류 응답은 502/504 를 쓰지 않는다. Cloudflare 가 그 코드를 자기 오류 페이지로 바꿔 버리기 때문이다.


## 비밀정보 관리

- `.env.local` 같은 실제 환경파일은 올리지 않고, 값이 비어 있는 `.env.example`만 공유합니다.
- API 키, Supabase 서비스 역할 키, Redis 토큰과 프록시 비밀값은 서버 환경변수로만 등록합니다. `NEXT_PUBLIC_` 변수에는 비밀값을 넣지 않습니다.
- `.vercel`, `.wrangler`, `supabase/.temp`와 빌드 산출물은 Git에서 제외합니다.
- 배포 환경의 키와 토큰은 Vercel 환경변수 또는 Cloudflare Secrets에서 관리합니다.

## 품질 검증 기록

[105개 문구 평가와 29개 문구 재실행 결과](eval/reports/2026-09-18-105-phrases.md)를 공개했습니다. 형식 검증과 의미 오류를 구분하고, 수정 뒤에도 남은 질문 방향 오류를 기록했습니다.
