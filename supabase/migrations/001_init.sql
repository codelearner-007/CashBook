-- Run this in Supabase SQL Editor

create table public.books (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  currency text default 'PKR',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.entries (
  id uuid default gen_random_uuid() primary key,
  book_id uuid references public.books(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text check (type in ('in', 'out')) not null,
  amount numeric(12, 2) not null,
  remark text,
  category text,
  payment_mode text default 'cash',
  contact_name text,
  attachment_url text,
  entry_date date not null default current_date,
  entry_time time not null default current_time,
  created_at timestamptz default now()
);

alter table public.books enable row level security;
alter table public.entries enable row level security;

create policy "Users own their books" on public.books for all using (auth.uid() = user_id);
create policy "Users own their entries" on public.entries for all using (auth.uid() = user_id);

create index entries_book_id_idx on public.entries(book_id);
create index entries_user_id_idx on public.entries(user_id);
create index entries_entry_date_idx on public.entries(entry_date);
