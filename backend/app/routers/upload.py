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
