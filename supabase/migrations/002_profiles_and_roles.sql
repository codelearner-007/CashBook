-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002: Profiles, Roles, Balance Trigger, DB Functions
-- Run in Supabase SQL Editor AFTER 001_init.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Add net_balance column to books (maintained by trigger) ─────────────────
alter table public.books
  add column if not exists net_balance numeric(14, 2) not null default 0;

-- ── 2. Profiles table (1:1 with auth.users) ───────────────────────────────────
create table if not exists public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  email       text        not null,
  full_name   text,
  phone       text,
  avatar_url  text,
  role        text        not null default 'user' check (role in ('superadmin', 'user')),
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Indexes for admin queries at scale
create index if not exists profiles_role_idx       on public.profiles(role);
create index if not exists profiles_is_active_idx  on public.profiles(is_active);
create index if not exists profiles_created_at_idx on public.profiles(created_at desc);

-- Composite indexes on books and entries for scale
create index if not exists books_user_created_idx  on public.books(user_id, created_at desc);
create index if not exists entries_book_date_idx   on public.entries(book_id, entry_date desc, entry_time desc);
create index if not exists entries_user_date_idx   on public.entries(user_id, entry_date desc);

-- ── 3. Trigger: auto-create profile on new user; first user = superadmin ───────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_role  text := 'user';
begin
  select count(*) into v_count from public.profiles;
  if v_count = 0 then
    v_role := 'superadmin';
  end if;

  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, 'user'), '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url',
    v_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 4. Trigger: auto-update profiles.updated_at ───────────────────────────────
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger books_updated_at
  before update on public.books
  for each row execute procedure public.handle_updated_at();

-- ── 5. Trigger: maintain books.net_balance on entry insert/update/delete ───────
create or replace function public.update_book_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.type = 'in' then
      update public.books set net_balance = net_balance + NEW.amount where id = NEW.book_id;
    else
      update public.books set net_balance = net_balance - NEW.amount where id = NEW.book_id;
    end if;

  elsif TG_OP = 'DELETE' then
    if OLD.type = 'in' then
      update public.books set net_balance = net_balance - OLD.amount where id = OLD.book_id;
    else
      update public.books set net_balance = net_balance + OLD.amount where id = OLD.book_id;
    end if;

  elsif TG_OP = 'UPDATE' then
    -- Reverse the old entry
    if OLD.type = 'in' then
      update public.books set net_balance = net_balance - OLD.amount where id = OLD.book_id;
    else
      update public.books set net_balance = net_balance + OLD.amount where id = OLD.book_id;
    end if;
    -- Apply the new entry (handles book_id change too)
    if NEW.type = 'in' then
      update public.books set net_balance = net_balance + NEW.amount where id = NEW.book_id;
    else
      update public.books set net_balance = net_balance - NEW.amount where id = NEW.book_id;
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_update_book_balance on public.entries;
create trigger trg_update_book_balance
  after insert or update or delete on public.entries
  for each row execute procedure public.update_book_balance();

-- ── 6. RLS on profiles ────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- Every authenticated user can read their own profile
create policy "Users read own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- Every authenticated user can update their own non-sensitive fields
create policy "Users update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Service role (backend) bypasses RLS — no extra policy needed for admin ops.

-- ── 7. DB function: get books with last_entry_at (single round-trip) ──────────
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
    max(b2.entry_date::text || 'T' || b2.entry_time::text || ':00') as last_entry_at
  from public.books b
  left join public.entries b2 on b2.book_id = b.id
  where b.user_id = p_user_id
  group by b.id, b.user_id, b.name, b.currency, b.net_balance, b.created_at, b.updated_at
  order by b.created_at desc;
$$;

-- ── 8. DB function: get summary for a book ────────────────────────────────────
create or replace function public.get_book_summary(p_book_id uuid, p_user_id uuid)
returns table (total_in numeric, total_out numeric, net_balance numeric)
language sql
security definer
stable
as $$
  select
    coalesce(sum(case when type = 'in'  then amount else 0 end), 0) as total_in,
    coalesce(sum(case when type = 'out' then amount else 0 end), 0) as total_out,
    coalesce(sum(case when type = 'in'  then amount else -amount end), 0) as net_balance
  from public.entries
  where book_id = p_book_id and user_id = p_user_id;
$$;
