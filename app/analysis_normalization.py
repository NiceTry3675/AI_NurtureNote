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
    if data is None:
        return {
            "observations": [],
            "evidence": [],
            "advice": [],
            "citations": [],
            "disclaimer": DISCLAIMER,
        }

    if not isinstance(data, dict):
        return {
            "observations": [str(data)],
            "evidence": [],
            "advice": [],
            "citations": [],
            "disclaimer": DISCLAIMER,
        }

    observations = []
    for item in normalize_analysis_list(data.get("observations")):
        if not item:
            continue
        observations.append(str(item).strip())

    raw_advice_items: List[str] = []
    for item in normalize_analysis_list(data.get("advice")):
        if not item:
            continue
        if isinstance(item, str):
            for sub_item in NEWLINE_SPLIT_PATTERN.split(item):
                stripped = sub_item.strip()
                if stripped:
                    raw_advice_items.append(stripped)
        else:
            raw_advice_items.append(str(item))

    evidence_raw = normalize_analysis_list(data.get("evidence"))
    citations_raw = normalize_analysis_list(data.get("citations"))

    normalized_evidence = normalize_dict_items(evidence_raw)
    normalized_citations = normalize_dict_items(citations_raw)
    citation_texts: set[str] = set()
    for citation in normalized_citations:
        if isinstance(citation, dict):
            text = citation.get("text")
            if isinstance(text, str) and text.strip():
                citation_texts.add(text.strip())

    advice_without_citations: List[str] = []

    for advice_item in raw_advice_items:
        item_text = advice_item.strip()
        if not item_text:
            continue

        citation_candidate = None
        extracted = extract_trailing_parenthetical(item_text)
        if extracted:
            preceding_text, parenthetical = extracted
            inner_text = parenthetical.strip().strip("() ")
            if inner_text:
                citation_candidate = inner_text
                item_text = preceding_text.rstrip(" ;,.").strip()

        if citation_candidate:
            citation_clean = citation_candidate.strip()
            if citation_clean and citation_clean not in citation_texts:
                normalized_citations.append({"text": citation_clean})
                citation_texts.add(citation_clean)

        if item_text:
            advice_without_citations.append(item_text)

    return {
        "observations": observations,
        "evidence": normalized_evidence,
        "advice": advice_without_citations,
        "citations": normalized_citations,
        "disclaimer": normalize_disclaimer(data.get("disclaimer")),
    }
