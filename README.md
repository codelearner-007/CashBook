# CashBook

Daily income & expense tracker — React Native (Expo) + FastAPI + Supabase.

```
cashbook/
├── frontend/     React Native Expo app
├── backend/      FastAPI backend
├── supabase/     SQL migrations + setup guide
└── CLAUDE.md     Full implementation guide
```

---

## Frontend

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start dev server (local network)
npx expo start
npx expo start --clear

# Start dev server (tunnel — use if local network doesn't work)
npx expo start --tunnel

# Start for web only
npx expo start --web

# Build Android preview APK (EAS)
npx eas build --platform android --profile preview

# Build iOS preview (EAS)
npx eas build --platform ios --profile preview
```

### Frontend environment variables (`frontend/.env`)

```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
EXPO_PUBLIC_API_URL=http://<your-local-ip>:8000
```

---

## Backend

```bash
cd backend

# Create virtual environment (first time only)
python -m venv venv

# Activate virtual environment
venv\Scripts\activate          # Windows
source venv/bin/activate       # macOS / Linux

# Install dependencies (first time or after requirements change)
pip install -r requirements.txt

# Start dev server with auto-reload
uvicorn app.main:app --reload

# Expose to local network (required when Expo runs on a physical device)
uvicorn app.main:app --reload --host 0.0.0.0

# API docs available at:
# http://localhost:8000/docs
```

### Backend environment variables (`backend/.env`)

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>
SUPABASE_JWT_SECRET=<jwt_secret>
```

---

## Supabase

All migrations live in `supabase/migrations/`. Run them **in order** in the Supabase SQL Editor.

| # | File | What it does |
|---|---|---|
| 001 | `001_init.sql` | books, entries tables, basic RLS |
| 002 | `002_profiles_and_roles.sql` | profiles, triggers, balance trigger, indexes |
| 003 | `003_fix_last_entry_at.sql` | fix last_entry_at computation |
| 004 | `005_avatars_bucket.sql` | public avatars storage bucket + RLS |
| 005 | `006_add_currency_to_profiles.sql` | currency column on profiles |
| 006 | `007_add_dark_mode_to_profiles.sql` | is_dark_mode column on profiles |
| 007 | `008_contacts.sql` | customers and suppliers tables |
| 008 | `009_clear_contact_name_on_delete.sql` | null out contact_name on contact delete |
| 009 | `010_categories.sql` | categories table + balance trigger |

### One-time setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run all migrations above in the SQL Editor (in order)
3. Enable Google OAuth: **Authentication → Providers → Google**
   - Add redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
   - Add mobile redirect: `cashbook://auth/callback`
4. Create a private Storage bucket named `attachments`
5. Copy keys into `frontend/.env` and `backend/.env` (see above)
