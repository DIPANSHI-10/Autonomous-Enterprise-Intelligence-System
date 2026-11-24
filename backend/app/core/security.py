"""Security utilities: sanitization, prompt injection defense, rate limiting, and auth."""

import re
import time
from collections import defaultdict
from typing import Optional
from fastapi import HTTPException, Request, status
from app.core.config import get_settings

settings = get_settings()

# Patterns commonly seen in prompt-injection attempts inside untrusted web/doc content
INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?previous\s+instructions", re.IGNORECASE),
    re.compile(r"disregard\s+(all\s+)?system\s+prompt", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+(in\s+)?developer\s+mode", re.IGNORECASE),
    re.compile(r"<\s*script[^>]*>.*?<\s*/\s*script\s*>", re.IGNORECASE | re.DOTALL),
]


def sanitize_untrusted_text(text: str, max_length: int = 25000) -> str:
    """Sanitize untrusted external web or document text before passing to agents."""
    if not text:
        return ""
    cleaned = text[:max_length]
    for pattern in INJECTION_PATTERNS:
        cleaned = pattern.sub("[REDACTED_UNTRUSTED_DIRECTIVE]", cleaned)
    # Strip null bytes and control characters except newlines/tabs
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
    """Validate optional A2A bearer token if configured."""
    if not authorization:
        return True
    if authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        return len(token) >= 8
    return False
