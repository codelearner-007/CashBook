from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import books, entries, reports, upload, profile, admin

app = FastAPI(title="CashBook API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router, prefix="/api/v1/profile",  tags=["profile"])
app.include_router(books.router,   prefix="/api/v1/books",    tags=["books"])
app.include_router(entries.router, prefix="/api/v1/books",    tags=["entries"])
app.include_router(reports.router, prefix="/api/v1/books",    tags=["reports"])
app.include_router(upload.router,  prefix="/api/v1/upload",   tags=["upload"])
app.include_router(admin.router,   prefix="/api/v1/admin",    tags=["admin"])


@app.get("/health")
def health():
    return {"status": "ok"}
