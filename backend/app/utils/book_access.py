from fastapi import HTTPException
from app.db.supabase import get_supabase


def get_book_owner_id(sb, book_id: str, user_id: str) -> str:
    """
    Verify access to a book and return the owner's user_id.

    - Owner:        returns user_id unchanged.
    - Collaborator: looks up book_shares and returns the owner's user_id so
                    every subsequent DB query uses the correct user_id filter.
    - No access:    raises 404.

    Use the returned value (call it owner_id) for *all* data queries on entries,
    categories, contacts, and payment_modes so that collaborators transparently
    read and write the owner's data.
    """
    # Fast path — user is the owner
    owner_check = (
        sb.table("books")
        .select("user_id")
        .eq("id", book_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if owner_check.data:
        return user_id

    # Collaborator path — check book_shares
    share_check = (
        sb.table("book_shares")
        .select("owner_id")
        .eq("book_id", book_id)
        .eq("shared_with_id", user_id)
        .limit(1)
        .execute()
    )
    if share_check.data:
        return share_check.data[0]["owner_id"]

    raise HTTPException(status_code=404, detail="Book not found")
