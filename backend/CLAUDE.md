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
│   │   ├── contacts.py       # GET/POST/PUT/DELETE /api/v1/books/{id}/customers + /suppliers
│   │   ├── categories.py     # GET/POST/PUT/DELETE /api/v1/books/{id}/categories + /{id}/entries
│   │   ├── admin.py          # GET/PATCH /api/v1/admin/* (superadmin only)
│   │   ├── reports.py        # GET /api/v1/books/{id}/report/pdf + /excel
│   │   └── upload.py         # POST /api/v1/upload/attachment
│   ├── models/
│   │   ├── profile.py        # ProfileResponse, ProfileUpdate, UserWithStats, StatusUpdate
│   │   ├── book.py           # BookCreate, BookUpdate, BookResponse
│   │   ├── entry.py          # EntryCreate, EntryUpdate, EntryResponse, BookSummary
│   │   ├── contact.py        # ContactCreate, ContactUpdate, ContactResponse, ContactWithBalance
│   │   └── category.py       # CategoryCreate, CategoryUpdate, CategoryResponse
│   ├── db/
│   │   └── supabase.py       # Supabase service client singleton
│   └── utils/
│       ├── pdf.py            # generate_pdf(...) → bytes
│       └── excel.py          # generate_excel(...) → bytes
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
| Database client | supabase-py 2.4 (service role — bypasses RLS) |
| JWT validation | python-jose[cryptography] (HS256, no aud check) |
| PDF export | ReportLab 4.1 |
| Excel export | openpyxl 3.1 |
| Config | pydantic-settings |
| HTTP client | httpx |

---

## Environment Variables

```
SUPABASE_URL=          # Project URL (https://xxx.supabase.co)
SUPABASE_SERVICE_KEY=  # service_role key (NOT the anon key)
SUPABASE_JWT_SECRET=   # JWT secret from Project Settings → API
```

**Never use the anon key on the backend.** The service key bypasses RLS — always add `user_id` filters manually in every query (defence in depth).

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

### Superadmin guard (`routers/admin.py`)

```python
async def require_superadmin(user_id: str = Depends(get_current_user)) -> str:
    sb = get_supabase()
    res = sb.table("profiles").select("role").eq("id", user_id).single().execute()
    if not res.data or res.data["role"] != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return user_id
```

Used as `admin_id: str = Depends(require_superadmin)` on every admin endpoint.

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
| GET | `` | List all books for current user (net_balance, last_entry_at) | ✅ |
| POST | `` | Create a new book | ✅ |
| PUT | `/{book_id}` | Rename or update book currency | ✅ |
| DELETE | `/{book_id}` | Delete a book (cascades entries) | ✅ |

**GET /books** — tries `get_books_with_summary` RPC first (single round-trip, includes pre-computed `net_balance` and `last_entry_at`). Falls back to a direct table query if the RPC is not yet defined (migration 002 not run).

**POST /books** — returns the new book immediately; `net_balance` defaults to 0 (trigger fires on first entry).

---

### Entries (`routers/entries.py`) — prefix `/api/v1/books`

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/{book_id}/entries` | List entries (optional: date_from, date_to, type filters) | ✅ |
| POST | `/{book_id}/entries` | Create an entry | ✅ |
| PUT | `/{book_id}/entries/{entry_id}` | Update an entry | ✅ |
| DELETE | `/{book_id}/entries/{entry_id}` | Delete an entry | ✅ |
| GET | `/{book_id}/summary` | Get balance summary (via DB function) | ✅ |

All entry endpoints call `_verify_book(sb, book_id, user_id)` first — raises 404 if book doesn't belong to user.

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

**Balance rule:** `books.net_balance` is maintained by a DB trigger — never recompute in Python. The summary endpoint uses the `get_book_summary()` PostgreSQL function with a direct-query fallback.

---

### Admin (`routers/admin.py`) — prefix `/api/v1/admin`

All endpoints require `require_superadmin` dependency (403 if not superadmin).

| Method | Path | Description |
|---|---|---|
| GET | `/users` | All non-superadmin profiles with computed stats (book_count, entry_count, storage_mb) |
| PATCH | `/users/{user_id}/status` | Toggle `is_active`; cannot deactivate superadmin |
| GET | `/users/{user_id}/books` | Any user's books (with net_balance and last_entry_at) |

**GET /users** — N+1 pattern: one extra query per user for book count and entry count. Acceptable for admin dashboards at current scale.

**GET /users/:id/books** — tries `get_books_with_summary` RPC first, falls back to direct table query. Same fallback pattern as `/books`.

**PATCH /users/:id/status body:** `{ "is_active": true }`

---

### Reports (`routers/reports.py`) — prefix `/api/v1/books`

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/{book_id}/report/pdf` | Download PDF report | ✅ |
| GET | `/{book_id}/report/excel` | Download Excel report | ✅ |

Query params: `?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`

---

### Upload (`routers/upload.py`) — prefix `/api/v1/upload`

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/attachment` | Upload entry photo to Supabase Storage | ✅ |
| POST | `/avatar` | Upload profile photo to Supabase Storage (`avatars` bucket) | ✅ |

- `/attachment` — `multipart/form-data` with `entry_id` (form field) + `file` (image); path `{user_id}/{entry_id}/attachment.{ext}`; returns signed URL (1 h)
- `/avatar` — `multipart/form-data` with `file` (image only); path `{user_id}/profile.{ext}`; creates/uses public `avatars` bucket; updates `profiles.avatar_url`; returns `{ "avatar_url": "<public-url>" }`
- Both: max 5 MB; allowed types: JPEG, PNG, WebP, HEIC

---

## Pydantic Models

### `models/profile.py`
```python
class ProfileResponse:    id, email, full_name, phone, avatar_url, role, is_active, currency (default 'PKR'), created_at, updated_at
class ProfileUpdate:      full_name?, phone?, avatar_url?, currency?
class UserWithStats:      ProfileResponse + book_count, entry_count, storage_mb
class StatusUpdate:       is_active: bool
```

### `models/book.py`
```python
class BookCreate:    name, currency (default PKR)
class BookUpdate:    name?, currency?
class BookResponse:  id, user_id, name, currency, net_balance (float, default 0), created_at, updated_at?, last_entry_at?
```

### `models/entry.py`
```python
class EntryCreate:   type, amount, remark?, category?, payment_mode, contact_name?, customer_id?, supplier_id?, attachment_url?, entry_date, entry_time
class EntryUpdate:   all EntryCreate fields optional
class EntryResponse: EntryCreate fields + id, book_id, user_id, created_at
                     Validator strips HH:MM:SS → HH:MM (Postgres time type)
class BookSummary:   total_in, total_out, net_balance
```

### `models/contact.py`
```python
class ContactCreate:      name, phone?, email?, address?
class ContactUpdate:      all fields optional
class ContactResponse:    id, book_id, user_id, name, phone?, email?, address?, total_in, total_out, net_balance, created_at, updated_at
class ContactWithBalance: ContactResponse + balance (mirrors net_balance — kept for API backwards compat)
```

### `models/category.py`
```python
class CategoryCreate:   name (str, required)
class CategoryUpdate:   name? (str, optional)
class CategoryResponse: id, book_id, user_id, name, total_in, total_out, net_balance, created_at
```

### Categories (`routers/categories.py`) — prefix `/api/v1/books`

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/{book_id}/categories` | List all categories for a book (ordered by created_at) | ✅ |
| POST | `/{book_id}/categories` | Create category (name required, unique per book) | ✅ |
| PUT | `/{book_id}/categories/{id}` | Rename category | ✅ |
| DELETE | `/{book_id}/categories/{id}` | Delete category (entries.category_id → NULL via FK) | ✅ |
| GET | `/{book_id}/categories/{id}/entries` | Entries assigned to this category | ✅ |

**Balance rule:** `total_in`, `total_out`, `net_balance` are maintained by `trg_update_category_balance` (DB trigger on `entries`). Read directly from the row — never recompute in Python.
**Uniqueness:** category names are case-insensitive unique per book (DB UNIQUE constraint + `ilike` pre-check in the router for a friendly 409 error).

---

### Contacts endpoints (`routers/contacts.py`) — prefix `/api/v1/books`

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/{book_id}/customers` | List customers with balance | ✅ |
| POST | `/{book_id}/customers` | Create customer (name required) | ✅ |
| GET | `/{book_id}/customers/{id}` | Get customer with balance | ✅ |
| PUT | `/{book_id}/customers/{id}` | Update customer (not balance) | ✅ |
| DELETE | `/{book_id}/customers/{id}` | Delete customer (entries keep contact_name) | ✅ |
| GET | `/{book_id}/customers/{id}/entries` | Entries linked to this customer | ✅ |
| GET | `/{book_id}/suppliers` | List suppliers with balance | ✅ |
| POST | `/{book_id}/suppliers` | Create supplier | ✅ |
| GET | `/{book_id}/suppliers/{id}` | Get supplier with balance | ✅ |
| PUT | `/{book_id}/suppliers/{id}` | Update supplier | ✅ |
| DELETE | `/{book_id}/suppliers/{id}` | Delete supplier | ✅ |
| GET | `/{book_id}/suppliers/{id}/entries` | Entries linked to this supplier | ✅ |

**Balance rule:** `total_in`, `total_out`, `net_balance` are stored columns maintained by `trg_update_contact_balance` (DB trigger on `entries`). Read them directly from the row — never recompute in Python. `balance` in `ContactWithBalance` mirrors `net_balance`.

---

## Database Query Patterns

**Always filter by user_id** (service key bypasses RLS):

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

**Fallback pattern** (used in books.py and admin.py when RPC may not exist):
```python
try:
    result = sb.rpc("get_books_with_summary", {"p_user_id": uid}).execute()
    return result.data or []
except Exception:
    result = sb.table("books").select("*").eq("user_id", uid).order("created_at", desc=True).execute()
    return [{**b, "net_balance": b.get("net_balance", 0), "last_entry_at": None} for b in (result.data or [])]
```

---

## Main App Setup (`app/main.py`)

```python
app.include_router(profile.router, prefix="/api/v1/profile",  tags=["profile"])
app.include_router(books.router,   prefix="/api/v1/books",    tags=["books"])
app.include_router(entries.router, prefix="/api/v1/books",    tags=["entries"])
app.include_router(reports.router, prefix="/api/v1/books",    tags=["reports"])
app.include_router(upload.router,  prefix="/api/v1/upload",   tags=["upload"])
app.include_router(admin.router,    prefix="/api/v1/admin",    tags=["admin"])
app.include_router(contacts.router,    prefix="/api/v1/books",    tags=["contacts"])
app.include_router(categories.router,  prefix="/api/v1/books",    tags=["categories"])
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
- Health check endpoint: `GET /health` → `{"status": "ok"}`

---

## When to Update This File

- New router/endpoint added or endpoint shape changes
- Pydantic model added or field modified
- New env variable required
- Auth middleware logic changes
- New DB function used or fallback pattern added
- Admin endpoints' stats computation method changes
