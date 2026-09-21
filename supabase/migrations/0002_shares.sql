-- 사용자가 "링크 만들기"를 눌렀을 때만 저장되는 공유 카드. 저장 전 개인정보 마스킹.
create table if not exists public.shares (
  id text primary key,
  masked_text text not null,
  translation text not null,
  from_role text not null,
  to_role text not null,
  likes integer not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists shares_public_likes_idx on public.shares (is_public, likes desc, created_at desc);

alter table public.shares enable row level security;

-- 좋아요는 서비스 역할 키로만 호출된다 (API 라우트 경유)
create or replace function public.increment_share_likes(share_id text)
returns integer
language sql
security definer
as $$
  update public.shares set likes = likes + 1 where id = share_id returning likes;
$$;
