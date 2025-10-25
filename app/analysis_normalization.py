from __future__ import annotations

from typing import Any, Dict, List, Optional

from .config import DISCLAIMER


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
            normalized_items.append({"text": str(item)})
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

    observations = [
        str(item).strip()
        for item in normalize_analysis_list(data.get("observations"))
        if item
    ]
    advice = [
        str(item).strip()
        for item in normalize_analysis_list(data.get("advice"))
        if item
    ]

    evidence_raw = normalize_analysis_list(data.get("evidence"))
    citations_raw = normalize_analysis_list(data.get("citations"))

    return {
        "observations": observations,
        "evidence": normalize_dict_items(evidence_raw),
        "advice": advice,
        "citations": normalize_dict_items(citations_raw),
        "disclaimer": normalize_disclaimer(data.get("disclaimer")),
    }
