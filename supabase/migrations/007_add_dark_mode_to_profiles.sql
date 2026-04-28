-- Persist dark mode preference per user.
alter table public.profiles
  add column if not exists is_dark_mode boolean not null default false;
