# CLAUDE.md — Backend (cashbook/backend)

> **Auto-update rule:** Whenever any file inside `backend/` is edited (router, model, auth, config, utils), re-read that file and update the matching section in this file before finishing the task.

---

## Folder Structure

```
backend/
├── app/
│   ├── main.py               # FastAPI app instance, CORS, router registration
│   ├── config.py             # Pydantic BaseSettings — reads from .env
│   ├── auth/
│   │   └── jwt.py            # Supabase JWT validation, get_current_user dependency
│   ├── routers/
│   │   ├── profile.py        # GET/PUT /api/v1/profile
│   │   ├── books.py          # GET/POST/PUT/DELETE /api/v1/books
│   │   ├── entries.py        # GET/POST/PUT/DELETE /api/v1/books/{id}/entries + summary
│   │   ├── admin.py          # GET/PATCH /api/v1/admin/users (superadmin only)
│   │   ├── reports.py        # GET /api/v1/books/{id}/report/pdf + /excel
│   │   └── upload.py         # POST /api/v1/upload/attachment
│   ├── models/
│   │   ├── profile.py        # ProfileResponse, ProfileUpdate, UserWithStats, StatusUpdate
│   │   ├── book.py           # BookCreate, BookUpdate, BookResponse
│   │   └── entry.py          # EntryCreate, EntryUpdate, EntryResponse, BookSummary
│   ├── db/
│   │   └── supabase.py       # Supabase service client singleton
│   └── utils/
│       ├── pdf.py            # generate_pdf(book_name, currency, entries, summary, ...) → bytes
│       └── excel.py          # generate_excel(book_name, currency, entries, summary, ...) → bytes
├── requirements.txt
├── Procfile                  # web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
├── .env                      # NEVER commit
└── .env.example
```

---

## Tech Stack

| Concern | Library |
|---|---|
| Framework | FastAPI 0.111 |
| Server | Uvicorn (ASGI) |
| Database client | supabase-py 2.4 |
| JWT validation | python-jose[cryptography] |
| PDF export | ReportLab 4.1 |
| Excel export | openpyxl 3.1 |
| Config | pydantic-settings |
| HTTP client | httpx |

---

## Environment Variables

```
SUPABASE_URL=          # Project URL (https://xxx.supabase.co)
SUPABASE_SERVICE_KEY=  # service_role key (not anon key!)
SUPABASE_JWT_SECRET=   # JWT secret from Project Settings → API
```

**Never use the anon key on the backend.** The service key bypasses RLS — always add `user_id` filters manually in every query.

---

## Auth Middleware (`app/auth/jwt.py`)

```python
async def get_current_user(authorization: str = Header(...)) -> str:
    token = authorization.removeprefix("Bearer ").strip()
    payload = jwt.decode(token, settings.SUPABASE_JWT_SECRET,
                         algorithms=["HS256"], options={"verify_aud": False})
    user_id = payload.get("sub")   # UUID of the authenticated user
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_id
```

**Rule:** Every protected endpoint must declare `user_id: str = Depends(get_current_user)` and filter all DB queries by that `user_id`. Never trust a `user_id` from the request body.

---

## API Endpoint Reference

All routes are prefixed `/api/v1`. All protected routes require `Authorization: Bearer <JWT>`.

### Profile (`routers/profile.py`) — prefix `/api/v1/profile`

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `` | Get authenticated user's profile | ✅ |
| PUT | `` | Update own profile (full_name, phone, avatar_url) | ✅ |

---

### Books (`routers/books.py`) — prefix `/api/v1/books`

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `` | List all books for current user (includes net_balance, last_entry_at) | ✅ |
| POST | `` | Create a new book | ✅ |
| PUT | `/{book_id}` | Rename or update book | ✅ |
| DELETE | `/{book_id}` | Delete a book (cascades entries) | ✅ |

**GET /books** uses the `get_books_with_summary` PostgreSQL function — single DB round-trip, includes pre-computed `net_balance` (from trigger) and `last_entry_at`.

---

### Entries (`routers/entries.py`) — prefix `/api/v1/books`

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/{book_id}/entries` | List entries (optional: date_from, date_to, type filters) | ✅ |
| POST | `/{book_id}/entries` | Create an entry | ✅ |
| PUT | `/{book_id}/entries/{entry_id}` | Update an entry | ✅ |
| DELETE | `/{book_id}/entries/{entry_id}` | Delete an entry | ✅ |
| GET | `/{book_id}/summary` | Get balance summary (via DB function) | ✅ |

**POST /entries body:**
```json
{
  "type": "in",
  "amount": 5000.00,
  "remark": "optional note",
  "category": "optional",
  "payment_mode": "cash",
  "contact_name": "optional",
  "entry_date": "YYYY-MM-DD",
  "entry_time": "HH:MM"
}
```

**GET /summary response:**
```json
{ "total_in": 10000.0, "total_out": 4500.0, "net_balance": 5500.0 }
```

**Balance rule:** `books.net_balance` is maintained by a DB trigger — never recompute in Python. Summary endpoint uses `get_book_summary()` PostgreSQL function.

---

### Admin (`routers/admin.py`) — prefix `/api/v1/admin`

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/users` | List all non-superadmin users with stats | superadmin only |
| PATCH | `/users/{user_id}/status` | Toggle `is_active` | superadmin only |
| GET | `/users/{user_id}/books` | View any user's books | superadmin only |

**Superadmin guard** is a FastAPI dependency (`require_superadmin`) that checks the caller's profile role. Returns 403 if not superadmin.

**PATCH /users/:id/status body:** `{ "is_active": true }`

---

### Reports (`routers/reports.py`) — prefix `/api/v1/books`

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/{book_id}/report/pdf` | Download PDF report | ✅ |
| GET | `/{book_id}/report/excel` | Download Excel report | ✅ |

**Query params:** `?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`

**PDF structure:** Header (book name + date range) → Summary row (In/Out/Balance) → Entries table with running balance column.

---

### Upload (`routers/upload.py`) — prefix `/api/v1/upload`

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/attachment` | Upload entry photo to Supabase Storage | ✅ |

- Body: `multipart/form-data` with `entry_id` (form field) + `file` (image)
- Max size: 5 MB; allowed types: JPEG, PNG, WebP, HEIC
- Path in bucket: `{user_id}/{entry_id}/attachment.{ext}`
- Returns: `{ "attachment_url": "<signed-url-1h>", "path": "..." }`

---

## Pydantic Models

### `models/profile.py`
```python
class ProfileResponse:    id, email, full_name, phone, avatar_url, role, is_active, created_at, updated_at
class ProfileUpdate:      full_name?, phone?, avatar_url?
class UserWithStats:      ProfileResponse + book_count, entry_count, storage_mb
class StatusUpdate:       is_active: bool
```

### `models/book.py`
```python
class BookCreate:    name, currency (default PKR)
class BookUpdate:    name?, currency?
class BookResponse:  id, user_id, name, currency, net_balance, created_at, updated_at, last_entry_at?
```

### `models/entry.py`
```python
class EntryCreate:   type, amount, remark?, category?, payment_mode, contact_name?, attachment_url?, entry_date, entry_time
class EntryUpdate:   all fields optional
class EntryResponse: EntryCreate fields + id, book_id, user_id, created_at
                     Validator strips HH:MM:SS → HH:MM (Postgres time type)
class BookSummary:   total_in, total_out, net_balance
```

---

## Database Query Patterns

**Always filter by user_id** (defence in depth with service role bypassing RLS):

```python
# ✅ Correct
sb.table("entries").select("*").eq("book_id", book_id).eq("user_id", user_id).execute()

# ❌ Wrong — missing user_id filter
sb.table("entries").select("*").eq("book_id", book_id).execute()
```

**Use DB functions for aggregation:**
```python
# Books with balance and last_entry_at — single round-trip
sb.rpc("get_books_with_summary", {"p_user_id": user_id}).execute()

# Summary for a book
sb.rpc("get_book_summary", {"p_book_id": book_id, "p_user_id": user_id}).execute()
```

---

## Main App Setup (`app/main.py`)

```python
app.include_router(profile.router, prefix="/api/v1/profile",  tags=["profile"])
app.include_router(books.router,   prefix="/api/v1/books",    tags=["books"])
app.include_router(entries.router, prefix="/api/v1/books",    tags=["entries"])
app.include_router(reports.router, prefix="/api/v1/books",    tags=["reports"])
app.include_router(upload.router,  prefix="/api/v1/upload",   tags=["upload"])
app.include_router(admin.router,   prefix="/api/v1/admin",    tags=["admin"])
```

---

## Dev Commands

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
# Copy .env.example → .env and fill values
uvicorn app.main:app --reload  # Dev server at http://localhost:8000
```

Swagger UI: `http://localhost:8000/docs`

---

## Deployment (Railway)

- `Procfile`: `web: uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Set all 3 env vars in Railway dashboard
- Health check endpoint: `GET /health`

---

## When to Update This File

- New router/endpoint added or endpoint shape changes
- Pydantic model added or modified
- New env variable required
- Auth middleware logic changes
- New DB function used or utility added
