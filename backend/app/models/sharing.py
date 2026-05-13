from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any


class ScreensConfig(BaseModel):
    entries:       bool = True
    categories:    bool = False
    contacts:      bool = False
    payment_modes: bool = False
    reports:       bool = False
    settings:      bool = False


class ShareCreate(BaseModel):
    email:   str
    screens: ScreensConfig = ScreensConfig()
    rights:  str = "view"


class ShareUpdate(BaseModel):
    screens: Optional[ScreensConfig] = None
    rights:  Optional[str] = None


class CollaboratorProfile(BaseModel):
    id:         str
    full_name:  Optional[str] = None
    email:      str
    avatar_url: Optional[str] = None


class ShareResponse(BaseModel):
    id:           str
    book_id:      str
    owner_id:     str
    shared_with:  CollaboratorProfile
    screens:      Dict[str, Any]
    rights:       str
    created_at:   datetime


class SharedBookResponse(BaseModel):
    # Core book fields
    id:              str
    name:            str
    currency:        str
    net_balance:     float = 0.0
    last_entry_at:   Optional[str] = None
    show_customer:   bool = False
    show_supplier:   bool = False
    show_category:   bool = False
    show_attachment: bool = False
    # Share metadata
    share_id:    str
    rights:      str
    screens:     Dict[str, Any]
    owner_id:    str
    owner_name:  Optional[str] = None
    owner_email: str
