alter table public.profiles
  add column if not exists currency text not null default 'PKR';

alter table public.profiles
  add column if not exists is_dark_mode boolean not null default false;