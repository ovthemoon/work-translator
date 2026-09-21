-- (다른 서비스와 DB 를 공유하므로 테이블 이름에 wt_ 접두어를 쓴다)
-- 사용자가 동의한 경우에만 저장되는, 개인정보가 가려진 번역 사례
create table if not exists public.wt_feedback_samples (
  id uuid primary key default gen_random_uuid(),
  masked_text text not null,
  from_role text not null,
  to_role text not null,
  depth text not null,
  mode text not null default 'translate',
  output jsonb not null,
  rating text not null check (rating in ('up', 'down')),
  created_at timestamptz not null default now()
);

-- 서비스 역할 키로만 쓰기. 공개 anon 키로는 읽기/쓰기 모두 막는다.
alter table public.wt_feedback_samples enable row level security;
