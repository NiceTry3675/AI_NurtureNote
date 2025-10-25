from __future__ import annotations

from datetime import datetime
from typing import Any, List

from fastapi import APIRouter, BackgroundTasks, Depends, Query

from ..analysis import request_analysis
from ..config import ASIA_SEOUL, DISCLAIMER
from ..db import (
    entry_record_to_response,
    get_db_dependency,
    get_entries_within_range,
    insert_entry,
    list_recent_entries,
)
from ..logging_config import logger
from ..models import (
    AnalyzeRequest,
    AnalyzeResponse,
    EntryCreate,
    EntryRecord,
    EntryResponse,
    WindowInfo,
)
from ..tasks import generate_entry_analysis


router = APIRouter()


@router.post("/entries", response_model=EntryResponse)
def create_entry(
    entry: EntryCreate,
    background_tasks: BackgroundTasks,
    conn: Any = Depends(get_db_dependency),
):
    created_at = datetime.now(tz=ASIA_SEOUL).isoformat(timespec="seconds")
    clean_mood = entry.mood.strip()
    clean_body = entry.body.strip()

    entry_id = insert_entry(conn, created_at, clean_mood, clean_body)

    entry_record = EntryRecord(
        id=entry_id,
        created_at=created_at,
        mood=clean_mood,
        body=clean_body,
    )

    background_tasks.add_task(
        generate_entry_analysis, entry_record.id, use_web_search=entry.use_web_search
    )

    logger.info(
        "Entry %d saved with mood '%s' (analysis queued)",
        entry_id,
        clean_mood,
    )

    return entry_record_to_response(entry_record)


@router.get("/entries", response_model=List[EntryResponse])
def list_entries(
    limit: int = Query(20, ge=1, le=100),
):
    responses = list_recent_entries(limit)
    logger.info("Fetched %d entries (limit=%d)", len(responses), limit)
    return responses


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze_entries(payload: AnalyzeRequest):
    entries = get_entries_within_range(payload.range_days)
    analysis = request_analysis(
        entries,
        payload.question,
        use_web_search=payload.use_web_search,
        metadata={
            "type": "window_analysis",
            "range_days": payload.range_days,
            "entry_count": len(entries),
            "user_web_search_override": payload.use_web_search,
        },
    )

    response = AnalyzeResponse(
        window=WindowInfo(range_days=payload.range_days, entry_count=len(entries)),
        maternal_feedback=analysis.get("maternal_feedback", []),
        child_development_insights=analysis.get("child_development_insights", []),
        parenting_guidelines=analysis.get("parenting_guidelines", []),
        sources=analysis.get("sources", []),
        disclaimer=analysis.get("disclaimer", DISCLAIMER),
    )
    logger.info(
        "Analysis completed for %d entries over last %d days",
        len(entries),
        payload.range_days,
    )
    return response
