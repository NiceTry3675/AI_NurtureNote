from __future__ import annotations

import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta
from typing import Any, Dict, Generator, List, Optional, Set

from .analysis_normalization import normalize_analysis_payload
from .config import ASIA_SEOUL, DB_PATH, load_env_file
from .logging_config import logger
from .models import EntryRecord, EntryResponse, analysis_payload_from_dict


def using_postgres() -> bool:
    """Return True if DATABASE_URL with postgres scheme is configured."""
    load_env_file()
    url = os.getenv("DATABASE_URL")
    return bool(url and url.startswith("postgres"))


def _pg_wrap_connection(conn: Any) -> Any:
    try:
        from psycopg.rows import dict_row  # type: ignore
    except Exception:  # pragma: no cover - import guard
        dict_row = None  # type: ignore

    class _PgCursorWrapper:
        def __init__(self, cursor: Any) -> None:
            self._cursor = cursor

        def execute(self, sql: str, params: Optional[tuple] = None) -> "_PgCursorWrapper":
            sql_conv = sql.replace("?", "%s")
            self._cursor.execute(sql_conv, params or ())
            return self

        def fetchall(self) -> List[Dict[str, Any]]:
            return self._cursor.fetchall()

        def fetchone(self) -> Optional[Dict[str, Any]]:
            return self._cursor.fetchone()

        def __getattr__(self, name: str) -> Any:
            return getattr(self._cursor, name)

    class _PgConnectionWrapper:
        def __init__(self, base_conn: Any) -> None:
            self._base = base_conn

        def cursor(self) -> _PgCursorWrapper:
            if dict_row is not None:
                return _PgCursorWrapper(self._base.cursor(row_factory=dict_row))
            return _PgCursorWrapper(self._base.cursor())

        def commit(self) -> None:
            self._base.commit()

        def rollback(self) -> None:
            self._base.rollback()

        def close(self) -> None:
            self._base.close()

        def __enter__(self) -> "_PgConnectionWrapper":
            return self

        def __exit__(self, exc_type, exc, tb) -> None:
            self.close()

    return _PgConnectionWrapper(conn)


def initialize_database() -> None:
    ddl_sql = (
        """
        CREATE TABLE IF NOT EXISTS entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            mood TEXT NOT NULL,
            body TEXT NOT NULL,
            analysis_json TEXT
        );
        """
        if not using_postgres()
        else
        """
        CREATE TABLE IF NOT EXISTS entries (
            id SERIAL PRIMARY KEY,
            created_at TEXT NOT NULL,
            mood TEXT NOT NULL,
            body TEXT NOT NULL,
            analysis_json TEXT
        );
        """
    )
    with db_cursor() as cursor:
        cursor.execute(ddl_sql)
        ensure_analysis_column(cursor)
    target = os.getenv("DATABASE_URL", str(DB_PATH))
    logger.info("Database initialized at %s", target)


def ensure_analysis_column(cursor: Any) -> None:
    if using_postgres():
        cursor.execute("ALTER TABLE entries ADD COLUMN IF NOT EXISTS analysis_json TEXT")
        return

    columns: Set[str] = set()
    try:
        cursor.execute("PRAGMA table_info(entries)")
        rows = cursor.fetchall()
        for row in rows:
            name = _get_row_value(row, "name")
            if name:
                columns.add(str(name))
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("Failed to inspect entries table columns: %s", exc)
        columns = set()

    if "analysis_json" not in columns:
        cursor.execute("ALTER TABLE entries ADD COLUMN analysis_json TEXT")


def get_db_connection() -> Any:
    """Return a DB connection: SQLite for dev, Postgres for prod."""
    if using_postgres():
        try:
            import psycopg  # type: ignore
        except Exception as exc:  # pragma: no cover - import guard
            logger.error("psycopg not installed for Postgres: %s", exc)
            raise RuntimeError("Postgres driver not installed.") from exc
        dsn = os.getenv("DATABASE_URL")
        if not dsn:
            raise RuntimeError("DATABASE_URL env is missing.")
        base_conn = psycopg.connect(dsn)
        return _pg_wrap_connection(base_conn)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def db_cursor() -> Generator[Any, None, None]:
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


def _parse_analysis_blob(raw: Any) -> Optional[Dict[str, Any]]:
    if raw in (None, ""):
        return None
    if isinstance(raw, dict):
        return raw
    try:
        return json.loads(raw)
    except (TypeError, json.JSONDecodeError) as exc:
        logger.warning("Failed to parse analysis_json payload: %s", exc)
        return None


def _get_row_value(row: Any, key: str) -> Any:
    try:
        if isinstance(row, dict):
            return row.get(key)
        return row[key]
    except (KeyError, TypeError, IndexError):
        return None


def entry_record_from_row(row: Any) -> EntryRecord:
    raw_analysis = _parse_analysis_blob(_get_row_value(row, "analysis_json"))
    analysis = None
    if raw_analysis is not None:
        analysis = normalize_analysis_payload(raw_analysis)

    entry_id = int(_get_row_value(row, "id"))
    created_at = str(_get_row_value(row, "created_at"))
    mood = str(_get_row_value(row, "mood"))
    body = str(_get_row_value(row, "body"))

    return EntryRecord(
        id=entry_id,
        created_at=created_at,
        mood=mood,
        body=body,
        analysis=analysis,
    )


def entry_record_to_response(entry: EntryRecord) -> EntryResponse:
    analysis_payload = (
        analysis_payload_from_dict(entry.analysis) if entry.analysis is not None else None
    )
    return EntryResponse(
        id=entry.id,
        created_at=entry.created_at,
        mood=entry.mood,
        body=entry.body,
        analysis=analysis_payload,
    )


def persist_entry_analysis(entry_id: int, analysis: Dict[str, Any]) -> None:
    normalized = normalize_analysis_payload(analysis)
    try:
        payload = json.dumps(normalized, ensure_ascii=False)
    except TypeError as exc:
        logger.error("Analysis payload not serializable for entry %d: %s", entry_id, exc)
        return

    with db_cursor() as cursor:
        cursor.execute(
            "UPDATE entries SET analysis_json = ? WHERE id = ?",
            (payload, entry_id),
        )

    logger.info("Analysis persisted for entry %d", entry_id)


def fetch_entry(entry_id: int) -> Optional[EntryRecord]:
    with db_cursor() as cursor:
        cursor.execute(
            "SELECT id, created_at, mood, body, analysis_json FROM entries WHERE id = ?",
            (entry_id,),
        )
        row = cursor.fetchone()

    if not row:
        return None
    return entry_record_from_row(row)


def get_entries_within_range(range_days: int) -> List[EntryRecord]:
    cutoff = (
        datetime.now(tz=ASIA_SEOUL) - timedelta(days=range_days)
    ).isoformat(timespec="seconds")

    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT id, created_at, mood, body, analysis_json
            FROM entries
            WHERE created_at >= ?
            ORDER BY created_at DESC
            """,
            (cutoff,),
        )
        rows = cursor.fetchall()

    return [entry_record_from_row(row) for row in rows]


def list_recent_entries(limit: int) -> List[EntryResponse]:
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT id, created_at, mood, body, analysis_json
            FROM entries
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (limit,),
        )
        rows = cursor.fetchall()

    entries = [entry_record_from_row(row) for row in rows]
    return [entry_record_to_response(entry) for entry in entries]


def get_db_dependency() -> Generator[Any, None, None]:
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()
