from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class BookCreate(BaseModel):
    name: str
    currency: str = "PKR"


class BookUpdate(BaseModel):
    name: Optional[str] = None
    currency: Optional[str] = None


class BookResponse(BaseModel):
    id: str
    user_id: str
    name: str
    currency: str
    net_balance: float = 0.0
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_entry_at: Optional[str] = None
