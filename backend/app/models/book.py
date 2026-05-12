from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class BookCreate(BaseModel):
    name: str
    currency: str = "PKR"


class BookUpdate(BaseModel):
    name: Optional[str] = None
    currency: Optional[str] = None


class FieldSettingsBody(BaseModel):
    showCustomer: bool = False
    showSupplier: bool = False
    showCategory: bool = False
    showAttachment: bool = False


class BookResponse(BaseModel):
    id: str
    user_id: str
    name: str
    currency: str
    net_balance: float = 0.0
    show_customer: bool = False
    show_supplier: bool = False
    show_category: bool = False
    show_attachment: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_entry_at: Optional[str] = None
