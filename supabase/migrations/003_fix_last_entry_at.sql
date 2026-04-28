-- Fix: entry_time::text already produces HH:MM:SS, appending ':00' made it HH:MM:SS:00 (invalid ISO).
create or replace function public.get_books_with_summary(p_user_id uuid)
returns table (
  id            uuid,
  user_id       uuid,
  name          text,
  currency      text,
  net_balance   numeric,
  created_at    timestamptz,
  updated_at    timestamptz,
  last_entry_at text
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
    b.created_at,
    b.updated_at,
    max(b2.entry_date::text || 'T' || b2.entry_time::text) as last_entry_at
  from public.books b
  left join public.entries b2 on b2.book_id = b.id
  where b.user_id = p_user_id
  group by b.id, b.user_id, b.name, b.currency, b.net_balance, b.created_at, b.updated_at
  order by b.created_at desc;
$$;
