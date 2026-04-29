-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 009: Clear contact_name on entries when customer/supplier deleted
-- Run AFTER 008_contacts.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- When a customer or supplier is deleted, ON DELETE SET NULL already nulls
-- customer_id / supplier_id on entries. This trigger also nulls contact_name
-- (must be BEFORE DELETE so the FK values are still intact when we query).

create or replace function public.clear_entry_contact_name()
returns trigger language plpgsql security definer as $$
begin
  if TG_TABLE_NAME = 'customers' then
    update public.entries set contact_name = null where customer_id = OLD.id;
  elsif TG_TABLE_NAME = 'suppliers' then
    update public.entries set contact_name = null where supplier_id = OLD.id;
  end if;
  return OLD;
end;
$$;

create trigger customers_clear_contact_name
  before delete on public.customers
  for each row execute procedure public.clear_entry_contact_name();

create trigger suppliers_clear_contact_name
  before delete on public.suppliers
  for each row execute procedure public.clear_entry_contact_name();
