-- Migration 019: Push Tokens
-- Stores Expo push tokens per device per user.
-- One user can have tokens on multiple devices (phone + tablet).
-- Tokens are upserted on every app launch; stale tokens are ignored by Expo.

create table public.push_tokens (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  token      text        not null,
  platform   text,                         -- 'ios' | 'android'
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (user_id, token)
);

create index push_tokens_user_id_idx on public.push_tokens(user_id);

-- RLS: users can only read/write their own tokens
alter table public.push_tokens enable row level security;

create policy "Users manage own push tokens"
  on public.push_tokens for all to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
