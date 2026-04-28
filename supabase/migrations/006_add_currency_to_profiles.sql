-- Add preferred currency to profiles
-- This is the user's default currency for new books.
-- Existing users default to 'PKR' to preserve current behaviour.
alter table public.profiles
  add column if not exists currency text not null default 'PKR';
