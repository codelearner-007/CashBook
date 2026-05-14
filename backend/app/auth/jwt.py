from fastapi import Header, HTTPException
from jose import jwt, jwk, JWTError
from app.config import settings
import httpx
import logging
import time

logger = logging.getLogger(__name__)

_JWKS_TTL = 3600  # 1 hour — rotate cache after this many seconds

_jwks_cache: dict | None = None
_jwks_fetched_at: float = 0.0


async def _get_jwks() -> dict:
    global _jwks_cache, _jwks_fetched_at
    now = time.monotonic()
    if _jwks_cache is not None and (now - _jwks_fetched_at) < _JWKS_TTL:
        return _jwks_cache
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
            )
        _jwks_cache = resp.json()
        _jwks_fetched_at = now
        return _jwks_cache
    except Exception as exc:
        logger.error("Failed to fetch JWKS: %s", exc)
        return _jwks_cache or {"keys": []}


async def get_current_user(authorization: str = Header(...)) -> str:
    """Validate Supabase JWT (HS256 or ES256/RS256). Returns the user UUID."""
    try:
        token = authorization.removeprefix("Bearer ").strip()
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")

        if alg == "HS256":
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
        else:
            # ES256 / RS256 — verify via JWKS public key
            kid = header.get("kid")
            jwks = await _get_jwks()
            key_data = next(
                (k for k in jwks.get("keys", []) if not kid or k.get("kid") == kid),
                None,
            )
            if not key_data:
                # Key not found — JWKS may be stale, force a refresh and retry once
                global _jwks_cache
                _jwks_cache = None
                jwks = await _get_jwks()
                key_data = next(
                    (k for k in jwks.get("keys", []) if not kid or k.get("kid") == kid),
                    None,
                )
            if not key_data:
                logger.error("No JWKS key for kid=%s, keys=%s", kid, jwks)
                raise HTTPException(status_code=401, detail="Unknown signing key")
            key = jwk.construct(key_data)
            payload = jwt.decode(
                token, key, algorithms=[alg], options={"verify_aud": False}
            )

        user_id: str | None = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing sub")
        return user_id

    except HTTPException:
        raise
    except JWTError as exc:
        logger.error("JWT error: %s", exc)
        raise HTTPException(status_code=401, detail="Could not validate token") from exc
    except Exception as exc:
        logger.error("Auth error: %s", exc)
        raise HTTPException(status_code=401, detail="Could not validate token") from exc
