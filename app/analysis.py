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
                + "\n\n반드시 JSON 객체만 출력하고 키는 observations, evidence, advice, citations 이다."
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
            return json.loads(output_text)
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

    system_prompt = (
        "관찰 요약은 사용자 일기 텍스트만 근거로, 사실만 간결히.\n"
        "조언/가이드는 file_search로 찾은 문서에서만 근거로 작성하고, "
        "각 조언 뒤에 (기관, 연도, 문서명) 1줄 인용을 붙여라.\n"
        "한국어로 짧고 명확하게. 반드시 JSON으로 출력하고 키는 "
        "observations, evidence, advice, citations 네 가지다."
    )

    user_prompt = (
        "entries_text:\n"
        f"{entries_text}\n\n"
        "위 기록을 토대로 최근 경향을 관찰 요약하고, 질문에 대한 조언을 제공해라.\n"
        f"question: {user_question}"
    )

    logger.info("Requesting analysis for %d entries", len(entries))

    try:
        payload = call_assistants_api(system_prompt, user_prompt)
        meta = dict(metadata or {})
        meta.setdefault("engine", "assistants")
        persist_model_response(entries, user_question, payload, meta)

        payload_with_disclaimer = {
            "observations": payload.get("observations", []),
            "evidence": payload.get("evidence", []),
            "advice": payload.get("advice", []),
            "citations": payload.get("citations", []),
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
