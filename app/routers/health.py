from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter

from ..config import APP_NAME, ASIA_SEOUL


router = APIRouter()


@router.get("/health")
def health() -> Dict[str, Any]:
    now = datetime.now(tz=ASIA_SEOUL).isoformat(timespec="seconds")
    return {"status": "ok", "app": APP_NAME, "time": now}
