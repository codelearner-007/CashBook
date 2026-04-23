# TODO: Implement when Supabase env is ready
# See CLAUDE.md for full implementation guide
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="CashBook API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
def health(): return {"status": "ok"}

# Routers to add when backend is implemented:
# from app.routers import books, entries, reports, upload
# app.include_router(books.router, prefix="/api/v1/books", tags=["books"])
# app.include_router(entries.router, prefix="/api/v1/books", tags=["entries"])
# app.include_router(reports.router, prefix="/api/v1/books", tags=["reports"])
# app.include_router(upload.router, prefix="/api/v1/upload", tags=["upload"])
