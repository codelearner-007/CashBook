from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.auth.jwt import get_current_user
from app.db.supabase import get_supabase
from app.models.payment_mode import PaymentModeCreate, PaymentModeUpdate, PaymentModeResponse

router = APIRouter()


def _verify_book(sb, book_id: str, user_id: str):
    res = sb.table("books").select("id").eq("id", book_id).eq("user_id", user_id).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Book not found")


def _verify_mode(sb, mode_id: str, book_id: str, user_id: str):
    res = (
        sb.table("payment_modes")
        .select("id")
        .eq("id", mode_id)
        .eq("book_id", book_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Payment mode not found")


@router.get("/{book_id}/payment-modes", response_model=List[PaymentModeResponse])
async def get_payment_modes(book_id: str, user_id: str = Depends(get_current_user)):
    sb = get_supabase()
    _verify_book(sb, book_id, user_id)
    result = (
        sb.table("payment_modes")
        .select("*")
        .eq("book_id", book_id)
        .eq("user_id", user_id)
        .order("created_at")
        .execute()
    )
    return result.data or []


@router.post("/{book_id}/payment-modes", response_model=PaymentModeResponse, status_code=201)
async def create_payment_mode(
    book_id: str,
    payload: PaymentModeCreate,
    user_id: str = Depends(get_current_user),
):
    sb = get_supabase()
    _verify_book(sb, book_id, user_id)

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Payment mode name cannot be blank")

    existing = (
        sb.table("payment_modes")
        .select("id")
        .eq("book_id", book_id)
        .eq("user_id", user_id)
        .ilike("name", name)
        .limit(1)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=409, detail="Payment mode already exists in this book")

    result = sb.table("payment_modes").insert({
        "book_id": book_id,
        "user_id": user_id,
        "name": name,
    }).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create payment mode")
    return result.data[0]


@router.put("/{book_id}/payment-modes/{mode_id}", response_model=PaymentModeResponse)
async def update_payment_mode(
    book_id: str,
    mode_id: str,
    payload: PaymentModeUpdate,
    user_id: str = Depends(get_current_user),
):
    sb = get_supabase()
    _verify_mode(sb, mode_id, book_id, user_id)

    update_data = payload.model_dump(exclude_unset=True)
    if "name" in update_data:
        name = update_data["name"].strip()
        if not name:
            raise HTTPException(status_code=422, detail="Payment mode name cannot be blank")
        existing = (
            sb.table("payment_modes")
            .select("id")
            .eq("book_id", book_id)
            .eq("user_id", user_id)
            .ilike("name", name)
            .neq("id", mode_id)
            .limit(1)
            .execute()
        )
        if existing.data:
            raise HTTPException(status_code=409, detail="Payment mode already exists in this book")
        update_data["name"] = name

    sb.table("payment_modes").update(update_data).eq("id", mode_id).eq("user_id", user_id).execute()
    result = (
        sb.table("payment_modes")
        .select("*")
        .eq("id", mode_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    return result.data[0]


@router.delete("/{book_id}/payment-modes/{mode_id}", status_code=204)
async def delete_payment_mode(
    book_id: str,
    mode_id: str,
    user_id: str = Depends(get_current_user),
):
    sb = get_supabase()
    _verify_mode(sb, mode_id, book_id, user_id)

    count_res = (
        sb.table("payment_modes")
        .select("id", count="exact")
        .eq("book_id", book_id)
        .eq("user_id", user_id)
        .execute()
    )
    if (count_res.count or 0) <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the last payment mode")

    # FK ON DELETE SET NULL clears entries.payment_mode_id automatically
    sb.table("payment_modes").delete().eq("id", mode_id).eq("user_id", user_id).execute()
