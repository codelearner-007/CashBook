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
│   │   ├── books.py          # GET/POST/DELETE /api/v1/books
│   │   ├── entries.py        # GET/POST/PUT/DELETE /api/v1/books/{id}/entries
│   │   ├── reports.py        # GET /api/v1/books/{id}/report/pdf + /excel
│   │   └── upload.py         # POST /api/v1/upload/attachment
│   ├── models/
│   │   ├── book.py           # BookCreate, BookResponse Pydantic models
│   │   └── entry.py          # EntryCreate, EntryUpdate, EntryResponse
│   ├── db/
│   │   └── supabase.py       # Supabase service client (service role key)
│   └── utils/
│       ├── pdf.py            # generate_pdf(entries, summary) → bytes
│       └── excel.py          # generate_excel(entries, summary) → bytes
├── requirements.txt
├── Procfile                  # web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
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

**Never use the anon key on the backend.** The service key bypasses RLS — use it only for trusted server operations and always add `user_id` filters manually.

---

## Auth Middleware (`app/auth/jwt.py`)

```python
async def get_current_user(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    payload = jwt.decode(token, settings.SUPABASE_JWT_SECRET,
                         algorithms=["HS256"], options={"verify_aud": False})
    user_id = payload.get("sub")   # UUID string of the authenticated user
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_id
```

**Rule:** Every protected endpoint must declare `user_id: str = Depends(get_current_user)` and filter all DB queries by that `user_id`. Never trust a `user_id` that comes from the request body or query params.

---

## API Endpoint Reference

All routes are prefixed `/api/v1`. All protected routes require `Authorization: Bearer <JWT>`.

### Books (`routers/books.py`)

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/books` | List all books for current user | ✅ |
| POST | `/books` | Create a new book | ✅ |
| DELETE | `/books/{book_id}` | Delete a book (cascades entries) | ✅ |

**GET /books response:** `List[BookResponse]`
- Each book includes `net_balance` (calculated: SUM in − SUM out)
- Ordered by `created_at DESC`

**POST /books body:**
```json
{ "name": "string", "currency": "PKR" }
```

---

### Entries (`routers/entries.py`)

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/books/{book_id}/entries` | List entries for a book | ✅ |
| POST | `/books/{book_id}/entries` | Create an entry | ✅ |
| PUT | `/books/{book_id}/entries/{entry_id}` | Update an entry | ✅ |
| DELETE | `/books/{book_id}/entries/{entry_id}` | Delete an entry | ✅ |
| GET | `/books/{book_id}/summary` | Get balance summary | ✅ |

**GET /entries query params:** `?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&type=in|out`

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
{ "total_in": 10000, "total_out": 4500, "net_balance": 5500 }
```

---

### Reports (`routers/reports.py`)

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/books/{book_id}/report/pdf` | Download PDF report | ✅ |
| GET | `/books/{book_id}/report/excel` | Download Excel report | ✅ |

**Query params:** `?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`

**PDF structure:**
- Header: CashBook logo + book name + date range
- Summary row: Total In | Total Out | Net Balance
- Table: Date | Remark | Category | Payment Mode | In | Out | Running Balance

---

### Upload (`routers/upload.py`)

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/upload/attachment` | Upload entry photo to Supabase Storage | ✅ |

- Uploads to `attachments/{user_id}/{entry_id}` in Supabase Storage bucket `attachments`
- Returns signed URL (1-hour expiry) as `attachment_url`
- Frontend stores only this URL in `entries.attachment_url`

---

## Pydantic Models

### `models/book.py`

```python
class BookCreate(BaseModel):
    name: str
    currency: str = "PKR"

class BookResponse(BaseModel):
    id: str
    user_id: str
    name: str
    currency: str
    created_at: datetime
    net_balance: float = 0.0
```

### `models/entry.py`

```python
class EntryCreate(BaseModel):
    type: Literal["in", "out"]
    amount: Decimal
    remark: Optional[str] = None
    category: Optional[str] = None
    payment_mode: str = "cash"
    contact_name: Optional[str] = None
    attachment_url: Optional[str] = None
    entry_date: date
    entry_time: time

class EntryUpdate(BaseModel):
    type: Optional[Literal["in", "out"]] = None
    amount: Optional[Decimal] = None
    remark: Optional[str] = None
    category: Optional[str] = None
    payment_mode: Optional[str] = None
    contact_name: Optional[str] = None
    entry_date: Optional[date] = None
    entry_time: Optional[time] = None

class EntryResponse(EntryCreate):
    id: str
    book_id: str
    user_id: str
    created_at: datetime
```

---

## Database Query Patterns

All queries go through the Supabase service client in `db/supabase.py`.

**Always filter by user_id** — even though RLS enforces this on the DB side, filter in code too (defence in depth):

```python
# ✅ Correct — filter by both book_id and user_id
supabase.table("entries")\
  .select("*")\
  .eq("book_id", book_id)\
  .eq("user_id", user_id)\
  .order("entry_date", desc=True)\
  .execute()

# ❌ Wrong — missing user_id filter
supabase.table("entries").select("*").eq("book_id", book_id).execute()
```

**Balance calculation (always server-side):**
```python
# Calculate net balance for a book
result = supabase.table("entries")\
  .select("type, amount")\
  .eq("book_id", book_id)\
  .eq("user_id", user_id)\
  .execute()

total_in  = sum(e["amount"] for e in result.data if e["type"] == "in")
total_out = sum(e["amount"] for e in result.data if e["type"] == "out")
net = total_in - total_out
```

---

## Main App Setup (`app/main.py`)

```python
app = FastAPI(title="CashBook API", version="1.0.0")

app.add_middleware(CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.include_router(books.router,   prefix="/api/v1/books",   tags=["books"])
app.include_router(entries.router, prefix="/api/v1/books",   tags=["entries"])
app.include_router(reports.router, prefix="/api/v1/books",   tags=["reports"])
app.include_router(upload.router,  prefix="/api/v1/upload",  tags=["upload"])

@app.get("/health")
def health(): return {"status": "ok"}
```

---

## Dev Commands

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload     # Dev server at http://localhost:8000
```

Docs available at `http://localhost:8000/docs` (Swagger UI) while dev server is running.

---

## Deployment (Railway)

- `Procfile`: `web: uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Set all 3 env vars in Railway dashboard (never in code)
- Health check endpoint: `GET /health`

---

## When to Update This File

Update the relevant section in this file whenever:
- A new router/endpoint is added or an existing endpoint's request/response shape changes
- A Pydantic model is added or modified
- A new env variable is required
- The auth middleware logic changes
- A new utility (PDF, Excel, etc.) is added to `utils/`
