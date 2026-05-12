from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PaymentModeCreate(BaseModel):
    name: str


class PaymentModeUpdate(BaseModel):
    name: Optional[str] = None


class PaymentModeResponse(BaseModel):
    id: str
    book_id: str
    user_id: str
    name: str
    created_at: datetime
