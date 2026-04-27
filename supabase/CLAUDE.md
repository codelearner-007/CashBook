# CLAUDE.md — Supabase (cashbook/supabase)

> **Auto-update rule:** Whenever a migration SQL file is added or modified, or when Supabase config (auth, storage, RLS) changes, update the matching section in this file before finishing the task.

---

## Project Overview

Supabase provides three things for CashBook:
1. **PostgreSQL database** — books and entries tables
2. **Auth** — Google OAuth + JWT issuance
3. **Storage** — entry photo attachments

---

## Database Schema

Migration file: `supabase/migrations/001_init.sql`

### `public.books`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `user_id` | uuid | FK → `auth.users(id)` ON DELETE CASCADE, NOT NULL |
| `name` | text | NOT NULL |
| `currency` | text | default `'PKR'` |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | default `now()` |

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

---

## Row Level Security (RLS)

RLS is enabled on both tables. Policies enforce that users can only access their own data.

```sql
-- Books: owner-only access
alter table public.books enable row level security;
create policy "Users own their books" on public.books
  for all using (auth.uid() = user_id);

-- Entries: owner-only access
alter table public.entries enable row level security;
create policy "Users own their entries" on public.entries
  for all using (auth.uid() = user_id);
```

**Important:** The backend uses the **service role key** which bypasses RLS. This means the backend code must **always** add `user_id` filter manually in every query — RLS is a last-resort safety net on the DB, not a substitute for backend filtering.

---

## Indexes

```sql
create index entries_book_id_idx   on public.entries(book_id);
create index entries_user_id_idx   on public.entries(user_id);
create index entries_entry_date_idx on public.entries(entry_date);
```

These indexes are critical for performance when a book has many entries. Add additional indexes if new filter patterns are introduced (e.g., filtering by `category` or `payment_mode`).

---

## Auth Setup

### Google OAuth
1. Go to **Authentication → Providers → Google** in Supabase dashboard
2. Enable Google provider
3. Paste **Google Client ID** and **Google Client Secret** from Google Cloud Console
4. Set Authorized Redirect URI in Google Cloud: `https://<project-ref>.supabase.co/auth/v1/callback`
5. Add the same URL as redirect URL in Supabase Google provider settings

### JWT
- Algorithm: **HS256**
- Secret: found at **Project Settings → API → JWT Secret**
- The backend uses this secret to validate tokens without hitting Supabase on every request
- Token includes `sub` claim = `auth.users.id` (the `user_id` used in all queries)
- `verify_aud` is set to `false` in backend JWT decode because Supabase tokens don't use a standard audience claim

### Session persistence (mobile)
- Mobile stores session in **Expo SecureStore** (not AsyncStorage — SecureStore is encrypted)
- `autoRefreshToken: true` and `persistSession: true` are set on the Supabase client
- The JWT interceptor in `frontend/src/lib/api.js` fetches the current session before every request and attaches the token

---

## Storage

### Bucket: `attachments`
- **Name:** `attachments`
- **Visibility:** private (not public)
- **Path pattern:** `attachments/{user_id}/{entry_id}`

### Upload flow
1. Frontend calls `POST /api/v1/upload/attachment` with the image file
2. Backend uploads to Supabase Storage using the service key
3. Backend generates a **signed URL** (1-hour expiry) and returns it
4. Frontend stores the signed URL in `entries.attachment_url`
5. When displaying the entry, if the URL is expired, the backend must regenerate it

### Storage policies
Create these in **Storage → Policies** in the Supabase dashboard:

```sql
-- Allow authenticated users to upload to their own folder
create policy "Users upload own attachments"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to read their own attachments
create policy "Users read own attachments"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
```

---

## Setup Checklist

Run this in order when setting up a new Supabase project:

- [ ] Create project at supabase.com
- [ ] Run `supabase/migrations/001_init.sql` in the SQL Editor
- [ ] Enable Google OAuth (Authentication → Providers → Google)
  - [ ] Add Google Client ID and Secret
  - [ ] Set redirect URL: `https://<ref>.supabase.co/auth/v1/callback`
- [ ] Create Storage bucket named `attachments` (private)
  - [ ] Apply storage policies (see above)
- [ ] Copy values to env files:
  - **Frontend `.env`:** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - **Backend `.env`:** `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET`

---

## Key References in Supabase Dashboard

| What | Where |
|---|---|
| Project URL | Project Settings → API → Project URL |
| Anon key | Project Settings → API → Project API Keys → `anon` |
| Service role key | Project Settings → API → Project API Keys → `service_role` |
| JWT Secret | Project Settings → API → JWT Settings → JWT Secret |
| Auth providers | Authentication → Providers |
| Storage buckets | Storage → Buckets |
| SQL Editor | SQL Editor (run migrations here) |
| RLS policies | Table Editor → select table → RLS tab |

---

## Adding a New Migration

1. Create a new file: `supabase/migrations/00N_description.sql`
2. Run it in the Supabase SQL Editor
3. Update the schema table(s) in this file to reflect the new columns/tables
4. If new indexes are added, document them in the Indexes section above

---

## When to Update This File

Update the relevant section in this file whenever:
- A new migration SQL file is added or run
- A new table or column is added
- RLS policies are created, modified, or dropped
- A new Storage bucket or policy is created
- Auth provider configuration changes
- A new env variable from Supabase is required
