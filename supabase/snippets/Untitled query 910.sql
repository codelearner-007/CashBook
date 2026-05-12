-- Migration 012: Payment Modes
-- Adds a per-book payment_modes table with Cash + Cheque seeded on book creation.
-- entries.payment_mode_id is nullable FK; set null on mode deletion.

-- ── Table ─────────────────────────────────────────────────────────────────────

create table if not exists public.payment_modes (
  id         uuid         primary key default gen_random_uuid(),
  book_id    uuid         not null references public.books(id) on delete cascade,
  user_id    uuid         not null references auth.users(id) on delete cascade,
  name       text         not null,
  created_at timestamptz  not null default now(),
  constraint payment_modes_book_name_unique unique (book_id, name)
);

alter table public.payment_modes enable row level security;

create policy "Users manage own payment modes"
  on public.payment_modes for all
  using (auth.uid() = user_id);

-- ── FK on entries ─────────────────────────────────────────────────────────────

alter table public.entries
  add column if not exists payment_mode_id uuid
    references public.payment_modes(id) on delete set null;

-- ── Seed trigger ──────────────────────────────────────────────────────────────

create or replace function public.seed_default_payment_modes()
returns trigger language plpgsql security definer as $$
begin
  insert into public.payment_modes (book_id, user_id, name) values
    (NEW.id, NEW.user_id, 'Cash'),
    (NEW.id, NEW.user_id, 'Cheque');
  return NEW;
end;
$$;

drop trigger if exists trg_seed_payment_modes on public.books;
create trigger trg_seed_payment_modes
  after insert on public.books
  for each row
  execute function public.seed_default_payment_modes();

-- ── Seed existing books ───────────────────────────────────────────────────────

insert into public.payment_modes (book_id, user_id, name)
select b.id, b.user_id, m.name
from public.books b
cross join (values ('Cash'), ('Cheque')) as m(name)
on conflict do nothing;
