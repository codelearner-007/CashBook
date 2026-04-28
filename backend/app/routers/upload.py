import time
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from app.auth.jwt import get_current_user
from app.db.supabase import get_supabase

router = APIRouter()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}
MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


@router.post("/attachment")
async def upload_attachment(
    entry_id: str = Form(...),
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, HEIC images are allowed")

    content = await file.read()
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds 5 MB limit")

    sb = get_supabase()
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    path = f"{user_id}/{entry_id}/attachment.{ext}"

    sb.storage.from_("attachments").upload(
        path,
        content,
        {"content-type": file.content_type, "upsert": "true"},
    )

    signed = sb.storage.from_("attachments").create_signed_url(path, 3600)
    return {"attachment_url": signed["signedURL"], "path": path}


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    # Normalise content type — Android gallery/camera often sends None or image/jpg
    content_type = (file.content_type or "image/jpeg").lower().strip()
    if content_type == "image/jpg":
        content_type = "image/jpeg"

    if content_type not in ALLOWED_TYPES:
        # Fall back: infer from filename extension
        fname = (file.filename or "").lower()
        if fname.endswith((".jpg", ".jpeg")):
            content_type = "image/jpeg"
        elif fname.endswith(".png"):
            content_type = "image/png"
        elif fname.endswith(".webp"):
            content_type = "image/webp"
        else:
            content_type = "image/jpeg"  # safe default

    content = await file.read()
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds 5 MB limit")

    sb = get_supabase()

    try:
        sb.storage.create_bucket("avatars", options={"public": True})
    except Exception:
        pass  # Already exists

    ext = content_type.split("/")[-1]  # derive extension from normalised type
    if ext in ("jpeg", "jpg"):
        ext = "jpg"
    path = f"{user_id}/profile.{ext}"

    try:
        sb.storage.from_("avatars").upload(
            path,
            content,
            {"content-type": content_type, "upsert": "true"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")

    public_url = sb.storage.from_("avatars").get_public_url(path)
    if isinstance(public_url, dict):
        public_url = public_url.get("publicURL") or public_url.get("publicUrl", "")

    versioned_url = f"{public_url}?v={int(time.time())}"

    sb.table("profiles").update({"avatar_url": versioned_url}).eq("id", user_id).execute()

    return {"avatar_url": versioned_url}
