from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

from .config import DISCLAIMER


NEWLINE_SPLIT_PATTERN = re.compile(r"\r?\n+")


def extract_trailing_parenthetical(text: str) -> Optional[tuple[str, str]]:
    if not text.endswith(")"):
        return None
    depth = 0
    for index in range(len(text) - 1, -1, -1):
        char = text[index]
        if char == ')':
            depth += 1
            continue
        if char == '(':
            depth -= 1
            if depth == 0:
                preceding = text[:index]
                parenthetical = text[index:]
                return preceding, parenthetical
            if depth < 0:
                return None
    return None


def normalize_analysis_list(value: Any) -> List[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, tuple):
        return list(value)
    return [value]


def normalize_dict_items(items: List[Any]) -> List[Dict[str, Any]]:
    normalized_items: List[Dict[str, Any]] = []
    for item in items:
        if not item:
            continue
        if isinstance(item, dict):
            normalized_items.append(item)
        else:
            text_value = str(item).strip()
            if text_value:
                normalized_items.append({"text": text_value})
    return normalized_items


def normalize_disclaimer(value: Any) -> str:
    if value is None:
        return DISCLAIMER
    if isinstance(value, list):
        parts = [str(item) for item in value if item]
        return " ".join(parts) if parts else DISCLAIMER
    return str(value)


def normalize_analysis_payload(data: Optional[Any]) -> Dict[str, Any]:
    """Normalize analysis payload to the new 4-section schema.

    New schema keys:
      - maternal_feedback: List[str]
      - child_development_insights: List[str]
      - parenting_guidelines: List[str]
      - sources: List[dict]
      - disclaimer: str

    Backward compatibility: map legacy keys if present:
      observations -> maternal_feedback
      advice -> parenting_guidelines (with trailing () extracted to sources)
      evidence/ citations -> sources (citations preferred if both present)
    """
    if data is None:
        return {
            "maternal_feedback": [],
            "child_development_insights": [],
            "parenting_guidelines": [],
            "sources": [],
            "disclaimer": DISCLAIMER,
        }

    if not isinstance(data, dict):
        return {
            "maternal_feedback": [str(data)],
            "child_development_insights": [],
            "parenting_guidelines": [],
            "sources": [],
            "disclaimer": DISCLAIMER,
        }

    # 1) 산모 감정에 대한 피드백
    maternal_feedback: List[str] = []
    # Prefer explicit new key, else fall back to legacy 'observations'
    for item in normalize_analysis_list(
        data.get("maternal_feedback", data.get("observations"))
    ):
        if not item:
            continue
        maternal_feedback.append(str(item).strip())

    # 2) 아이의 행동분석에 대한 발달 인사이트
    child_development_insights: List[str] = []
    if "child_development_insights" in data:
        for item in normalize_analysis_list(data.get("child_development_insights")):
            if not item:
                continue
            child_development_insights.append(str(item).strip())
    else:
        # Heuristic backward-compat: derive from 'observations' first; if empty, try 'evidence'
        legacy_obs = normalize_analysis_list(data.get("observations"))
        if legacy_obs:
            for item in legacy_obs:
                if item:
                    child_development_insights.append(str(item).strip())
        else:
            for ev in normalize_analysis_list(data.get("evidence")):
                if not ev:
                    continue
                if isinstance(ev, dict):
                    text = ev.get("summary") or ev.get("text") or ev.get("quote")
                    if text:
                        child_development_insights.append(str(text).strip())
                else:
                    child_development_insights.append(str(ev).strip())

    # 3) 육아 가이드라인
    raw_guideline_items: List[str] = []
    source_items_raw = normalize_analysis_list(
        data.get("sources", data.get("citations"))
    )
    normalized_sources = normalize_dict_items(source_items_raw)
    # Track seen source text to avoid duplicates when extracting from trailing ()
    source_texts: set[str] = set()
    for src in normalized_sources:
        if isinstance(src, dict):
            text = src.get("text")
            if isinstance(text, str) and text.strip():
                source_texts.add(text.strip())

    for item in normalize_analysis_list(data.get("parenting_guidelines", data.get("advice"))):
        if not item:
            continue
        if isinstance(item, str):
            for sub_item in NEWLINE_SPLIT_PATTERN.split(item):
                stripped = str(sub_item).strip()
                if stripped:
                    raw_guideline_items.append(stripped)
        else:
            raw_guideline_items.append(str(item))

    parenting_guidelines: List[str] = []
    for line in raw_guideline_items:
        text_val = line.strip()
        if not text_val:
            continue
        citation_candidate = None
        extracted = extract_trailing_parenthetical(text_val)
        if extracted:
            preceding_text, parenthetical = extracted
            inner_text = parenthetical.strip().strip("() ")
            if inner_text:
                citation_candidate = inner_text
                text_val = preceding_text.rstrip(" ;,.").strip()

        if citation_candidate:
            cite_clean = citation_candidate.strip()
            if cite_clean and cite_clean not in source_texts:
                normalized_sources.append({"text": cite_clean})
                source_texts.add(cite_clean)

        if text_val:
            parenting_guidelines.append(text_val)

    return {
        "maternal_feedback": maternal_feedback,
        "child_development_insights": child_development_insights,
        "parenting_guidelines": parenting_guidelines,
        "sources": normalized_sources,
        "disclaimer": normalize_disclaimer(data.get("disclaimer")),
    }
