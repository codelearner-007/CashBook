-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 008: Customers & Suppliers tables per Book (separate tables)
-- Run AFTER 007_add_dark_mode_to_profiles.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Customers table ────────────────────────────────────────────────────────
create table if not exists public.customers (
  id          uuid           primary key default gen_random_uuid(),
  book_id     uuid           not null references public.books(id)  on delete cascade,
  user_id     uuid           not null references auth.users(id)    on delete cascade,
  name        text           not null,
  phone       text,
  email       text,
  address     text,
  total_in    numeric(14,2)  not null default 0,
  total_out   numeric(14,2)  not null default 0,
  net_balance numeric(14,2)  not null default 0,
  created_at  timestamptz    not null default now(),
  updated_at  timestamptz    not null default now()
);

-- ── 2. Suppliers table ────────────────────────────────────────────────────────
create table if not exists public.suppliers (
  id          uuid           primary key default gen_random_uuid(),
  book_id     uuid           not null references public.books(id)  on delete cascade,
  user_id     uuid           not null references auth.users(id)    on delete cascade,
  name        text           not null,
  phone       text,
  email       text,
  address     text,
  total_in    numeric(14,2)  not null default 0,
  total_out   numeric(14,2)  not null default 0,
  net_balance numeric(14,2)  not null default 0,
  created_at  timestamptz    not null default now(),
  updated_at  timestamptz    not null default now()
);

-- ── 3. Indexes ─────────────────────────────────────────────────────────────────
create index if not exists customers_book_idx on public.customers(book_id);
create index if not exists customers_user_idx on public.customers(user_id);
create index if not exists suppliers_book_idx on public.suppliers(book_id);
create index if not exists suppliers_user_idx on public.suppliers(user_id);

-- ── 4. updated_at triggers ────────────────────────────────────────────────────
create trigger customers_updated_at
  before update on public.customers
  for each row execute procedure public.handle_updated_at();

create trigger suppliers_updated_at
  before update on public.suppliers
  for each row execute procedure public.handle_updated_at();

-- ── 5. Add FK columns to entries ─────────────────────────────────────────────
-- ON DELETE SET NULL: removing a customer/supplier preserves entries;
-- contact_name snapshot remains for historical display.
alter table public.entries
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;

create index if not exists entries_customer_id_idx on public.entries(customer_id);
create index if not exists entries_supplier_id_idx on public.entries(supplier_id);

-- ── 6. RLS ───────────────────────────────────────────────────────────────────
alter table public.customers enable row level security;
alter table public.suppliers  enable row level security;

create policy "Users own their customers"
  on public.customers for all to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users own their suppliers"
  on public.suppliers for all to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 7. Contact balance trigger ───────────────────────────────────────────────
-- Mirrors trg_update_book_balance: keeps total_in, total_out, net_balance in
-- sync on customers and suppliers whenever linked entries change.
create or replace function public.update_contact_balance()
returns trigger language plpgsql security definer as $$
begin
  -- Reverse the old entry's contribution (UPDATE or DELETE)
  if TG_OP in ('UPDATE', 'DELETE') then
    if OLD.customer_id is not null then
      update public.customers set
        total_in    = total_in    - case when OLD.type = 'in'  then OLD.amount else 0            end,
        total_out   = total_out   - case when OLD.type = 'out' then OLD.amount else 0            end,
        net_balance = net_balance - case when OLD.type = 'in'  then OLD.amount else -OLD.amount  end
      where id = OLD.customer_id;
    end if;
    if OLD.supplier_id is not null then
      update public.suppliers set
        total_in    = total_in    - case when OLD.type = 'in'  then OLD.amount else 0            end,
        total_out   = total_out   - case when OLD.type = 'out' then OLD.amount else 0            end,
        net_balance = net_balance - case when OLD.type = 'in'  then OLD.amount else -OLD.amount  end
      where id = OLD.supplier_id;
    end if;
  end if;

  -- Apply the new entry's contribution (INSERT or UPDATE)
  if TG_OP in ('INSERT', 'UPDATE') then
    if NEW.customer_id is not null then
      update public.customers set
        total_in    = total_in    + case when NEW.type = 'in'  then NEW.amount else 0            end,
        total_out   = total_out   + case when NEW.type = 'out' then NEW.amount else 0            end,
        net_balance = net_balance + case when NEW.type = 'in'  then NEW.amount else -NEW.amount  end
      where id = NEW.customer_id;
    end if;
    if NEW.supplier_id is not null then
      update public.suppliers set
        total_in    = total_in    + case when NEW.type = 'in'  then NEW.amount else 0            end,
        total_out   = total_out   + case when NEW.type = 'out' then NEW.amount else 0            end,
        net_balance = net_balance + case when NEW.type = 'in'  then NEW.amount else -NEW.amount  end
      where id = NEW.supplier_id;
    end if;
  end if;

  return case TG_OP when 'DELETE' then OLD else NEW end;
end;
$$;

create trigger trg_update_contact_balance
  after insert or update or delete on public.entries
  for each row execute procedure public.update_contact_balance();
