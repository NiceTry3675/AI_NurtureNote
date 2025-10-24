from __future__ import annotations

import json
import logging
import os
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Generator, List, Optional

import requests
from fastapi import Depends, FastAPI, HTTPException, Query
from pydantic import BaseModel, Field
from requests import RequestException
from zoneinfo import ZoneInfo

try:
    from openai import OpenAI
except ImportError as exc:  # pragma: no cover - openai optional during import
    raise RuntimeError(
        "The openai package must be installed to run this application."
    ) from exc

APP_NAME = "AI_NurtureNote"
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "entries.db"
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

logger = logging.getLogger(APP_NAME)
logger.setLevel(logging.INFO)

if not logger.handlers:
    formatter = logging.Formatter(
        "%(asctime)s %(levelname)s [%(name)s] %(message)s", "%Y-%m-%d %H:%M:%S"
    )
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    file_handler = logging.FileHandler(LOG_DIR / "app.log")
    file_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)
    logger.addHandler(file_handler)

ASIA_SEOUL = ZoneInfo("Asia/Seoul")
DEFAULT_RANGE_DAYS = 14
VECTOR_STORE_ID = os.getenv(
    "VECTOR_STORE_ID", "vs_68fba7187f748191b6b00ebafc3d7eb0"
)
MODEL_NAME = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
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


def extract_output_text(data: dict) -> str:
    outputs = data.get("output", [])
    text_parts = []
    for item in outputs:
        content = item.get("content", [])
        for block in content:
            if block.get("type") == "output_text":
                text_parts.append(block.get("text", ""))
    return "\n".join(part for part in text_parts if part).strip()


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
        removed = strip_proxy_env_for_openai()
        if removed:
            logger.info("Proxy settings were ignored for OpenAI client bootstrap.")
        _openai_client = OpenAI(**client_kwargs)
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


def call_responses_api(system_prompt: str, user_prompt: str) -> dict:
    client = get_openai_client()
    try:
        response = client.responses.create(
            model=MODEL_NAME,
            input=[
                {"role": "system", "content": [{"type": "text", "text": system_prompt}]},
                {"role": "user", "content": [{"type": "text", "text": user_prompt}]},
            ],
            tools=[{"type": "file_search"}],
            tool_resources={"file_search": {"vector_store_ids": [VECTOR_STORE_ID]}},
            response_format={"type": "json_object"},
        )
    except Exception as exc:
        logger.error("OpenAI Responses API request failed: %s", exc)
        raise HTTPException(
            status_code=502, detail="Failed to contact language model service."
        ) from exc

    output_text = getattr(response, "output_text", None)
    response_payload: dict = {}
    if hasattr(response, "to_dict"):
        try:
            response_payload = response.to_dict()
        except Exception:
            response_payload = {}
    elif hasattr(response, "model_dump"):
        try:
            response_payload = response.model_dump()
        except Exception:
            response_payload = {}

    if not output_text and response_payload:
        output_text = extract_output_text(response_payload)

    if not output_text:
        logger.error("OpenAI response missing output_text: %s", response_payload)
        raise HTTPException(
            status_code=502, detail="Language model returned empty content."
        )

    try:
        return json.loads(output_text)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse JSON from model output: %s | text=%s", exc, output_text)
        raise HTTPException(
            status_code=502, detail="Language model returned malformed JSON."
        ) from exc


def request_analysis(
    entries: List[EntryRecord],
    question: Optional[str],
    *,
    raise_on_failure: bool = True,
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
        payload = call_responses_api(system_prompt, user_prompt)

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
    analysis = request_analysis(entries, payload.question)

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
            analysis = request_analysis(entries, args.question)
        except HTTPException as exc:
            print(f"분석 요청 실패: {exc.detail}")
        else:
            print(json.dumps(analysis, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
