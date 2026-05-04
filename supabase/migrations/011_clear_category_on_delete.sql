-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 011: Clear category snapshot on entries when category deleted
-- Run AFTER 010_categories.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- When a category is deleted, ON DELETE SET NULL already nulls category_id
-- on entries. This trigger also nulls the entries.category text snapshot
-- (must be BEFORE DELETE so category_id is still intact when we query).

create or replace function public.clear_entry_category()
returns trigger language plpgsql security definer as $$
begin
  update public.entries set category = null where category_id = OLD.id;
  return OLD;
end;
$$;

create trigger categories_clear_category
  before delete on public.categories
  for each row execute procedure public.clear_entry_category();
