-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 010: Categories per Book
-- Run AFTER 009_clear_contact_name_on_delete.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Categories table ───────────────────────────────────────────────────────
create table if not exists public.categories (
  id          uuid           primary key default gen_random_uuid(),
  book_id     uuid           not null references public.books(id)  on delete cascade,
  user_id     uuid           not null references auth.users(id)    on delete cascade,
  name        text           not null,
  total_in    numeric(14,2)  not null default 0,
  total_out   numeric(14,2)  not null default 0,
  net_balance numeric(14,2)  not null default 0,
  created_at  timestamptz    not null default now(),
  constraint categories_book_name_unique unique (book_id, name)
);

-- ── 2. Indexes ─────────────────────────────────────────────────────────────────
create index if not exists categories_book_idx on public.categories(book_id);
create index if not exists categories_user_idx on public.categories(user_id);

-- ── 3. Add category_id FK to entries ─────────────────────────────────────────
-- ON DELETE SET NULL: deleting a category preserves entries;
-- the text snapshot in entries.category remains for historical display.
alter table public.entries
  add column if not exists category_id uuid references public.categories(id) on delete set null;

create index if not exists entries_category_id_idx on public.entries(category_id);

-- ── 4. RLS ────────────────────────────────────────────────────────────────────
alter table public.categories enable row level security;

create policy "Users own their categories"
  on public.categories for all to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 5. Category balance trigger ───────────────────────────────────────────────
-- Mirrors trg_update_contact_balance: keeps total_in, total_out, net_balance in
-- sync on categories whenever linked entries change.
create or replace function public.update_category_balance()
returns trigger language plpgsql security definer as $$
begin
  -- Reverse the old entry's contribution (UPDATE or DELETE)
  if TG_OP in ('UPDATE', 'DELETE') then
    if OLD.category_id is not null then
      update public.categories set
        total_in    = total_in    - case when OLD.type = 'in'  then OLD.amount else 0           end,
        total_out   = total_out   - case when OLD.type = 'out' then OLD.amount else 0           end,
        net_balance = net_balance - case when OLD.type = 'in'  then OLD.amount else -OLD.amount end
      where id = OLD.category_id;
    end if;
  end if;

  -- Apply the new entry's contribution (INSERT or UPDATE)
  if TG_OP in ('INSERT', 'UPDATE') then
    if NEW.category_id is not null then
      update public.categories set
        total_in    = total_in    + case when NEW.type = 'in'  then NEW.amount else 0           end,
        total_out   = total_out   + case when NEW.type = 'out' then NEW.amount else 0           end,
        net_balance = net_balance + case when NEW.type = 'in'  then NEW.amount else -NEW.amount end
      where id = NEW.category_id;
    end if;
  end if;

  return case TG_OP when 'DELETE' then OLD else NEW end;
end;
$$;

create trigger trg_update_category_balance
  after insert or update or delete on public.entries
  for each row execute procedure public.update_category_balance();
