# CLAUDE.md — Supabase (cashbook/supabase)

> **Auto-update rule:** Whenever a migration SQL file is added or modified, or when Supabase config (auth, storage, RLS) changes, update the matching section in this file before finishing the task.

---

## Project Overview

Supabase provides three things for CashBook:
1. **PostgreSQL database** — profiles, books, entries tables
2. **Auth** — Google OAuth + Email OTP + JWT issuance
3. **Storage** — entry photo attachments

---

## Migration Order

1. `supabase/migrations/001_init.sql` — books, entries tables, basic RLS
2. `supabase/migrations/002_profiles_and_roles.sql` — profiles, triggers, balance trigger, indexes, DB functions
3. `supabase/migrations/003_fix_last_entry_at.sql` — fix last_entry_at computation
4. `supabase/migrations/004_avatars_bucket.sql` (now `005_avatars_bucket.sql`) — create public `avatars` storage bucket + RLS policies
5. `supabase/migrations/006_add_currency_to_profiles.sql` — add `currency` column to profiles (default `'PKR'`)
6. `supabase/migrations/007_add_dark_mode_to_profiles.sql` — add `is_dark_mode` boolean to profiles
7. `supabase/migrations/008_contacts.sql` — `customers` and `suppliers` tables (with stored `total_in`/`total_out`/`net_balance`) + `customer_id`/`supplier_id` FK columns on entries; RLS; `trg_update_contact_balance` trigger keeps balances in sync automatically
8. `supabase/migrations/009_clear_contact_name_on_delete.sql` — `BEFORE DELETE` triggers on `customers` and `suppliers` that null out `entries.contact_name` for all linked entries when a contact is deleted (FK `ON DELETE SET NULL` handles `customer_id`/`supplier_id`; this covers the snapshot name field)

**All migrations must be run in order** before the app works correctly. Run them in the Supabase SQL Editor.

---

## Database Schema

### `public.profiles` (1:1 with auth.users)

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, FK → `auth.users(id)` ON DELETE CASCADE |
| `email` | text | NOT NULL |
| `full_name` | text | nullable |
| `phone` | text | nullable |
| `avatar_url` | text | nullable |
| `role` | text | NOT NULL, default `'user'`, CHECK IN (`'superadmin'`, `'user'`) |
| `is_active` | boolean | NOT NULL, default `true` |
| `currency` | text | NOT NULL, default `'PKR'` — user's preferred currency for new books |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | default `now()` (auto-updated by trigger) |

**First-user rule:** The `handle_new_user` trigger fires on every `auth.users` INSERT. It counts existing profiles — if 0, it assigns `role = 'superadmin'`; otherwise `role = 'user'`. Profile is auto-created; no manual insert needed.

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

### `public.customers` (one table per book)

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `book_id` | uuid | FK → `public.books(id)` ON DELETE CASCADE, NOT NULL |
| `user_id` | uuid | FK → `auth.users(id)` ON DELETE CASCADE, NOT NULL |
| `name` | text | NOT NULL |
| `phone` | text | nullable |
| `email` | text | nullable |
| `address` | text | nullable |
| `total_in` | numeric(14,2) | NOT NULL, default 0 — maintained by trigger |
| `total_out` | numeric(14,2) | NOT NULL, default 0 — maintained by trigger |
| `net_balance` | numeric(14,2) | NOT NULL, default 0 — maintained by trigger |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | default `now()` (auto-updated by trigger) |

**`total_in`, `total_out`, `net_balance` are maintained automatically** by the `trg_update_contact_balance` trigger on the `entries` table. Never compute them in application code — read directly from the row.

### `public.suppliers` (same structure as customers)

Identical columns to `customers`, including `total_in`, `total_out`, `net_balance`. Kept as a separate table by design — each book has its own customer and supplier lists.

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
| `contact_name` | text | nullable — cleared to NULL when the linked customer/supplier is deleted (migration 009) |
| `customer_id` | uuid | FK → `public.customers(id)` ON DELETE SET NULL, nullable |
| `supplier_id` | uuid | FK → `public.suppliers(id)` ON DELETE SET NULL, nullable |
| `attachment_url` | text | nullable |
| `entry_date` | date | NOT NULL, default `current_date` |
| `entry_time` | time | NOT NULL, default `current_time` |
| `created_at` | timestamptz | default `now()` |

**Note:** `entries.user_id` is redundant (derivable via `book_id → books.user_id`) but is kept for RLS policies, performance, and defence-in-depth on the backend.

---

## Indexes

```sql
-- profiles
profiles_role_idx         on profiles(role)
profiles_is_active_idx    on profiles(is_active)
profiles_created_at_idx   on profiles(created_at desc)

-- books
books_user_created_idx    on books(user_id, created_at desc)

-- entries
entries_book_id_idx       on entries(book_id)
entries_user_id_idx       on entries(user_id)
entries_entry_date_idx    on entries(entry_date)
entries_book_date_idx     on entries(book_id, entry_date desc, entry_time desc)
entries_user_date_idx     on entries(user_id, entry_date desc)
```

---

## Row Level Security (RLS)

RLS is enabled on all three tables. The backend uses the **service role key** which bypasses RLS, so backend code must always add `user_id` filters manually. RLS is a last-resort safety net for any direct client calls.

### profiles
```sql
create policy "Users read own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);
```

### books & entries
```sql
create policy "Users own their books" on public.books
  for all using (auth.uid() = user_id);

create policy "Users own their entries" on public.entries
  for all using (auth.uid() = user_id);
```

---

## Triggers

| Trigger | Table | Event | Purpose |
|---|---|---|---|
| `on_auth_user_created` | `auth.users` | AFTER INSERT | Auto-create profile; first user = superadmin |
| `profiles_updated_at` | `profiles` | BEFORE UPDATE | Maintain `updated_at` |
| `books_updated_at` | `books` | BEFORE UPDATE | Maintain `updated_at` |
| `trg_update_book_balance` | `entries` | AFTER INSERT/UPDATE/DELETE | Maintain `books.net_balance` |
| `customers_updated_at` | `customers` | BEFORE UPDATE | Maintain `updated_at` |
| `suppliers_updated_at` | `suppliers` | BEFORE UPDATE | Maintain `updated_at` |
| `trg_update_contact_balance` | `entries` | AFTER INSERT/UPDATE/DELETE | Maintain `customers.total_in/out/net_balance` and `suppliers.total_in/out/net_balance` |
| `customers_clear_contact_name` | `customers` | BEFORE DELETE | Set `entries.contact_name = NULL` for all entries linked to the deleted customer |
| `suppliers_clear_contact_name` | `suppliers` | BEFORE DELETE | Set `entries.contact_name = NULL` for all entries linked to the deleted supplier |

### Balance trigger logic (`update_book_balance`)
- **INSERT:** `net_balance += amount` if `type='in'`, `-= amount` if `type='out'`
- **DELETE:** reverse of INSERT
- **UPDATE:** reverse old entry, apply new entry (handles type change and amount change atomically)

---

## PostgreSQL Functions (called via `supabase.rpc()`)

| Function | Args | Returns | Use |
|---|---|---|---|
| `get_books_with_summary(p_user_id)` | uuid | table(id, user_id, name, currency, net_balance, created_at, updated_at, last_entry_at) | GET /books — single round-trip |
| `get_book_summary(p_book_id, p_user_id)` | uuid, uuid | table(total_in, total_out, net_balance) | GET /books/:id/summary |

`get_books_with_summary` computes `last_entry_at` by joining `entries` and taking `MAX(entry_date || 'T' || entry_time)` per book. The result is ordered by `books.created_at DESC`.

Both functions are `security definer` — they run with the privileges of the function owner, not the caller.

---

## Auth Setup

### Google OAuth
1. Go to **Authentication → Providers → Google** in Supabase dashboard
2. Enable Google provider; paste Google Client ID and Secret from Google Cloud Console
3. Set Authorized Redirect URI in Google Cloud: `https://<project-ref>.supabase.co/auth/v1/callback`
4. Add mobile deep-link: `cashbook://auth/callback` to allowed redirect URLs in Supabase

### Email OTP (magic link)
- Enabled by default in Supabase → Authentication → Providers → Email
- No additional configuration needed

### JWT
- Algorithm: **HS256**
- Secret: **Project Settings → API → JWT Secret** (copy to backend `.env` as `SUPABASE_JWT_SECRET`)
- Backend decodes without hitting Supabase (stateless validation)
- Token `sub` claim = `auth.users.id` = `profiles.id` = `books.user_id`
- `verify_aud` = false (Supabase tokens don't use standard audience claim)

### Session persistence (mobile)
- Stored in **Expo SecureStore** (native) or **localStorage** (web)
- `autoRefreshToken: true`, `persistSession: true`
- Root `_layout.jsx` calls `supabase.auth.getSession()` on app start to restore session

---

## Storage

### Bucket: `attachments`
- **Visibility:** private
- **Path pattern:** `{user_id}/{entry_id}/attachment.{ext}`
- URLs are **signed** (1-hour expiry), generated by the backend

### Bucket: `avatars`
- **Visibility:** public — URLs are permanent and never expire
- **Path pattern:** `{user_id}/profile.{ext}` — one file per user, upserted on every upload
- Created by `005_avatars_bucket.sql`; also auto-created by the backend on first upload
- Public URL format: `https://<project>.supabase.co/storage/v1/object/public/avatars/{user_id}/profile.{ext}`
- **URL is written to `profiles.avatar_url`** on every successful upload (done inside `POST /api/v1/upload/avatar`)

### Storage policies
```sql
-- attachments (private)
create policy "Users upload own attachments" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users read own attachments" on storage.objects
  for select to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

-- avatars (public)
create policy "avatars_auth_write" on storage.objects
  for all to authenticated
  using  (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_public_read" on storage.objects
  for select to public
  using (bucket_id = 'avatars');
```

---

## Admin User Stats — How They're Computed

The `GET /api/v1/admin/users` endpoint computes stats per user in Python (N+1 pattern — one extra DB query per user):

| Stat | Source |
|---|---|
| `book_count` | `SELECT count(*) FROM books WHERE user_id = ?` |
| `entry_count` | `SELECT count(*) FROM entries WHERE user_id = ?` |
| `storage_mb` | Estimated: `0.2 + entry_count * 0.0005` MB (not real Storage usage) |

The storage estimate is approximate. Actual attachment sizes are not queried from Supabase Storage.

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
  - [ ] Apply storage insert and select policies (see above)
- [ ] Copy values to env files:
  - **Frontend `.env`:** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_URL`
  - **Backend `.env`:** `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET`

---

## Adding a New Migration

1. Create: `supabase/migrations/00N_description.sql`
2. Run it in Supabase SQL Editor
3. Update the schema table(s) and any new functions/triggers in this file
4. Document new indexes

---

## When to Update This File

- New migration SQL file added or run
- New table, column, index, or trigger added
- RLS policies created, modified, or dropped
- New Storage bucket or policy created
- Auth provider configuration changes
- New PostgreSQL function added or changed
- Stats computation method changes in admin router
