from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.auth.jwt import get_current_user
from app.db.supabase import get_supabase
from app.models.book import BookCreate, BookUpdate, BookResponse

router = APIRouter()


@router.get("", response_model=List[BookResponse])
async def get_books(user_id: str = Depends(get_current_user)):
    """Single DB round-trip via PostgreSQL function that includes last_entry_at."""
    sb = get_supabase()
    result = sb.rpc("get_books_with_summary", {"p_user_id": user_id}).execute()
    return result.data or []


@router.post("", response_model=BookResponse, status_code=201)
async def create_book(payload: BookCreate, user_id: str = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("books").insert({
        "user_id": user_id,
        "name": payload.name.strip(),
        "currency": payload.currency,
        "net_balance": 0,
    }).execute()
    book = result.data[0]
    return {**book, "last_entry_at": None}


@router.put("/{book_id}", response_model=BookResponse)
async def update_book(
    book_id: str,
    payload: BookUpdate,
    user_id: str = Depends(get_current_user),
):
    sb = get_supabase()
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        sb.table("books")
        .update(update_data)
        .eq("id", book_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Book not found")
    book = result.data[0]
    return {**book, "last_entry_at": None}


@router.delete("/{book_id}", status_code=204)
async def delete_book(book_id: str, user_id: str = Depends(get_current_user)):
    sb = get_supabase()
    result = (
        sb.table("books")
        .delete()
        .eq("id", book_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Book not found")
