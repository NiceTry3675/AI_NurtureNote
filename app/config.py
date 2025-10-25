from __future__ import annotations

import os
from pathlib import Path
from typing import Iterator
from zoneinfo import ZoneInfo


APP_NAME = "AI_NurtureNote"
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "entries.db"

LOG_DIR = BASE_DIR / "logs"
RESPONSES_DIR = LOG_DIR / "responses"
ASSISTANT_ID_FILE = LOG_DIR / "assistant_id.txt"

ASIA_SEOUL = ZoneInfo("Asia/Seoul")

DEFAULT_RANGE_DAYS = 14
_DEFAULT_VECTOR_STORE_ID = "vs_68fba7187f748191b6b00ebafc3d7eb0"
_DEFAULT_MODEL_NAME = "gpt-5"
DISCLAIMER = "의료 진단이 아닌 일반 정보입니다."
SINGLE_ENTRY_QUESTION = "이 기록을 기반으로 도움이 될 간단한 관찰과 조언을 알려줘."

_ENV_LOADED = False

# --- Web search (MVP) defaults ---
# Minimal, conservative defaults for allowing authoritative domains only.
_DEFAULT_ENABLE_WEB_SEARCH = "true"
_DEFAULT_ALLOWED_WEB_DOMAINS = ",".join(
    [
        "who.int",
        "cdc.gov",
        "nih.gov",
        "ncbi.nlm.nih.gov",
        "nhs.uk",
        "nice.org.uk",
        "kdca.go.kr",
        "mohw.go.kr",
        "unicef.org",
        "un.org",
        "oecd.org",
    ]
)


def ensure_directories() -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    RESPONSES_DIR.mkdir(parents=True, exist_ok=True)


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


def get_vector_store_id() -> str:
    load_env_file()
    return os.getenv("VECTOR_STORE_ID", _DEFAULT_VECTOR_STORE_ID)


def get_model_name() -> str:
    load_env_file()
    return os.getenv("OPENAI_MODEL", _DEFAULT_MODEL_NAME)


def iter_env_items(prefix: str) -> Iterator[tuple[str, str]]:
    for key, value in os.environ.items():
        if key.startswith(prefix):
            yield key, value


def is_web_search_enabled() -> bool:
    """Return whether web_search tool should be enabled for analysis (MVP).

    Controlled by env var REPORT_ENABLE_WEB_SEARCH (default: true).
    """
    load_env_file()
    raw = os.getenv("REPORT_ENABLE_WEB_SEARCH", _DEFAULT_ENABLE_WEB_SEARCH).strip().lower()
    return raw in {"1", "true", "yes", "on"}


def get_allowed_web_domains() -> list[str]:
    """Return a cleaned allow-list of domains for web_search filters.

    Controlled by env var REPORT_WEB_ALLOWED_DOMAINS (CSV). Defaults to a
    conservative set of public/health/IGOs.
    """
    load_env_file()
    raw = os.getenv("REPORT_WEB_ALLOWED_DOMAINS", _DEFAULT_ALLOWED_WEB_DOMAINS)
    items = [item.strip().lower() for item in raw.split(",") if item.strip()]
    # Deduplicate while preserving order
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        if item not in seen:
            seen.add(item)
            result.append(item)
    # If env produced an empty allow-list, fall back to defaults to avoid
    # invalid requests requiring a non-empty allowed_domains parameter.
    if not result:
        result = [
            d.strip() for d in _DEFAULT_ALLOWED_WEB_DOMAINS.split(",") if d.strip()
        ]
    return result


ensure_directories()
load_env_file()
