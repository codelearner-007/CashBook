# CLAUDE.md — CashBook App Implementation Guide

This file is the single source of truth for AI-assisted development of the CashBook app.
Read this fully before writing any code.

## Sub-Documentation (read before touching that area)

Each sub-folder has its own `CLAUDE.md` with detailed, up-to-date logic for that layer.
**Rule:** When any code file in a folder is changed, also update that folder's `CLAUDE.md` before finishing.

| Area | File | What's inside |
|---|---|---|
| Frontend | [frontend/CLAUDE.md](frontend/CLAUDE.md) | Screen logic, routes, hooks, API calls, state, styling |
| Backend | [backend/CLAUDE.md](backend/CLAUDE.md) | Endpoints, Pydantic models, auth middleware, DB patterns |
| Supabase | [supabase/CLAUDE.md](supabase/CLAUDE.md) | Schema, RLS, Storage, Auth setup, migrations |

---

## Project Identity

- **App Name:** CashBook
- **Purpose:** Daily income & expense tracker with multiple books per user
- **Platforms:** Android + iOS (via React Native + Expo)
- **Backend:** FastAPI (Python)
- **Database + Auth:** Supabase (PostgreSQL + Google OAuth)
- **Deployment:** Railway (API), Expo EAS (mobile builds)

---

## Monorepo Structure

```
cashbook/
├── CLAUDE.md                  ← You are here
├── cashbook-mobile/           ← React Native Expo app
└── cashbook-api/              ← FastAPI backend
```

---

## 1. MOBILE (cashbook-mobile)

### Stack
- React Native + Expo SDK 51+
- Expo Router v3 (file-based routing)
- TypeScript (strict mode)
- Supabase JS client (`@supabase/supabase-js`)
- Zustand (global state)
- React Query / TanStack Query (server state, caching)
- Axios (API calls to FastAPI)
- NativeWind (Tailwind styling for RN)
- Expo SecureStore (token storage)

### Folder Structure
```
cashbook-mobile/
├── app/
│   ├── _layout.tsx            # Root layout, auth redirect logic
│   ├── index.tsx              # Onboarding/splash screen
│   ├── (auth)/
│   │   ├── _layout.tsx        # Auth stack layout
│   │   └── login.tsx          # Google sign-in screen
│   └── (app)/
│       ├── _layout.tsx        # App tab/stack layout (requires auth)
│       ├── books/
│       │   ├── index.tsx      # Books list screen
│       │   ├── [id].tsx       # Book ledger/detail screen
│       │   └── [id]/
│       │       ├── entry.tsx         # Add entry (cash in/out)
│       │       ├── [eid].tsx         # Entry detail/edit
│       │       └── reports.tsx       # Reports screen
│       └── settings/
│           ├── index.tsx      # Settings screen
│           └── profile.tsx    # Profile screen (child of settings)
├── components/
│   ├── ui/
│   │   ├── Button.tsx         # Reusable button (variants: primary, danger, ghost)
│   │   ├── Input.tsx          # Text input with label + error
│   │   ├── Card.tsx           # White card container
│   │   ├── Badge.tsx          # Payment mode badge (Cash/Online)
│   │   └── EmptyState.tsx     # Empty list placeholder
│   ├── entry/
│   │   ├── EntryCard.tsx      # Single entry row in ledger
│   │   ├── EntryForm.tsx      # Cash in/out form fields
│   │   └── BalanceCard.tsx    # Net balance + total in/out card
│   ├── books/
│   │   ├── BookCard.tsx       # Single book row
│   │   └── AddBookModal.tsx   # Modal to create new book
│   └── reports/
│       └── ReportSummary.tsx  # Income/expense/balance summary
├── hooks/
│   ├── useAuth.ts             # Auth state + Google sign-in/out
│   ├── useBooks.ts            # Books CRUD (React Query)
│   └── useEntries.ts          # Entries CRUD (React Query)
├── lib/
│   ├── supabase.ts            # Supabase client (uses SecureStore for session)
│   └── api.ts                 # Axios instance with JWT interceptor
├── store/
│   └── authStore.ts           # Zustand: user, session, setUser, clearUser
├── types/
│   └── index.ts               # All TypeScript interfaces
├── constants/
│   ├── colors.ts              # App color palette
│   └── categories.ts          # Predefined category list
├── .env                        # NEVER commit — use .env.example
├── .env.example               # Template with variable names only
├── app.json                   # Expo config
├── tailwind.config.js         # NativeWind config
├── tsconfig.json              # TypeScript strict config
└── package.json
```

### Key TypeScript Types (types/index.ts)
```typescript
export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
}

export interface Book {
  id: string;
  user_id: string;
  name: string;
  currency: string;
  created_at: string;
  net_balance?: number;
}

export interface Entry {
  id: string;
  book_id: string;
  user_id: string;
  type: 'in' | 'out';
  amount: number;
  remark?: string;
  category?: string;
  payment_mode: 'cash' | 'online' | 'cheque' | 'other';
  contact_name?: string;
  attachment_url?: string;
  entry_date: string;   // YYYY-MM-DD
  entry_time: string;   // HH:MM
  created_at: string;
}

export interface BookSummary {
  net_balance: number;
  total_in: number;
  total_out: number;
}
```

### Color Palette (constants/colors.ts)
```typescript
export const Colors = {
  primary: '#3B5BDB',       // Blue — buttons, headers
  cashIn: '#2E7D32',        // Dark green — income
  cashOut: '#C62828',       // Dark red — expense
  background: '#F8F9FA',    // Light grey page bg
  card: '#FFFFFF',          // White card bg
  text: '#1A1A2E',          // Primary text
  textMuted: '#6B7280',     // Secondary text
  border: '#E5E7EB',        // Input/card borders
  badge: '#EEF2FF',         // Badge background
};
```

### Environment Variables (mobile)
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=
```
**Rule:** All Expo env vars must be prefixed `EXPO_PUBLIC_` to be accessible in the app.

### Supabase Client (lib/supabase.ts)
```typescript
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { storage: ExpoSecureStoreAdapter, autoRefreshToken: true, persistSession: true } }
);
```

### API Axios Client (lib/api.ts)
```typescript
import axios from 'axios';
import { supabase } from './supabase';

export const api = axios.create({ baseURL: process.env.EXPO_PUBLIC_API_URL });

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return config;
});
```

---

## 2. API (cashbook-api)

### Stack
- Python 3.11+
- FastAPI
- Supabase Python client (`supabase`)
- python-jose (JWT validation)
- ReportLab (PDF generation)
- openpyxl (Excel generation)
- python-dotenv
- uvicorn (ASGI server)

### Folder Structure
```
cashbook-api/
├── app/
│   ├── main.py               # FastAPI app, CORS, router registration
│   ├── config.py             # Pydantic BaseSettings from .env
│   ├── auth/
│   │   └── jwt.py            # Supabase JWT validation, get_current_user dependency
│   ├── routers/
│   │   ├── books.py          # GET/POST/DELETE /books
│   │   ├── entries.py        # GET/POST/PUT/DELETE /books/{id}/entries
│   │   ├── reports.py        # GET /books/{id}/report/pdf + /excel
│   │   └── upload.py         # POST /upload/attachment
│   ├── models/
│   │   ├── book.py           # BookCreate, BookResponse Pydantic models
│   │   └── entry.py          # EntryCreate, EntryUpdate, EntryResponse
│   ├── db/
│   │   └── supabase.py       # Supabase service client (service role key)
│   └── utils/
│       ├── pdf.py            # generate_pdf(entries, summary) → bytes
│       └── excel.py          # generate_excel(entries, summary) → bytes
├── .env                       # NEVER commit
├── .env.example
├── requirements.txt
├── Procfile                   # web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
└── railway.json               # Railway config
```

### requirements.txt
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
supabase==2.4.2
python-jose[cryptography]==3.3.0
python-dotenv==1.0.1
openpyxl==3.1.2
reportlab==4.1.0
python-multipart==0.0.9
httpx==0.27.0
pydantic-settings==2.2.1
```

### Environment Variables (API)
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SUPABASE_JWT_SECRET=
```

### Auth Middleware Pattern (auth/jwt.py)
```python
from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError
from app.config import settings

async def get_current_user(authorization: str = Header(...)):
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"],
                             options={"verify_aud": False})
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate token")
```

### main.py pattern
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import books, entries, reports, upload

app = FastAPI(title="CashBook API", version="1.0.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

app.include_router(books.router, prefix="/api/v1/books", tags=["books"])
app.include_router(entries.router, prefix="/api/v1/books", tags=["entries"])
app.include_router(reports.router, prefix="/api/v1/books", tags=["reports"])
app.include_router(upload.router, prefix="/api/v1/upload", tags=["upload"])

@app.get("/health")
def health(): return {"status": "ok"}
```

---

## 3. Database Schema (run in Supabase SQL Editor)

```sql
-- Books table
create table public.books (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  currency text default 'PKR',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Entries table
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

-- Row Level Security
alter table public.books enable row level security;
alter table public.entries enable row level security;

create policy "Users own their books" on public.books
  for all using (auth.uid() = user_id);

create policy "Users own their entries" on public.entries
  for all using (auth.uid() = user_id);

-- Indexes for performance
create index entries_book_id_idx on public.entries(book_id);
create index entries_user_id_idx on public.entries(user_id);
create index entries_entry_date_idx on public.entries(entry_date);
```

---

## 4. Supabase Setup Checklist

- [ ] Create project at supabase.com
- [ ] Run SQL schema above in SQL Editor
- [ ] Enable Google OAuth: Authentication → Providers → Google
  - Add Google Client ID + Secret from Google Cloud Console
  - Add redirect URL: `https://xxxx.supabase.co/auth/v1/callback`
- [ ] Create Storage bucket named `attachments` (public: false)
- [ ] Copy Project URL and anon key to mobile .env
- [ ] Copy Project URL and service_role key to API .env
- [ ] Copy JWT Secret (Project Settings → API → JWT Secret) to API .env

---

## 5. Coding Rules

### General
- Always use TypeScript in mobile (strict mode, no `any`)
- Always use Pydantic models in FastAPI (no raw dicts)
- Never hardcode credentials — always use .env
- Every API endpoint must use `get_current_user` dependency
- Use `user_id` from JWT token — never trust user-supplied user_id

### Mobile
- Use Expo Router for all navigation (no React Navigation manually)
- **Route hierarchy rule:** If screen B is always opened from screen A, B must live in a subfolder under A. Convert `a.jsx` → `a/index.jsx` and add `a/b.jsx`. Example: profile is opened from settings → `settings/index.jsx` + `settings/profile.jsx`. The books folder already follows this: `books/index.jsx`, `books/[id].jsx`, `books/[id]/add-entry.jsx`.
- Use React Query for all data fetching — no raw useEffect + fetch
- Use Zustand only for auth state — everything else via React Query
- All colors from `constants/colors.ts` — no inline hex values
- All screens must handle loading, error, and empty states

### API
- All routers return typed Pydantic response models
- Use FastAPI's `Depends()` for auth on every protected endpoint
- DB queries always filter by `user_id` (defence in depth with RLS)
- Reports: PDF via ReportLab, Excel via openpyxl — return as FileResponse

### Git
- Never commit .env files
- Branch per feature: `feature/books-screen`, `feature/add-entry`
- Commit format: `feat: add cash-in entry form`

---

## 6. Key Implementation Notes

### Balance Calculation
- Always calculate on the API side: `SUM(amount) WHERE type='in'` minus `SUM(amount) WHERE type='out'`
- Running balance per entry = all previous entries in date+time order
- Never calculate balance in the mobile app (source of truth is DB)

### Offline Support
- React Query's `staleTime` and `cacheTime` provide basic offline read
- For offline writes: queue failed mutations, retry on reconnect using `onReconnect`

### Entry Date/Time
- Always store in UTC in the database
- Display in local timezone on device using `Intl.DateTimeFormat`

### PDF Report Structure
- Header: CashBook logo + book name + date range
- Summary row: Total In | Total Out | Net Balance
- Table: Date | Remark | Category | Payment Mode | In | Out | Balance

### Image Attachments
- Upload to Supabase Storage bucket `attachments/{user_id}/{entry_id}`
- Store only the URL in `entries.attachment_url`
- Use signed URLs for display (1 hour expiry)

---

## 7. Development Order

1. Set up Supabase project + run schema SQL
2. Init Expo project + install deps + configure NativeWind
3. Init FastAPI project + install deps + connect to Supabase
4. Implement auth flow (Google OAuth → session → authStore)
5. Build Books CRUD (API + mobile screens)
6. Build Entries CRUD (API + mobile screens)
7. Build Reports (PDF/Excel generation + mobile screen)
8. Add search, filters, attachments
9. Polish UI to match design screenshots
10. EAS Build → Play Store submission

---

## 8. Commands Reference

### Mobile
```bash
cd cashbook-mobile
npx expo start                  # Dev server (scan with Expo Go)
npx expo start --tunnel         # If local network issues
npx eas build --platform android --profile preview   # Test APK
npx eas build --platform android --profile production # Play Store AAB
```

### API
```bash
cd cashbook-api
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload   # Dev server at localhost:8000
```

### Deploy API to Railway
```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
railway init
railway up
```

---

## 9. Screen Skeleton Policy

**Rule:** Every screen in `cashbook-mobile/src/screens/` must always exist as a working skeleton.
A skeleton means: the file exists, renders without crashing, uses `useTheme()` for colors/fonts, and shows a placeholder UI with the correct layout structure.

**Current screens and their status:**

| Screen file | Route | Status |
|---|---|---|
| `BooksScreen.jsx` | `/(app)/books/index` | ✅ Complete |
| `BookDetailScreen.jsx` | `/(app)/books/[id]` | 🔲 Skeleton needed |
| `AddEntryScreen.jsx` | `/(app)/books/[id]/add-entry` | 🔲 Skeleton needed |
| `ReportsScreen.jsx` | `/(app)/books/[id]/reports` | 🔲 Skeleton needed |
| `SettingsScreen.jsx` | `/(app)/settings` | 🔲 Skeleton needed |
| `LoginScreen.jsx` | `/(auth)/login` | 🔲 Skeleton needed |
| `OnboardingScreen.jsx` | `/` (index) | 🔲 Skeleton needed |
| `ProfileScreen.jsx` | `/(app)/settings/profile` | 🔲 Skeleton needed |

**Skeleton requirements for every screen:**
- Uses `useTheme()` — no hardcoded colors
- Uses `Font.*` — no hardcoded fontFamily strings
- Header with back navigation where applicable
- Correct `SafeAreaView` + `StatusBar` setup
- Loading, empty, and error state placeholders
- All API calls go through `src/lib/api.js` stubs
- Data fetching via React Query hooks in `src/hooks/`

**Ongoing rule:** When a new screen is added or an existing one is modified during development,
always update it to match the current theme system (`useTheme`, `Font`, `CARD_ACCENTS`, etc.)
and keep this table up to date.

---

## 10. Service Responsibilities

What the app needs, and what handles it:

| Need | Handled by |
|---|---|
| Login / signup | Supabase Auth |
| Save entries (date, amount, type, note) | Supabase database |
| Show entries to the user | React Native screens pulling from Supabase |
| Keep one user's data separate from another's | Supabase Row Level Security |
| Sync across devices | Supabase (automatic) |
| Receipts / photo attachments | Supabase Storage |
| Reminders / notifications | Expo Push Notifications (free) |

No extra backend services are needed beyond Supabase + Expo.

### Offline Mode Decision

Cash book users often add entries without internet (in a shop, on the road). Two options:

**Option A — Require internet (v1 default)**
- Simpler to build, ships faster
- Show a clear "no connection" error when offline
- Acceptable for v1

**Option B — Local-first with sync (future)**
- Save entries locally first using AsyncStorage or SQLite (via `expo-sqlite`)
- Sync to Supabase when connection is restored using React Query's `onReconnect` / mutation queue
- Better user experience, more engineering effort
- Implement after v1 is stable
