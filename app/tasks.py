from __future__ import annotations

from typing import Any, Dict, Optional

from .analysis import request_analysis
from .config import DISCLAIMER, SINGLE_ENTRY_QUESTION
from .db import fetch_entry, persist_entry_analysis
from .logging_config import logger


def _empty_analysis() -> Dict[str, Any]:
    return {
        "maternal_feedback": [],
        "child_development_insights": [],
        "parenting_guidelines": [],
        "sources": [],
        "disclaimer": DISCLAIMER,
    }


def generate_entry_analysis(entry_id: int, use_web_search: Optional[bool] = None) -> None:
    entry = fetch_entry(entry_id)
    if entry is None:
        logger.warning("Entry %d not found for background analysis", entry_id)
        return

    try:
        analysis_data = request_analysis(
            [entry],
            SINGLE_ENTRY_QUESTION,
            use_web_search=use_web_search,
            raise_on_failure=False,
            metadata={
                "type": "single_entry_async",
                "entry_id": entry.id,
                "created_at": entry.created_at,
                "user_web_search_override": use_web_search,
            },
        )
    except Exception as exc:  # pragma: no cover - defensive
        logger.error("Background analysis failed for entry %d: %s", entry_id, exc)
        persist_entry_analysis(entry_id, _empty_analysis())
        return

    if not analysis_data:
        logger.info("Analysis returned empty payload for entry %d", entry_id)
        persist_entry_analysis(entry_id, _empty_analysis())
        return

    persist_entry_analysis(entry_id, analysis_data)
