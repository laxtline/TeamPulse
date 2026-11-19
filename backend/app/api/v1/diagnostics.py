"""Temporary diagnostics for the OAuth sign-in callback.

Auth.js hides the underlying exception behind a generic "Configuration"
error, and the Vercel function logs are not reachable from this machine, so
the web app posts the exception here and we read it back over HTTP.

Delete this module once GitHub/Google sign-in works.
"""

from collections import deque
from datetime import datetime, timezone

from fastapi import APIRouter, Header, HTTPException

router = APIRouter(prefix="/diagnostics", tags=["diagnostics"])

# Not a secret: it only keeps random internet traffic out of the buffer.
DIAG_KEY = "teampulse-diag-2026"
_MAX_REPORTS = 10
_MAX_TEXT = 600

_reports: deque = deque(maxlen=_MAX_REPORTS)


def _clip(value):
    if isinstance(value, str):
        return value[:_MAX_TEXT]

    if isinstance(value, dict):
        return {key: _clip(item) for key, item in list(value.items())[:20]}

    if isinstance(value, list):
        return [_clip(item) for item in value[:20]]

    return value


@router.post("/auth-error")
async def store_auth_error(
    payload: dict,
    x_diag_key: str | None = Header(default=None),
):
    if x_diag_key != DIAG_KEY:
        raise HTTPException(status_code=403, detail="forbidden")

    _reports.append(
        {
            "received_at": datetime.now(timezone.utc).isoformat(),
            "report": _clip(payload),
        }
    )
    return {"stored": True, "count": len(_reports)}


@router.get("/auth-error")
async def read_auth_errors(x_diag_key: str | None = Header(default=None)):
    if x_diag_key != DIAG_KEY:
        raise HTTPException(status_code=403, detail="forbidden")

    return {"count": len(_reports), "reports": list(_reports)}
