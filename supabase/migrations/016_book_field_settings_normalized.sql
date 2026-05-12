-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 016: Replace field_settings JSONB with individual boolean columns
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add individual boolean columns
alter table public.books
  add column if not exists show_customer   boolean not null default false,
  add column if not exists show_supplier   boolean not null default false,
  add column if not exists show_category   boolean not null default false,
  add column if not exists show_attachment boolean not null default false;

-- 2. Migrate existing data from field_settings JSONB (if migration 015 was run)
update public.books
set
  show_customer   = coalesce((field_settings->>'showCustomer')::boolean,   false),
  show_supplier   = coalesce((field_settings->>'showSupplier')::boolean,   false),
  show_category   = coalesce((field_settings->>'showCategory')::boolean,   false),
  show_attachment = coalesce((field_settings->>'showAttachment')::boolean, false)
where field_settings is not null;

-- 3. Drop the JSONB column
alter table public.books drop column if exists field_settings;

-- 4. Recreate get_books_with_summary with individual boolean columns
drop function if exists public.get_books_with_summary(uuid);

create or replace function public.get_books_with_summary(p_user_id uuid)
returns table (
  id              uuid,
  user_id         uuid,
  name            text,
  currency        text,
  net_balance     numeric,
  show_customer   boolean,
  show_supplier   boolean,
  show_category   boolean,
  show_attachment boolean,
  created_at      timestamptz,
  updated_at      timestamptz,
  last_entry_at   text
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
    b.show_customer,
    b.show_supplier,
    b.show_category,
    b.show_attachment,
    b.created_at,
    b.updated_at,
    max(b2.entry_date::text || 'T' || b2.entry_time::text || ':00') as last_entry_at
  from public.books b
  left join public.entries b2 on b2.book_id = b.id
  where b.user_id = p_user_id
  group by b.id, b.user_id, b.name, b.currency, b.net_balance,
           b.show_customer, b.show_supplier, b.show_category, b.show_attachment,
           b.created_at, b.updated_at
  order by b.created_at desc;
$$;
