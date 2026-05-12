-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 015: Add field_settings JSONB to books
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add field_settings column to books
alter table public.books
  add column if not exists field_settings jsonb not null
  default '{"showCustomer":false,"showSupplier":false,"showCategory":false,"showAttachment":false}'::jsonb;

-- 2. Update get_books_with_summary to include field_settings
-- Must drop first because the return type (column list) is changing
drop function if exists public.get_books_with_summary(uuid);

create or replace function public.get_books_with_summary(p_user_id uuid)
returns table (
  id             uuid,
  user_id        uuid,
  name           text,
  currency       text,
  net_balance    numeric,
  field_settings jsonb,
  created_at     timestamptz,
  updated_at     timestamptz,
  last_entry_at  text
)
language sql
security definer
stable
as $$
  select
    b.id,
    b.user_id,
    b.name,
    b.currency,
    b.net_balance,
    b.field_settings,
    b.created_at,
    b.updated_at,
    max(b2.entry_date::text || 'T' || b2.entry_time::text || ':00') as last_entry_at
  from public.books b
  left join public.entries b2 on b2.book_id = b.id
  where b.user_id = p_user_id
  group by b.id, b.user_id, b.name, b.currency, b.net_balance, b.field_settings,
           b.created_at, b.updated_at
  order by b.created_at desc;
$$;
