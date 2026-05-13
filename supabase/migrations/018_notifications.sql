-- Migration 018: Notifications
-- Super-admin can broadcast notifications to segmented groups of users.
--
-- target_type options:
--   'all'           → every active non-superadmin user (+ the sending admin)
--   'new_users'     → users registered within the last N days (days_threshold)
--   'with_books'    → active users who have created at least 1 book
--   'without_books' → active users who have not yet created any book
--   'specific'      → a hand-picked list (user_ids resolved by backend)
--
-- notifications      → one row per broadcast
-- user_notifications → one row per (user × notification), tracks read state

-- ── Tables ────────────────────────────────────────────────────────────────────

create table public.notifications (
  id              uuid        primary key default gen_random_uuid(),
  title           text        not null,
  body            text        not null,
  target_type     text        not null default 'all'
                              check (target_type in ('all', 'new_users', 'with_books', 'without_books', 'specific')),
  days_threshold  int,           -- only set when target_type = 'new_users'
  created_by      uuid        references public.profiles(id) on delete set null,
  created_at      timestamptz default now()
);

create table public.user_notifications (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  notification_id uuid        not null references public.notifications(id) on delete cascade,
  is_read         boolean     not null default false,
  read_at         timestamptz,
  created_at      timestamptz default now(),
  unique (user_id, notification_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

create index notifications_created_at_idx   on public.notifications(created_at desc);
create index notifications_created_by_idx   on public.notifications(created_by);
create index user_notifications_user_id_idx on public.user_notifications(user_id);
create index user_notifications_unread_idx  on public.user_notifications(user_id, is_read)
  where is_read = false;

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.notifications      enable row level security;
alter table public.user_notifications enable row level security;

-- Users can read their own inbox rows
create policy "Users read own user_notifications"
  on public.user_notifications for select to authenticated
  using (auth.uid() = user_id);

-- Users can mark their own rows as read
create policy "Users update own user_notifications"
  on public.user_notifications for update to authenticated
  using (auth.uid() = user_id);
