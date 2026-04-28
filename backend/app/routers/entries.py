from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from app.auth.jwt import get_current_user
from app.db.supabase import get_supabase
from app.models.entry import EntryCreate, EntryUpdate, EntryResponse, BookSummary

router = APIRouter()


def _verify_book(sb, book_id: str, user_id: str):
    """Raise 404 if the book doesn't belong to this user."""
    res = sb.table("books").select("id").eq("id", book_id).eq("user_id", user_id).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Book not found")


@router.get("/{book_id}/entries", response_model=List[EntryResponse])
async def get_entries(
    book_id: str,
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    user_id: str = Depends(get_current_user),
):
    sb = get_supabase()
    _verify_book(sb, book_id, user_id)

    q = (
        sb.table("entries")
        .select("*")
        .eq("book_id", book_id)
        .eq("user_id", user_id)
    )
    if date_from:
        q = q.gte("entry_date", date_from)
    if date_to:
        q = q.lte("entry_date", date_to)
    if type in ("in", "out"):
        q = q.eq("type", type)

    result = q.order("entry_date", desc=True).order("entry_time", desc=True).execute()
    return result.data or []


@router.post("/{book_id}/entries", response_model=EntryResponse, status_code=201)
async def create_entry(
    book_id: str,
    payload: EntryCreate,
    user_id: str = Depends(get_current_user),
):
    sb = get_supabase()
    _verify_book(sb, book_id, user_id)

    result = sb.table("entries").insert({
        "book_id": book_id,
        "user_id": user_id,
        "type": payload.type,
        "amount": float(payload.amount),
        "remark": payload.remark,
        "category": payload.category,
        "payment_mode": payload.payment_mode,
        "contact_name": payload.contact_name,
        "attachment_url": payload.attachment_url,
        "entry_date": payload.entry_date,
        "entry_time": payload.entry_time,
    }).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create entry")
    return result.data[0]


@router.put("/{book_id}/entries/{entry_id}", response_model=EntryResponse)
async def update_entry(
    book_id: str,
    entry_id: str,
    payload: EntryUpdate,
    user_id: str = Depends(get_current_user),
):
    sb = get_supabase()
    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items()}
    if "amount" in update_data and update_data["amount"] is not None:
        update_data["amount"] = float(update_data["amount"])

    check = (
        sb.table("entries")
        .select("id")
        .eq("id", entry_id)
        .eq("book_id", book_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not check.data:
        raise HTTPException(status_code=404, detail="Entry not found")

    sb.table("entries").update(update_data).eq("id", entry_id).eq("book_id", book_id).eq("user_id", user_id).execute()

    result = (
        sb.table("entries")
        .select("*")
        .eq("id", entry_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    return result.data[0]


@router.delete("/{book_id}/entries/{entry_id}", status_code=204)
async def delete_entry(
    book_id: str,
    entry_id: str,
    user_id: str = Depends(get_current_user),
):
    sb = get_supabase()
    check = (
        sb.table("entries")
        .select("id")
        .eq("id", entry_id)
        .eq("book_id", book_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not check.data:
        raise HTTPException(status_code=404, detail="Entry not found")
    sb.table("entries").delete().eq("id", entry_id).eq("book_id", book_id).eq("user_id", user_id).execute()


@router.get("/{book_id}/summary", response_model=BookSummary)
async def get_summary(book_id: str, user_id: str = Depends(get_current_user)):
    sb = get_supabase()
    _verify_book(sb, book_id, user_id)
    try:
        result = sb.rpc("get_book_summary", {"p_book_id": book_id, "p_user_id": user_id}).execute()
        row = result.data[0] if result.data else {}
    except Exception:
        # Fallback: compute directly if RPC not yet created (migration 002 not run)
        result = (
            sb.table("entries")
            .select("type, amount")
            .eq("book_id", book_id)
            .eq("user_id", user_id)
            .execute()
        )
        rows = result.data or []
        total_in  = sum(r["amount"] for r in rows if r["type"] == "in")
        total_out = sum(r["amount"] for r in rows if r["type"] == "out")
        row = {"total_in": total_in, "total_out": total_out, "net_balance": total_in - total_out}
    return {
        "total_in":    float(row.get("total_in", 0)),
        "total_out":   float(row.get("total_out", 0)),
        "net_balance": float(row.get("net_balance", 0)),
    }
