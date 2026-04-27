# CLAUDE.md — Supabase (cashbook/supabase)

> **Auto-update rule:** Whenever a migration SQL file is added or modified, or when Supabase config (auth, storage, RLS) changes, update the matching section in this file before finishing the task.

---

## Project Overview

Supabase provides three things for CashBook:
1. **PostgreSQL database** — profiles, books, entries tables
2. **Auth** — Google OAuth + Email OTP + JWT issuance
3. **Storage** — entry photo attachments

---

## Database Schema

### Migration order
1. `supabase/migrations/001_init.sql` — books, entries, basic RLS
2. `supabase/migrations/002_profiles_and_roles.sql` — profiles, triggers, balance, indexes, DB functions

---

### `public.profiles` (1:1 with auth.users)

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, FK → `auth.users(id)` ON DELETE CASCADE |
| `email` | text | NOT NULL |
| `full_name` | text | nullable |
| `phone` | text | nullable |
| `avatar_url` | text | nullable |
| `role` | text | NOT NULL, default `'user'`, CHECK IN ('superadmin','user') |
| `is_active` | boolean | NOT NULL, default `true` |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | default `now()` (auto-updated by trigger) |

**First-user rule:** The `handle_new_user` trigger fires on every `auth.users` insert. It counts existing profiles — if 0, it assigns `role = 'superadmin'`; otherwise `role = 'user'`. Profile is auto-created; no manual insert needed.

---

### `public.books`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `user_id` | uuid | FK → `auth.users(id)` ON DELETE CASCADE, NOT NULL |
| `name` | text | NOT NULL |
| `currency` | text | default `'PKR'` |
| `net_balance` | numeric(14,2) | NOT NULL, default `0` — maintained by trigger |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | default `now()` (auto-updated by trigger) |

**`net_balance` is maintained automatically** by the `trg_update_book_balance` trigger on the `entries` table. Never compute it in application code — read it directly from the `books` row.

---

### `public.entries`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `book_id` | uuid | FK → `public.books(id)` ON DELETE CASCADE, NOT NULL |
| `user_id` | uuid | FK → `auth.users(id)` ON DELETE CASCADE, NOT NULL |
| `type` | text | CHECK `type IN ('in', 'out')`, NOT NULL |
| `amount` | numeric(12,2) | NOT NULL |
| `remark` | text | nullable |
| `category` | text | nullable |
| `payment_mode` | text | default `'cash'` |
| `contact_name` | text | nullable |
| `attachment_url` | text | nullable |
| `entry_date` | date | NOT NULL, default `current_date` |
| `entry_time` | time | NOT NULL, default `current_time` |
| `created_at` | timestamptz | default `now()` |

**Normalization note:** `entries.user_id` is redundant (derivable via `book_id → books.user_id`) but is kept for:
- RLS policies (`auth.uid() = user_id`)
- Performance at scale (avoids join on hot query path)
- Defence in depth on the backend

---

## Indexes

```sql
-- profiles
profiles_role_idx         on profiles(role)
profiles_is_active_idx    on profiles(is_active)
profiles_created_at_idx   on profiles(created_at desc)

-- books
books_user_created_idx    on books(user_id, created_at desc)

-- entries (3NF-compliant, tuned for common access patterns)
entries_book_id_idx       on entries(book_id)
entries_user_id_idx       on entries(user_id)
entries_entry_date_idx    on entries(entry_date)
entries_book_date_idx     on entries(book_id, entry_date desc, entry_time desc)
entries_user_date_idx     on entries(user_id, entry_date desc)
```

---

## Row Level Security (RLS)

### profiles
```sql
-- Users read own profile
create policy "Users read own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- Users update own profile
create policy "Users update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);
```

### books & entries
```sql
-- Users own their books
create policy "Users own their books" on public.books
  for all using (auth.uid() = user_id);

-- Users own their entries
create policy "Users own their entries" on public.entries
  for all using (auth.uid() = user_id);
```

**Backend uses service role key → bypasses RLS.** Backend code must always add `user_id` filter manually. RLS is a last-resort safety net for direct client calls.

---

## Triggers

| Trigger | Table | Purpose |
|---|---|---|
| `on_auth_user_created` | `auth.users` AFTER INSERT | Auto-create profile; first user = superadmin |
| `profiles_updated_at` | `profiles` BEFORE UPDATE | Maintain `updated_at` |
| `books_updated_at` | `books` BEFORE UPDATE | Maintain `updated_at` |
| `trg_update_book_balance` | `entries` AFTER INSERT/UPDATE/DELETE | Maintain `books.net_balance` |

---

## PostgreSQL Functions (called via `supabase.rpc()`)

| Function | Args | Returns | Use |
|---|---|---|---|
| `get_books_with_summary(p_user_id)` | uuid | table of books + last_entry_at | GET /books (single round-trip) |
| `get_book_summary(p_book_id, p_user_id)` | uuid, uuid | {total_in, total_out, net_balance} | GET /books/:id/summary |

---

## Auth Setup

### Google OAuth
1. Go to **Authentication → Providers → Google** in Supabase dashboard
2. Enable Google provider
3. Paste **Google Client ID** and **Google Client Secret** from Google Cloud Console
4. Set Authorized Redirect URI in Google Cloud: `https://<project-ref>.supabase.co/auth/v1/callback`
5. Add the same URL as redirect URL in Supabase Google provider settings
6. Add mobile deep-link: `cashbook://auth/callback` to allowed redirect URLs in Supabase

### Email OTP (magic link)
- Enabled by default in Supabase Authentication → Providers → Email
- No additional configuration needed
- User receives a magic link; tapping it signs them in

### JWT
- Algorithm: **HS256**
- Secret: **Project Settings → API → JWT Secret**
- Backend decodes without hitting Supabase (stateless validation)
- Token `sub` claim = `auth.users.id` = `profiles.id` = `books.user_id`
- `verify_aud` = false (Supabase tokens don't use standard audience)

### Session persistence (mobile)
- Stored in **Expo SecureStore** (encrypted)
- `autoRefreshToken: true`, `persistSession: true`
- `_layout.jsx` calls `supabase.auth.getSession()` on app start to restore session

---

## Storage

### Bucket: `attachments`
- **Name:** `attachments`
- **Visibility:** private
- **Path pattern:** `{user_id}/{entry_id}/attachment.{ext}`

### Storage policies
```sql
create policy "Users upload own attachments"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users read own attachments"
  on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
```

---

## Setup Checklist (new project)

- [ ] Create project at supabase.com
- [ ] Run `001_init.sql` in SQL Editor
- [ ] Run `002_profiles_and_roles.sql` in SQL Editor
- [ ] Enable Google OAuth (Authentication → Providers → Google)
  - [ ] Add Google Client ID and Secret
  - [ ] Set redirect URL: `https://<ref>.supabase.co/auth/v1/callback`
  - [ ] Add mobile redirect: `cashbook://auth/callback` to allowed URLs
- [ ] Create Storage bucket named `attachments` (private)
  - [ ] Apply storage policies (see above)
- [ ] Copy values to env files:
  - **Frontend `.env`:** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - **Backend `.env`:** `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET`

---

## Adding a New Migration

1. Create: `supabase/migrations/00N_description.sql`
2. Run it in Supabase SQL Editor
3. Update the schema table(s) in this file
4. Document new indexes and triggers

---

## When to Update This File

- New migration SQL file added or run
- New table, column, index, or trigger added
- RLS policies created, modified, or dropped
- New Storage bucket or policy created
- Auth provider configuration changes
- New PostgreSQL function added or changed
