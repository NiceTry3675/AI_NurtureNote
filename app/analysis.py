from __future__ import annotations

import json
import os
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import HTTPException

from .analysis_normalization import normalize_analysis_payload
from .config import (
    ASIA_SEOUL,
    ASSISTANT_ID_FILE,
    DISCLAIMER,
    RESPONSES_DIR,
    get_model_name,
    get_vector_store_id,
    load_env_file,
    is_web_search_enabled,
    get_allowed_web_domains,
)
from .logging_config import logger
from .models import EntryRecord

try:
    from openai import OpenAI
    import openai as openai_pkg  # type: ignore
except ImportError as exc:  # pragma: no cover - openai optional during import
    raise RuntimeError(
        "The openai package must be installed to run this application."
    ) from exc


_openai_client: Optional[OpenAI] = None


def strip_proxy_env_for_openai() -> List[str]:
    removed_keys: List[str] = []
    for key in (
        "OPENAI_HTTP_PROXY",
        "OPENAI_PROXY",
        "ALL_PROXY",
        "all_proxy",
        "HTTPS_PROXY",
        "https_proxy",
        "HTTP_PROXY",
        "http_proxy",
    ):
        if key in os.environ:
            os.environ.pop(key, None)
            removed_keys.append(key)
    if removed_keys:
        logger.warning(
            "Ignoring proxy environment variables for OpenAI client: %s",
            ", ".join(removed_keys),
        )
    return removed_keys


def get_openai_client() -> OpenAI:
    global _openai_client
    if _openai_client is not None:
        return _openai_client

    load_env_file()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY environment variable is not configured.",
        )

    client_kwargs: dict = {"api_key": api_key}
    base_url = os.getenv("OPENAI_API_BASE")
    if base_url:
        client_kwargs["base_url"] = base_url.rstrip("/")

    try:
        strip_proxy_env_for_openai()
        _openai_client = OpenAI(**client_kwargs)
        if not (
            hasattr(_openai_client, "beta")
            and hasattr(_openai_client.beta, "assistants")
            and hasattr(_openai_client.beta, "threads")
        ):
            version = getattr(openai_pkg, "__version__", "unknown")
            logger.error(
                "Installed openai SDK (%s) lacks Assistants beta endpoints.", version
            )
            raise HTTPException(
                status_code=500,
                detail="OpenAI SDK missing Assistants beta API. Install openai>=1.51.0.",
            )
    except TypeError as exc:
        logger.error("Failed to initialize OpenAI client: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Failed to initialize OpenAI client; check OPENAI_* configuration.",
        ) from exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error("Failed to initialize OpenAI client: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Failed to initialize OpenAI client.",
        ) from exc
    return _openai_client


def get_or_create_assistant_id(client: "OpenAI", system_instructions: str) -> str:
    env_id = os.getenv("OPENAI_ASSISTANT_ID")
    if env_id:
        return env_id

    if ASSISTANT_ID_FILE.exists():
        try:
            cached = ASSISTANT_ID_FILE.read_text(encoding="utf-8").strip()
            if cached:
                return cached
        except Exception:
            pass

    try:
        asst = client.beta.assistants.create(
            model=get_model_name(),
            instructions=(
                system_instructions
                + "\n\n반드시 JSON 객체만 출력하고 키는 maternal_feedback, child_development_insights, parenting_guidelines, sources 이다."
            ),
            tools=[{"type": "file_search"}],
            tool_resources={
                "file_search": {"vector_store_ids": [get_vector_store_id()]}
            },
        )
    except Exception as exc:
        logger.error("Failed to create assistant: %s", exc)
        raise HTTPException(status_code=502, detail="Failed to prepare assistant.") from exc

    try:
        ASSISTANT_ID_FILE.write_text(asst.id, encoding="utf-8")
    except Exception:
        pass
    return asst.id


def _extract_url_annotations(response: Any) -> List[Dict[str, Any]]:
    """Best-effort extraction of URL citations from Responses API output.

    Scans response.output[*].message.content[*].text.annotations (if present)
    and collects items that contain a URL, returning dictionaries with at least
    a 'url' key. Title/text may be included if available.
    """
    urls: Dict[str, Dict[str, Any]] = {}
    try:
        for item in getattr(response, "output", []) or []:
            if getattr(item, "type", "") != "message":
                continue
            for content in getattr(item, "content", []) or []:
                # annotations may live under content.text.annotations
                annotations = None
                text_obj = getattr(content, "text", None)
                if text_obj is not None:
                    annotations = getattr(text_obj, "annotations", None)
                if annotations is None:
                    annotations = getattr(content, "annotations", None)
                if not annotations:
                    continue
                for ann in annotations:
                    url = getattr(ann, "url", None) or getattr(ann, "source_url", None)
                    if not url:
                        continue
                    title = getattr(ann, "title", None) or getattr(ann, "text", None)
                    key = str(url).strip()
                    if key and key not in urls:
                        item_dict: Dict[str, Any] = {"url": key}
                        if title:
                            item_dict["title"] = str(title)
                        urls[key] = item_dict
    except Exception:
        # Best-effort only; ignore parsing failures
        pass
    return list(urls.values())


def call_responses_api(system_prompt: str, user_prompt: str, allowed_domains: List[str]) -> dict:
    """Call the Responses API with file_search + web_search (filtered) enabled.

    This is the MVP path to enable web_search with a domain allow-list via filters.
    """
    client = get_openai_client()
    # Configure tools. For Responses API, web_search.filters must be an object
    # and file_search can accept vector_store_ids directly in the tool object.
    tools: List[dict] = [
        {"type": "file_search", "vector_store_ids": [get_vector_store_id()]},
        {"type": "web_search", "filters": {"allowed_domains": allowed_domains}},
    ]

    try:
        # Prefer explicit instructions + input for clarity
        response = client.responses.create(
            model=get_model_name(),
            instructions=system_prompt,
            input=user_prompt,
            tools=tools,
        )

        output_text = getattr(response, "output_text", None) or ""
        if not output_text:
            # Fallback: assemble text from output items if needed
            try:
                parts: List[str] = []
                for item in getattr(response, "output", []) or []:
                    if getattr(item, "type", "") == "message":
                        for content in getattr(item, "content", []) or []:
                            if getattr(content, "type", "") == "output_text":
                                text_val = getattr(content, "text", "")
                                if text_val:
                                    parts.append(text_val)
                output_text = "\n".join(parts).strip()
            except Exception:
                pass

        if not output_text:
            raise HTTPException(status_code=502, detail="Responses API returned empty content.")

        try:
            parsed = json.loads(_strip_code_fence(output_text))
            # Enrich with URL annotations as sources when missing or empty
            ann_sources = _extract_url_annotations(response)
            # Support both 'sources' (new) and 'citations' (legacy)
            if isinstance(parsed, dict):
                if not parsed.get("sources") and ann_sources:
                    parsed["sources"] = ann_sources
                elif parsed.get("sources") and ann_sources:
                    # Merge, de-duplicating by URL if possible
                    by_url = {s.get("url"): s for s in parsed.get("sources") if isinstance(s, dict)}
                    for src in ann_sources:
                        url = src.get("url")
                        if url and url not in by_url:
                            parsed.setdefault("sources", []).append(src)
                # If only legacy 'citations' exists, append annotations there too
                if not parsed.get("sources") and parsed.get("citations") and ann_sources:
                    # keep legacy citations untouched; normalizer will map later
                    parsed["citations"] = parsed.get("citations", []) + ann_sources
            return parsed
        except json.JSONDecodeError as exc:
            logger.error(
                "Failed to parse JSON from responses output: %s | text=%s",
                exc,
                output_text,
            )
            raise HTTPException(
                status_code=502, detail="Responses API returned malformed JSON."
            ) from exc
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive
        logger.error("Responses API request failed: %s", exc)
        raise HTTPException(
            status_code=502, detail="Failed to contact language model service."
        ) from exc


def call_assistants_api(system_prompt: str, user_prompt: str) -> dict:
    client = get_openai_client()
    assistant_id = get_or_create_assistant_id(client, system_prompt)

    try:
        thread = client.beta.threads.create(
            messages=[{"role": "user", "content": user_prompt}]
        )
        run = client.beta.threads.runs.create(
            thread_id=thread.id, assistant_id=assistant_id
        )

        terminal_states = {"completed", "failed", "cancelled", "expired"}
        while True:
            run = client.beta.threads.runs.retrieve(
                thread_id=thread.id, run_id=run.id
            )
            if run.status in terminal_states:
                break
            time.sleep(0.5)

        if run.status != "completed":
            logger.error("Assistant run ended with status=%s", run.status)
            raise HTTPException(
                status_code=502, detail="Assistant run did not complete successfully."
            )

        messages = client.beta.threads.messages.list(
            thread_id=thread.id, order="desc", limit=10
        )
        output_text_parts: List[str] = []
        for msg in messages.data:
            if getattr(msg, "role", "") != "assistant":
                continue
            for part in getattr(msg, "content", []) or []:
                if getattr(part, "type", "") == "text" and getattr(part, "text", None):
                    value = getattr(part.text, "value", "")
                    if value:
                        output_text_parts.append(value)
            if output_text_parts:
                break

        output_text = "\n".join(output_text_parts).strip()
        if not output_text:
            raise HTTPException(
                status_code=502, detail="Assistant returned empty content."
            )

        try:
            return json.loads(_strip_code_fence(output_text))
        except json.JSONDecodeError as exc:
            logger.error(
                "Failed to parse JSON from assistant output: %s | text=%s",
                exc,
                output_text,
            )
            raise HTTPException(
                status_code=502, detail="Assistant returned malformed JSON."
            ) from exc
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive
        logger.error("Assistants API request failed: %s", exc)
        raise HTTPException(
            status_code=502, detail="Failed to contact language model service."
        ) from exc


def serialize_entries(entries: List[EntryRecord]) -> str:
    lines: List[str] = []
    for entry in entries:
        snippet = entry.body.replace("\n", " ").strip()
        lines.append(f"{entry.created_at} | {entry.mood} | {snippet}")
    return "\n".join(lines)


def persist_model_response(
    entries: List[EntryRecord],
    question: Optional[str],
    payload: Dict[str, Any],
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    record = {
        "timestamp": datetime.now(tz=ASIA_SEOUL).isoformat(timespec="seconds"),
        "model": get_model_name(),
        "vector_store_id": get_vector_store_id(),
        "question": question,
        "entries": [
            {
                "id": entry.id,
                "created_at": entry.created_at,
                "mood": entry.mood,
                "body": entry.body,
            }
            for entry in entries
        ],
        "response": payload,
        "metadata": metadata or {},
    }

    last_exc: Optional[Exception] = None
    for _ in range(10):
        filename = (
            datetime.now(tz=ASIA_SEOUL).strftime("%Y%m%dT%H%M%S")
            + f"_{uuid4().hex}.json"
        )
        filepath = RESPONSES_DIR / filename
        try:
            with filepath.open("x", encoding="utf-8") as handle:
                json.dump(record, handle, ensure_ascii=False, indent=2)
            logger.info(
                "Model response persisted",
                extra={"response_file": str(filepath), "entry_count": len(entries)},
            )
            return
        except FileExistsError as exc:  # pragma: no cover - rare collision
            last_exc = exc
            continue
        except Exception as exc:  # pragma: no cover - best effort
            last_exc = exc
            break
    logger.error(
        "Failed to persist model response: %s",
        last_exc,
        extra={"file": str(filepath) if "filepath" in locals() else None},
    )


def request_analysis(
    entries: List[EntryRecord],
    question: Optional[str],
    *,
    use_web_search: Optional[bool] = None,
    raise_on_failure: bool = True,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    if not entries:
        logger.info("No entries available for analysis.")
        return normalize_analysis_payload(None)

    entries_text = serialize_entries(entries)
    user_question = (
        question or "최근 기록을 바탕으로 도움이 될 일반 조언을 알려줘."
    ).strip()

    allowed_domains = get_allowed_web_domains()
    system_prompt = (
        "아래 형식을 따라 한국어 JSON으로만 답해라."\
        "\n키는 다음 네 가지다:"\
        "\n- maternal_feedback: 산모 감정에 대한 구체적이고 공감적인 피드백 (간결한 문장 목록)"\
        "\n- child_development_insights: 아이의 행동 관찰을 바탕으로 한 발달 인사이트 (사실 중심, 과장 금지)"\
        "\n- parenting_guidelines: 실천 가능한 육아 가이드라인 (행동 문장, 과학적 근거 기반)"\
        "\n- sources: 필요한 경우에만 포함하는 참고 출처 목록 (객관적 기관/문서 위주). 각 항목은 title/text, url 등을 포함할 수 있다."\
        "\n원칙:"\
        "\n- 관찰/인사이트는 일기 텍스트와 파일 지식(file_search) 근거로 작성하고, 부족할 때만 웹 검색(web_search)으로 보완한다."\
        "\n- 단정이 어려우면 추정하지 말고 불확실함을 명시한다."\
        "\n- 문장은 짧고 명확하게. 불필요한 서론 금지."\
        "\n반드시 위 4개 키로만 JSON을 출력하라."
    )

    user_prompt = (
        "entries_text:\n"
        f"{entries_text}\n\n"
        "위 기록을 토대로 최근 경향을 관찰 요약하고, 질문에 대한 조언을 제공해라.\n"
        f"question: {user_question}"
    )

    logger.info("Requesting analysis for %d entries", len(entries))

    try:
        use_ws_effective = (
            is_web_search_enabled() if use_web_search is None else bool(use_web_search)
        )
        if use_ws_effective:
            try:
                payload = call_responses_api(system_prompt, user_prompt, allowed_domains)
                meta = dict(metadata or {})
                meta.setdefault("engine", "responses")
                meta["web_search_enabled"] = True
                if use_web_search is not None:
                    meta["user_web_search_override"] = use_web_search
                meta["allowed_domains"] = allowed_domains
                persist_model_response(entries, user_question, payload, meta)
            except HTTPException as exc:
                logger.warning(
                    "Responses API path failed (%s). Falling back to Assistants.",
                    exc.detail,
                )
                payload = call_assistants_api(system_prompt, user_prompt)
                meta = dict(metadata or {})
                meta.setdefault("engine", "assistants")
                meta["web_search_enabled"] = False
                if use_web_search is not None:
                    meta["user_web_search_override"] = use_web_search
                meta["fallback_from_responses"] = True
                persist_model_response(entries, user_question, payload, meta)
        else:
            payload = call_assistants_api(system_prompt, user_prompt)
            meta = dict(metadata or {})
            meta.setdefault("engine", "assistants")
            meta["web_search_enabled"] = False
            if use_web_search is not None:
                meta["user_web_search_override"] = use_web_search
            persist_model_response(entries, user_question, payload, meta)

        payload_with_disclaimer = {
            # New schema keys; keep legacy fallback if model emitted old keys
            "maternal_feedback": payload.get("maternal_feedback", payload.get("observations", [])),
            "child_development_insights": payload.get("child_development_insights", payload.get("observations", [])),
            "parenting_guidelines": payload.get("parenting_guidelines", payload.get("advice", [])),
            "sources": payload.get("sources", payload.get("citations", [])),
            "disclaimer": payload.get("disclaimer", DISCLAIMER),
        }
        return normalize_analysis_payload(payload_with_disclaimer)
    except HTTPException as exc:
        if not raise_on_failure:
            logger.warning("Analysis skipped due to upstream error: %s", exc.detail)
            return normalize_analysis_payload(None)
        raise
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Analysis generation failed: %s", exc)
        if not raise_on_failure:
            return normalize_analysis_payload(None)
        raise HTTPException(
            status_code=502, detail="Failed to generate analysis from language model."
        ) from exc


def _strip_code_fence(text: str) -> str:
    stripped = text.strip()
    if not stripped.startswith("```"):
        return stripped

    body = stripped[3:]
    newline_index = body.find("\n")
    if newline_index != -1:
        body = body[newline_index + 1 :]

    closing_index = body.rfind("```")
    if closing_index != -1:
        body = body[:closing_index]

    return body.strip()
