from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.auth.jwt import get_current_user
from app.db.supabase import get_supabase
from app.models.sharing import ShareCreate, ShareUpdate, ShareResponse, CollaboratorProfile

router = APIRouter()

VALID_RIGHTS = {"view", "view_create_edit", "view_create_edit_delete"}


def _require_owner(sb, book_id: str, user_id: str):
    """Raise 404 if book doesn't belong to user."""
    check = (
        sb.table("books")
        .select("id")
        .eq("id", book_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not check.data:
        raise HTTPException(status_code=404, detail="Book not found")


def _build_share_response(share: dict, profile: dict) -> ShareResponse:
    return ShareResponse(
        id=share["id"],
        book_id=share["book_id"],
        owner_id=share["owner_id"],
        shared_with=CollaboratorProfile(
            id=profile["id"],
            full_name=profile.get("full_name"),
            email=profile.get("email", ""),
            avatar_url=profile.get("avatar_url"),
        ),
        screens=share.get("screens", {}),
        rights=share["rights"],
        created_at=share["created_at"],
    )


@router.get("/{book_id}/shares", response_model=List[ShareResponse])
async def list_shares(book_id: str, user_id: str = Depends(get_current_user)):
    sb = get_supabase()
    _require_owner(sb, book_id, user_id)

    shares = (
        sb.table("book_shares")
        .select("*")
        .eq("book_id", book_id)
        .eq("owner_id", user_id)
        .execute()
    ).data or []

    if not shares:
        return []

    profile_ids = list({s["shared_with_id"] for s in shares})
    profiles_map = {
        p["id"]: p
        for p in (
            sb.table("profiles")
            .select("id, full_name, email, avatar_url")
            .in_("id", profile_ids)
            .execute()
        ).data or []
    }

    return [
        _build_share_response(s, profiles_map[s["shared_with_id"]])
        for s in shares
        if s["shared_with_id"] in profiles_map
    ]


@router.post("/{book_id}/shares", response_model=ShareResponse, status_code=201)
async def create_share(
    book_id: str,
    payload: ShareCreate,
    user_id: str = Depends(get_current_user),
):
    sb = get_supabase()
    _require_owner(sb, book_id, user_id)

    if payload.rights not in VALID_RIGHTS:
        raise HTTPException(status_code=422, detail=f"Invalid rights value: {payload.rights}")

    # Look up the target user by email
    target = (
        sb.table("profiles")
        .select("id, full_name, email, avatar_url, role")
        .eq("email", payload.email.strip().lower())
        .limit(1)
        .execute()
    ).data

    if not target:
        raise HTTPException(status_code=404, detail="No user found with that email address")

    target_profile = target[0]

    if target_profile["id"] == user_id:
        raise HTTPException(status_code=400, detail="You cannot share a book with yourself")

    # Check for duplicate
    existing = (
        sb.table("book_shares")
        .select("id")
        .eq("book_id", book_id)
        .eq("shared_with_id", target_profile["id"])
        .limit(1)
        .execute()
    ).data

    if existing:
        raise HTTPException(status_code=409, detail="This book is already shared with that user")

    screens_dict = payload.screens.model_dump()
    new_share = (
        sb.table("book_shares")
        .insert({
            "book_id":        book_id,
            "owner_id":       user_id,
            "shared_with_id": target_profile["id"],
            "screens":        screens_dict,
            "rights":         payload.rights,
        })
        .execute()
    ).data[0]

    return _build_share_response(new_share, target_profile)


@router.patch("/{book_id}/shares/{share_id}", response_model=ShareResponse)
async def update_share(
    book_id: str,
    share_id: str,
    payload: ShareUpdate,
    user_id: str = Depends(get_current_user),
):
    sb = get_supabase()
    _require_owner(sb, book_id, user_id)

    if payload.rights and payload.rights not in VALID_RIGHTS:
        raise HTTPException(status_code=422, detail=f"Invalid rights value: {payload.rights}")

    update_data = {}
    if payload.screens is not None:
        update_data["screens"] = payload.screens.model_dump()
    if payload.rights is not None:
        update_data["rights"] = payload.rights

    if not update_data:
        raise HTTPException(status_code=400, detail="Nothing to update")

    updated = (
        sb.table("book_shares")
        .update(update_data)
        .eq("id", share_id)
        .eq("book_id", book_id)
        .eq("owner_id", user_id)
        .execute()
    ).data

    if not updated:
        raise HTTPException(status_code=404, detail="Share not found")

    share = updated[0]
    profile = (
        sb.table("profiles")
        .select("id, full_name, email, avatar_url")
        .eq("id", share["shared_with_id"])
        .single()
        .execute()
    ).data

    return _build_share_response(share, profile)


@router.delete("/{book_id}/shares/{share_id}", status_code=204)
async def delete_share(
    book_id: str,
    share_id: str,
    user_id: str = Depends(get_current_user),
):
    sb = get_supabase()
    _require_owner(sb, book_id, user_id)

    result = (
        sb.table("book_shares")
        .delete()
        .eq("id", share_id)
        .eq("book_id", book_id)
        .eq("owner_id", user_id)
        .execute()
    ).data

    if not result:
        raise HTTPException(status_code=404, detail="Share not found")


@router.delete("/{book_id}/leave", status_code=204)
async def leave_shared_book(book_id: str, user_id: str = Depends(get_current_user)):
    """Recipient removes themselves from a shared book."""
    sb = get_supabase()
    sb.table("book_shares").delete().eq("book_id", book_id).eq("shared_with_id", user_id).execute()
