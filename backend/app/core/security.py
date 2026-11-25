"""Security utilities: sanitization, prompt injection defense, JWT auth, RBAC, and rate limiting."""

import hmac
import re
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from fastapi import Depends, Header, HTTPException, Request, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# Patterns commonly seen in prompt-injection attempts inside untrusted web/doc content
INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?previous\s+instructions", re.IGNORECASE),
    re.compile(r"disregard\s+(all\s+)?(previous\s+)?system\s+prompt", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+(in\s+)?developer\s+mode", re.IGNORECASE),
    re.compile(r"override\s+(all\s+)?safety\s+(rules|instructions)", re.IGNORECASE),
    re.compile(r"<\|im_start\|>|<\|im_end\|>|###\s*system\s*:", re.IGNORECASE),
    re.compile(r"<\s*script[^>]*>.*?<\s*/\s*script\s*>", re.IGNORECASE | re.DOTALL),
]


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str, role: str = "analyst", expires_minutes: Optional[int] = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": subject, "role": role, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
        ) from exc


async def get_current_user_claims(
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    """Authenticate Bearer JWT when provided or when AUTH_REQUIRED=true."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        return decode_access_token(token)
    if settings.AUTH_REQUIRED:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide a valid Bearer token.",
        )
    return {"sub": "local-operator", "role": "admin", "auth_mode": "local_dev"}


def require_roles(*allowed_roles: str):
    async def _checker(claims: dict[str, Any] = Depends(get_current_user_claims)) -> dict[str, Any]:
        role = claims.get("role", "viewer")
        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {', '.join(allowed_roles)}",
            )
        return claims

    return _checker


def sanitize_untrusted_text(text: str, max_length: int = 25000) -> str:
    """Sanitize untrusted external web or document text before passing to agents."""
    if not text:
        return ""
    cleaned = text[:max_length]
    for pattern in INJECTION_PATTERNS:
        cleaned = pattern.sub("[REDACTED_UNTRUSTED_DIRECTIVE]", cleaned)
    cleaned = "".join(ch for ch in cleaned if ch in ("\n", "\r", "\t") or ord(ch) >= 32)
    return cleaned.strip()


def sanitize_filename(filename: str) -> str:
    """Prevent path traversal in uploaded filenames."""
    base = filename.replace("\\", "/").split("/")[-1]
    safe = re.sub(r"[^a-zA-Z0-9._-]", "_", base)
    return safe[:180] or "uploaded_document"


class InMemoryRateLimiter:
    """Sliding-window rate limiter per client IP."""

    def __init__(self, max_requests: int = 120, window_seconds: int = 60) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, list[float]] = defaultdict(list)

    def check(self, client_key: str) -> None:
        now = time.monotonic()
        cutoff = now - self.window_seconds
        recent = [t for t in self._hits[client_key] if t > cutoff]
        if len(recent) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please wait before sending more requests.",
            )
        recent.append(now)
        self._hits[client_key] = recent


rate_limiter = InMemoryRateLimiter()


async def enforce_rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    rate_limiter.check(client_ip)


def verify_a2a_token(authorization: Optional[str]) -> bool:
    """Validate A2A Bearer token against A2A_SHARED_SECRET or JWT when configured."""
    if settings.A2A_SHARED_SECRET:
        if not authorization or not authorization.startswith("Bearer "):
            return False
        token = authorization.removeprefix("Bearer ").strip()
        if hmac.compare_digest(token, settings.A2A_SHARED_SECRET):
            return True
        try:
            decode_access_token(token)
            return True
        except HTTPException:
            return False

    # When A2A_SHARED_SECRET is unset in dev, allow unauthenticated local calls,
    # but reject malformed Authorization headers if one is supplied.
    if not authorization:
        return True
    if not authorization.startswith("Bearer "):
        return False
    token = authorization.removeprefix("Bearer ").strip()
    return len(token) >= 16
