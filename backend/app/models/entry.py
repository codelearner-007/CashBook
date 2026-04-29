from pydantic import BaseModel, validator
from datetime import datetime
from typing import Optional, Literal
from decimal import Decimal


class EntryCreate(BaseModel):
    type: Literal["in", "out"]
    amount: Decimal
    remark: Optional[str] = None
    category: Optional[str] = None
    payment_mode: str = "cash"
    contact_name: Optional[str] = None
    customer_id: Optional[str] = None
    supplier_id: Optional[str] = None
    attachment_url: Optional[str] = None
    entry_date: str   # YYYY-MM-DD
    entry_time: str   # HH:MM


class EntryUpdate(BaseModel):
    type: Optional[Literal["in", "out"]] = None
    amount: Optional[Decimal] = None
    remark: Optional[str] = None
    category: Optional[str] = None
    payment_mode: Optional[str] = None
    contact_name: Optional[str] = None
    customer_id: Optional[str] = None
    supplier_id: Optional[str] = None
    attachment_url: Optional[str] = None
    entry_date: Optional[str] = None
    entry_time: Optional[str] = None


class EntryResponse(BaseModel):
    id: str
    book_id: str
    user_id: str
    type: str
    amount: float
    remark: Optional[str] = None
    category: Optional[str] = None
    payment_mode: str
    contact_name: Optional[str] = None
    customer_id: Optional[str] = None
    supplier_id: Optional[str] = None
    attachment_url: Optional[str] = None
    entry_date: str
    entry_time: str
    created_at: datetime

    @validator("entry_time", pre=True)
    def strip_seconds(cls, v: str) -> str:
        """Normalize HH:MM:SS -> HH:MM (Postgres time columns include seconds)."""
        if v and len(v) == 8:
            return v[:5]
        return v

    @validator("entry_date", pre=True)
    def normalize_date(cls, v) -> str:
        """Accept both date objects and ISO strings."""
        return str(v)[:10]


class BookSummary(BaseModel):
    total_in: float
    total_out: float
    net_balance: float
