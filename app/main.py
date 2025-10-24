from __future__ import annotations

import json
import time
import logging
import os
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional
from uuid import uuid4

import requests
from fastapi import Depends, FastAPI, HTTPException, Query
from pydantic import BaseModel, Field
from requests import RequestException
from zoneinfo import ZoneInfo

try:
    from openai import OpenAI
    import openai as openai_pkg  # type: ignore
except ImportError as exc:  # pragma: no cover - openai optional during import
    raise RuntimeError(
        "The openai package must be installed to run this application."
    ) from exc

APP_NAME = "AI_NurtureNote"
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "entries.db"
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)
RESPONSES_DIR = LOG_DIR / "responses"
RESPONSES_DIR.mkdir(parents=True, exist_ok=True)
ASSISTANT_ID_FILE = LOG_DIR / "assistant_id.txt"

ASIA_SEOUL = ZoneInfo("Asia/Seoul")


class JsonFormatter(logging.Formatter):
    """Format log records as JSON lines."""

    def format(self, record: logging.LogRecord) -> str:
        log_time = datetime.fromtimestamp(record.created, tz=ASIA_SEOUL)
        log_record: Dict[str, Any] = {
            "timestamp": log_time.isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        if record.exc_info:
            log_record["exc_info"] = self.formatException(record.exc_info)
        if record.stack_info:
            log_record["stack_info"] = self.formatStack(record.stack_info)

        reserved_keys = {
            "args",
            "asctime",
            "created",
            "exc_info",
            "exc_text",
            "filename",
            "funcName",
            "levelname",
            "levelno",
            "lineno",
            "message",
            "module",
            "msecs",
            "msg",
            "name",
            "pathname",
            "process",
            "processName",
            "relativeCreated",
            "stack_info",
            "thread",
            "threadName",
        }

        for key, value in record.__dict__.items():
            if key in reserved_keys or key.startswith("_"):
                continue
            log_record.setdefault("extra", {})[key] = value

        return json.dumps(log_record, ensure_ascii=False)


logger = logging.getLogger(APP_NAME)
logger.setLevel(logging.INFO)

if not logger.handlers:
    text_formatter = logging.Formatter(
        "%(asctime)s %(levelname)s [%(name)s] %(message)s", "%Y-%m-%d %H:%M:%S"
    )
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(text_formatter)
    file_handler = logging.FileHandler(LOG_DIR / "app.log")
    file_handler.setFormatter(JsonFormatter())
    logger.addHandler(stream_handler)
    logger.addHandler(file_handler)
DEFAULT_RANGE_DAYS = 14
VECTOR_STORE_ID = os.getenv(
    "VECTOR_STORE_ID", "vs_68fba7187f748191b6b00ebafc3d7eb0"
)
MODEL_NAME = os.getenv("OPENAI_MODEL", "gpt-5")
DISCLAIMER = "의료 진단이 아닌 일반 정보입니다."
SINGLE_ENTRY_QUESTION = "이 기록을 기반으로 도움이 될 간단한 관찰과 조언을 알려줘."

_openai_client: Optional[OpenAI] = None
_ENV_LOADED = False


def load_env_file() -> None:
    """Load environment variables from a local .env file if needed."""
    global _ENV_LOADED
    if _ENV_LOADED:
        return

    env_path = BASE_DIR / ".env"
    if env_path.exists():
        with env_path.open("r", encoding="utf-8") as handle:
            for raw_line in handle:
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                if key and key not in os.environ:
                    os.environ[key] = value
    _ENV_LOADED = True


# Removed legacy Responses API parsing helpers; Assistants API only


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
        # Validate Assistants (beta) availability for clarity
        if not (hasattr(_openai_client, "beta") and hasattr(_openai_client.beta, "assistants") and hasattr(_openai_client.beta, "threads")):
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


@dataclass
class EntryRecord:
    id: int
    created_at: str
    mood: str
    body: str


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


app = FastAPI(title=APP_NAME)


def initialize_database() -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                mood TEXT NOT NULL,
                body TEXT NOT NULL
            );
            """
        )
        conn.commit()
    logger.info("Database initialized at %s", DB_PATH)


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def db_cursor() -> Generator[sqlite3.Cursor, None, None]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        yield cursor
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def get_entries_within_range(range_days: int) -> List[EntryRecord]:
    cutoff = (
        datetime.now(tz=ASIA_SEOUL) - timedelta(days=range_days)
    ).isoformat(timespec="seconds")

    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT id, created_at, mood, body
            FROM entries
            WHERE created_at >= ?
            ORDER BY created_at DESC
            """,
            (cutoff,),
        )
        rows = cursor.fetchall()

    return [
        EntryRecord(
            id=row["id"],
            created_at=row["created_at"],
            mood=row["mood"],
            body=row["body"],
        )
        for row in rows
    ]


def serialize_entries(entries: List[EntryRecord]) -> str:
    lines = []
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
        "model": MODEL_NAME,
        "vector_store_id": VECTOR_STORE_ID,
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

    # Generate a unique filename and write with exclusive create to avoid overwrite
    last_exc: Optional[Exception] = None
    for _ in range(10):
        filename = (
            datetime.now(tz=ASIA_SEOUL).strftime("%Y%m%dT%H%M%S")
            + f"_{uuid4().hex}.json"
        )
        filepath = RESPONSES_DIR / filename
        try:
            with filepath.open("x", encoding="utf-8") as handle:  # 'x' ensures no overwrite
                json.dump(record, handle, ensure_ascii=False, indent=2)
            logger.info(
                "Model response persisted",
                extra={"response_file": str(filepath), "entry_count": len(entries)},
            )
            return
        except FileExistsError as exc:  # extremely unlikely; try again
            last_exc = exc
            continue
        except Exception as exc:  # pragma: no cover - best effort
            last_exc = exc
            break
    # If we failed to persist after retries, log an error
    logger.error(
        "Failed to persist model response: %s",
        last_exc,
        extra={"file": str(filepath) if 'filepath' in locals() else None},
    )
    return


def get_or_create_assistant_id(client: "OpenAI", system_instructions: str) -> str:
    # 1) env override
    env_id = os.getenv("OPENAI_ASSISTANT_ID")
    if env_id:
        return env_id

    # 2) cached file
    if ASSISTANT_ID_FILE.exists():
        try:
            cached = ASSISTANT_ID_FILE.read_text(encoding="utf-8").strip()
            if cached:
                return cached
        except Exception:
            pass

    # 3) create new assistant with file_search bound to vector store
    try:
        asst = client.beta.assistants.create(
            model=MODEL_NAME,
            instructions=(
                system_instructions
                + "\n\n반드시 JSON 객체만 출력하고 키는 observations, evidence, advice, citations 이다."
            ),
            tools=[{"type": "file_search"}],
            tool_resources={"file_search": {"vector_store_ids": [VECTOR_STORE_ID]}},
        )
    except Exception as exc:
        logger.error("Failed to create assistant: %s", exc)
        raise HTTPException(status_code=502, detail="Failed to prepare assistant.") from exc

    try:
        ASSISTANT_ID_FILE.write_text(asst.id, encoding="utf-8")
    except Exception:
        # best-effort cache write
        pass
    return asst.id


# Removed Responses API flow; Assistants API only for clarity


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

        # Poll until completion
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

        # Fetch latest assistant message
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


def request_analysis(
    entries: List[EntryRecord],
    question: Optional[str],
    *,
    raise_on_failure: bool = True,
    metadata: Optional[Dict[str, Any]] = None,
) -> dict:
    if not entries:
        logger.info("No entries available for analysis.")
        return {
            "observations": [],
            "evidence": [],
            "advice": [],
            "citations": [],
        }

    entries_text = serialize_entries(entries)
    user_question = (question or "최근 기록을 바탕으로 도움이 될 일반 조언을 알려줘.").strip()

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

        return {
            "observations": payload.get("observations", []),
            "evidence": payload.get("evidence", []),
            "advice": payload.get("advice", []),
            "citations": payload.get("citations", []),
        }
    except HTTPException as exc:
        if not raise_on_failure:
            logger.warning("Analysis skipped due to upstream error: %s", exc.detail)
            return {
                "observations": [],
                "evidence": [],
                "advice": [],
                "citations": [],
            }
        raise
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Analysis generation failed: %s", exc)
        if not raise_on_failure:
            return {
                "observations": [],
                "evidence": [],
                "advice": [],
                "citations": [],
            }
        raise HTTPException(
            status_code=502, detail="Failed to generate analysis from language model."
        ) from exc


def to_analysis_payload(data: dict) -> AnalysisPayload:
    return AnalysisPayload(
        observations=data.get("observations", []),
        evidence=data.get("evidence", []),
        advice=data.get("advice", []),
        citations=data.get("citations", []),
    )


@app.on_event("startup")
def on_startup() -> None:
    initialize_database()
    logger.info("Application startup complete.")


def get_db_dependency() -> Generator[sqlite3.Connection, None, None]:
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()


@app.post("/entries", response_model=EntryResponse)
def create_entry(entry: EntryCreate, conn: sqlite3.Connection = Depends(get_db_dependency)):
    created_at = datetime.now(tz=ASIA_SEOUL).isoformat(timespec="seconds")
    clean_mood = entry.mood.strip()
    clean_body = entry.body.strip()

    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO entries (created_at, mood, body)
        VALUES (?, ?, ?)
        """,
        (created_at, clean_mood, clean_body),
    )
    entry_id = cursor.lastrowid
    conn.commit()

    entry_record = EntryRecord(
        id=entry_id,
        created_at=created_at,
        mood=clean_mood,
        body=clean_body,
    )
    analysis_payload: Optional[AnalysisPayload] = None

    try:
        analysis_data = request_analysis(
            [entry_record],
            SINGLE_ENTRY_QUESTION,
            raise_on_failure=False,
            metadata={
                "type": "single_entry",
                "entry_id": entry_record.id,
                "created_at": entry_record.created_at,
            },
        )
        has_content = any(
            analysis_data.get(key)
            for key in ("observations", "advice", "citations", "evidence")
        )
        if has_content:
            analysis_payload = to_analysis_payload(analysis_data)
    except Exception as exc:  # pragma: no cover - defensive
        logger.error("Single-entry analysis failed: %s", exc)

    logger.info("Entry %d saved with mood '%s'", entry_id, clean_mood)

    return EntryResponse(
        id=entry_record.id,
        created_at=entry_record.created_at,
        mood=entry_record.mood,
        body=entry_record.body,
        analysis=analysis_payload,
    )


@app.get("/entries", response_model=List[EntryResponse])
def list_entries(
    limit: int = Query(20, ge=1, le=100),
    conn: sqlite3.Connection = Depends(get_db_dependency),
):
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, created_at, mood, body
        FROM entries
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (limit,),
    )
    rows = cursor.fetchall()

    entries = [
        EntryResponse(
            id=row["id"],
            created_at=row["created_at"],
            mood=row["mood"],
            body=row["body"],
        )
        for row in rows
    ]

    logger.info("Fetched %d entries (limit=%d)", len(entries), limit)
    return entries


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_entries(payload: AnalyzeRequest):
    entries = get_entries_within_range(payload.range_days)
    analysis = request_analysis(
        entries,
        payload.question,
        metadata={
            "type": "window_analysis",
            "range_days": payload.range_days,
            "entry_count": len(entries),
        },
    )

    response = AnalyzeResponse(
        window=WindowInfo(range_days=payload.range_days, entry_count=len(entries)),
        observations=analysis.get("observations", []),
        evidence=analysis.get("evidence", []),
        advice=analysis.get("advice", []),
        citations=analysis.get("citations", []),
        disclaimer=DISCLAIMER,
    )
    logger.info(
        "Analysis completed for %d entries over last %d days",
        len(entries),
        payload.range_days,
    )
    return response


def send_demo_entry(base_url: str) -> None:
    """POST a canned demo entry to the running FastAPI backend."""
    payload = {
        "mood": "피곤하지만 뿌듯",
        "body": (
            "새벽에 두 번 깨어서 안아주느라 잠이 부족했지만, 아침에 일어나 가족이 함께 20분 정도 느긋하게 "
            "스트레칭하고 산책을 하니 아이가 금방 웃음을 되찾았다. 오전에는 동화책을 함께 읽어주며 "
            "조용한 시간을 보냈고, 점심 이후에는 30분 정도 블록 놀이를 하며 혼자 집중하는 모습을 지켜봤다. "
            "최근 들어 오후 낮잠 시간이 뒤로 밀리는 경향이 있어서 오늘은 평소보다 15분 일찍 준비해 보았고, "
            "잠들기 전에 좋아하는 자장가를 반복해서 불러 주니 비교적 빠르게 잠들었다."
        ),
    }
    url = base_url.rstrip("/") + "/entries"
    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
    except RequestException as exc:
        logger.error("Demo entry POST failed: %s", exc)
        print(f"데모 인풋 전송 실패: {exc}")
        return

    logger.info("Demo entry sent to %s", url)
    print("데모 인풋 전송 성공:")
    try:
        print(json.dumps(response.json(), ensure_ascii=False, indent=2))
    except ValueError:
        print(response.text)


def main() -> None:
    """Basic CLI helper to display latest entries and analysis."""
    import argparse

    parser = argparse.ArgumentParser(description="AI NurtureNote CLI helper")
    parser.add_argument("--list", action="store_true", help="Show recent entries")
    parser.add_argument(
        "--analyze",
        action="store_true",
        help="Run analysis for recent entries (default 14 days)",
    )
    parser.add_argument("--range", type=int, default=DEFAULT_RANGE_DAYS)
    parser.add_argument("--question", type=str, default=None)
    parser.add_argument(
        "--demo-entry",
        action="store_true",
        help="POST a canned demo entry to the running FastAPI server",
    )
    parser.add_argument(
        "--server",
        type=str,
        default="http://127.0.0.1:8000",
        help="Base URL of the running backend server",
    )

    args = parser.parse_args()

    if args.demo_entry:
        send_demo_entry(args.server)

    if args.list or args.analyze:
        initialize_database()

    if args.list:
        entries = get_entries_within_range(args.range)
        if not entries:
            print("최근 범위 내 일기 기록이 없습니다.")
        else:
            print("최근 일기 기록:")
            for entry in entries:
                print(f"- {entry.created_at} | {entry.mood} | {entry.body}")

    if args.analyze:
        entries = get_entries_within_range(args.range)
        try:
            analysis = request_analysis(
                entries,
                args.question,
                metadata={
                    "type": "cli_analysis",
                    "range_days": args.range,
                    "entry_count": len(entries),
                },
            )
        except HTTPException as exc:
            print(f"분석 요청 실패: {exc.detail}")
        else:
            print(json.dumps(analysis, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
