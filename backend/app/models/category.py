from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class CategoryCreate(BaseModel):
    name: str


class CategoryUpdate(BaseModel):
    name: Optional[str] = None


class CategoryResponse(BaseModel):
    id: str
    book_id: str
    user_id: str
    name: str
    total_in: float
    total_out: float
    net_balance: float
    created_at: datetime
