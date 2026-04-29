from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.auth.jwt import get_current_user
from app.db.supabase import get_supabase
from app.models.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.models.entry import EntryResponse

router = APIRouter()


def _verify_book(sb, book_id: str, user_id: str):
    res = sb.table("books").select("id").eq("id", book_id).eq("user_id", user_id).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Book not found")


def _verify_category(sb, category_id: str, book_id: str, user_id: str):
    res = (
        sb.table("categories")
        .select("id")
        .eq("id", category_id)
        .eq("book_id", book_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Category not found")


@router.get("/{book_id}/categories", response_model=List[CategoryResponse])
async def get_categories(book_id: str, user_id: str = Depends(get_current_user)):
    sb = get_supabase()
    _verify_book(sb, book_id, user_id)
    result = (
        sb.table("categories")
        .select("*")
        .eq("book_id", book_id)
        .eq("user_id", user_id)
        .order("created_at")
        .execute()
    )
    return result.data or []


@router.post("/{book_id}/categories", response_model=CategoryResponse, status_code=201)
async def create_category(
    book_id: str,
    payload: CategoryCreate,
    user_id: str = Depends(get_current_user),
):
    sb = get_supabase()
    _verify_book(sb, book_id, user_id)

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Category name cannot be blank")

    # Enforce unique name per book (DB constraint is the source of truth; this gives a nicer error)
    existing = (
        sb.table("categories")
        .select("id")
        .eq("book_id", book_id)
        .eq("user_id", user_id)
        .ilike("name", name)
        .limit(1)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=409, detail="Category name already exists in this book")

    result = sb.table("categories").insert({
        "book_id": book_id,
        "user_id": user_id,
        "name": name,
    }).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create category")
    return result.data[0]


@router.put("/{book_id}/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    book_id: str,
    category_id: str,
    payload: CategoryUpdate,
    user_id: str = Depends(get_current_user),
):
    sb = get_supabase()
    _verify_category(sb, category_id, book_id, user_id)

    update_data = payload.model_dump(exclude_unset=True)
    if "name" in update_data:
        name = update_data["name"].strip()
        if not name:
            raise HTTPException(status_code=422, detail="Category name cannot be blank")
        existing = (
            sb.table("categories")
            .select("id")
            .eq("book_id", book_id)
            .eq("user_id", user_id)
            .ilike("name", name)
            .neq("id", category_id)
            .limit(1)
            .execute()
        )
        if existing.data:
            raise HTTPException(status_code=409, detail="Category name already exists in this book")
        update_data["name"] = name

    sb.table("categories").update(update_data).eq("id", category_id).eq("user_id", user_id).execute()
    result = (
        sb.table("categories")
        .select("*")
        .eq("id", category_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    return result.data[0]


@router.delete("/{book_id}/categories/{category_id}", status_code=204)
async def delete_category(
    book_id: str,
    category_id: str,
    user_id: str = Depends(get_current_user),
):
    sb = get_supabase()
    _verify_category(sb, category_id, book_id, user_id)
    # FK ON DELETE SET NULL handles entries.category_id automatically
    sb.table("categories").delete().eq("id", category_id).eq("user_id", user_id).execute()


@router.get("/{book_id}/categories/{category_id}/entries", response_model=List[EntryResponse])
async def get_category_entries(
    book_id: str,
    category_id: str,
    user_id: str = Depends(get_current_user),
):
    sb = get_supabase()
    _verify_category(sb, category_id, book_id, user_id)
    result = (
        sb.table("entries")
        .select("*")
        .eq("book_id", book_id)
        .eq("user_id", user_id)
        .eq("category_id", category_id)
        .order("entry_date", desc=True)
        .order("entry_time", desc=True)
        .execute()
    )
    return result.data or []
