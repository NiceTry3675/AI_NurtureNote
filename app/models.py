from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from .analysis_normalization import normalize_analysis_payload
from .config import DEFAULT_RANGE_DAYS, DISCLAIMER


@dataclass
class EntryRecord:
    id: int
    created_at: str
    mood: str
    body: str
    analysis: Optional[Dict[str, Any]] = None


class EntryCreate(BaseModel):
    mood: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1)


class AnalysisPayload(BaseModel):
    observations: List[str] = Field(default_factory=list)
    evidence: List[dict] = Field(default_factory=list)
    advice: List[str] = Field(default_factory=list)
    citations: List[dict] = Field(default_factory=list)
    disclaimer: str = Field(default=DISCLAIMER)


class EntryResponse(EntryCreate):
    id: int
    created_at: str
    analysis: Optional[AnalysisPayload] = None


class AnalyzeRequest(BaseModel):
    range_days: int = Field(DEFAULT_RANGE_DAYS, ge=1, le=90)
    question: Optional[str] = Field(
        default=None, max_length=500, description="추가로 알고 싶은 조언 또는 질문"
    )


class WindowInfo(BaseModel):
    range_days: int
    entry_count: int


class AnalyzeResponse(BaseModel):
    window: WindowInfo
    observations: List[str]
    evidence: List[dict]
    advice: List[str]
    citations: List[dict]
    disclaimer: str = Field(default=DISCLAIMER)


def analysis_payload_from_dict(data: Optional[Dict[str, Any]]) -> AnalysisPayload:
    normalized = normalize_analysis_payload(data)
    return AnalysisPayload(**normalized)
