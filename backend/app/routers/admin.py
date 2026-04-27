from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.auth.jwt import get_current_user
from app.db.supabase import get_supabase
from app.models.profile import UserWithStats, StatusUpdate
from app.models.book import BookResponse

router = APIRouter()


async def require_superadmin(user_id: str = Depends(get_current_user)) -> str:
    """Dependency — 403 if caller is not a superadmin."""
    sb = get_supabase()
    res = sb.table("profiles").select("role").eq("id", user_id).single().execute()
    if not res.data or res.data["role"] != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return user_id


@router.get("/users", response_model=List[UserWithStats])
async def get_all_users(admin_id: str = Depends(require_superadmin)):
    """All non-superadmin profiles with book/entry stats."""
    sb = get_supabase()
    profiles_res = (
        sb.table("profiles")
        .select("*")
        .neq("role", "superadmin")
        .order("created_at", desc=True)
        .execute()
    )
    users = profiles_res.data or []

    result = []
    for u in users:
        books_res = sb.table("books").select("id").eq("user_id", u["id"]).execute()
        book_count = len(books_res.data or [])

        entries_res = (
            sb.table("entries")
            .select("id")
            .eq("user_id", u["id"])
            .execute()
        )
        entry_count = len(entries_res.data or [])
        storage_mb = round(0.2 + entry_count * 0.0005, 2)

        result.append({**u, "book_count": book_count, "entry_count": entry_count, "storage_mb": storage_mb})

    return result


@router.patch("/users/{user_id}/status", response_model=UserWithStats)
async def toggle_user_status(
    user_id: str,
    payload: StatusUpdate,
    admin_id: str = Depends(require_superadmin),
):
    sb = get_supabase()
    result = (
        sb.table("profiles")
        .update({"is_active": payload.is_active})
        .eq("id", user_id)
        .neq("role", "superadmin")   # can't deactivate superadmin
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found or is superadmin")
    u = result.data[0]
    return {**u, "book_count": 0, "entry_count": 0, "storage_mb": 0.0}


@router.get("/users/{user_id}/books", response_model=List[BookResponse])
async def get_user_books(user_id: str, admin_id: str = Depends(require_superadmin)):
    """Admin view of any user's books."""
    sb = get_supabase()
    result = sb.rpc("get_books_with_summary", {"p_user_id": user_id}).execute()
    return result.data or []
