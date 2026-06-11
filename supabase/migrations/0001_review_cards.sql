-- WordCard 云端词库：review_cards 表 + 索引 + RLS + updated_at 触发器
-- 在 Supabase 控制台 → SQL Editor 粘贴并运行（整段一次跑完）。
-- 安全：每个用户只能读写自己的词（RLS 基于 auth.uid()）。

-- 1) 表结构（卡片内容 + SM-2 复习状态合表）
create table if not exists public.review_cards (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references auth.users(id) on delete cascade,

  -- 卡片内容
  original_text         text        not null,
  normalized_text       text        not null,           -- trim + 小写，用于去重
  input_type            text        not null check (input_type in ('word','phrase','sentence')),
  meaning               text        not null,
  phonetic              text,                            -- IPA，可空（句子可能为 null）
  reading_chinese       text        not null,
  stressed_syllable     text        not null default '',
  how_to_read           text        not null,
  natural_breakdown     text        not null default '',
  examples              jsonb       not null default '[]'::jsonb,
  tts_text              text        not null default '',
  query_count           integer     not null default 1,

  -- SM-2 复习状态
  ease_factor           numeric(4,2) not null default 2.3,
  srs_interval          integer     not null default 0,   -- 注意：interval 是 PG 保留字，故命名 srs_interval
  repetitions           integer     not null default 0,
  due_date              timestamptz not null default now(),
  last_review_date      timestamptz,
  total_reviews         integer     not null default 0,
  total_lapses          integer     not null default 0,
  mastered              boolean     not null default false,
  mastered_at           timestamptz,
  next_spot_check_date  timestamptz,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- 去重：同一用户同一个词只存一条
  unique (user_id, normalized_text)
);

-- 2) 索引：最高频查询「我的今日到期词」
create index if not exists idx_review_cards_user_due
  on public.review_cards (user_id, due_date);

-- 3) 开启行级安全（RLS）
alter table public.review_cards enable row level security;

-- 4) RLS 策略：仅登录用户、且只能操作自己的行
drop policy if exists "review_cards_select_own" on public.review_cards;
create policy "review_cards_select_own"
  on public.review_cards for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "review_cards_insert_own" on public.review_cards;
create policy "review_cards_insert_own"
  on public.review_cards for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "review_cards_update_own" on public.review_cards;
create policy "review_cards_update_own"
  on public.review_cards for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "review_cards_delete_own" on public.review_cards;
create policy "review_cards_delete_own"
  on public.review_cards for delete
  to authenticated
  using (auth.uid() = user_id);

-- 5) updated_at 自动维护触发器
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_review_cards_updated_at on public.review_cards;
create trigger trg_review_cards_updated_at
  before update on public.review_cards
  for each row
  execute function public.set_updated_at();
