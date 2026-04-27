from fastapi import Header, HTTPException
from jose import jwt, JWTError
from app.config import settings


async def get_current_user(authorization: str = Header(...)) -> str:
    """Extract and validate Supabase JWT. Returns the user UUID (sub claim)."""
    try:
        token = authorization.removeprefix("Bearer ").strip()
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing sub")
        return user_id
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Could not validate token") from exc
