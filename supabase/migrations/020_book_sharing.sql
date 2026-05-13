-- Migration 020: Book Sharing
-- Lets a book owner share any book with another registered user.
-- Owner chooses which sections are visible and what the recipient can do.

create table public.book_shares (
  id             uuid        primary key default gen_random_uuid(),
  book_id        uuid        not null references public.books(id)    on delete cascade,
  owner_id       uuid        not null references public.profiles(id) on delete cascade,
  shared_with_id uuid        not null references public.profiles(id) on delete cascade,

  -- Which book sections the recipient can see
  screens        jsonb       not null default '{"entries":true,"categories":false,"contacts":false,"payment_modes":false,"reports":false,"settings":false}'::jsonb,

  -- What the recipient can do inside accessible sections
  rights         text        not null default 'view'
                             check (rights in ('view', 'view_create_edit', 'view_create_edit_delete')),

  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),

  unique (book_id, shared_with_id),
  check  (owner_id <> shared_with_id)
);

create index book_shares_book_id_idx        on public.book_shares(book_id);
create index book_shares_shared_with_id_idx on public.book_shares(shared_with_id);
create index book_shares_owner_id_idx       on public.book_shares(owner_id);

alter table public.book_shares enable row level security;

-- Owner has full control over shares they created
create policy "Owner manages book shares"
  on public.book_shares for all to authenticated
  using  (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Recipient can read their own share records (to fetch the shared book list)
create policy "Recipient views their shares"
  on public.book_shares for select to authenticated
  using (auth.uid() = shared_with_id);
