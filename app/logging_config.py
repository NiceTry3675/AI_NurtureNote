from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any, Dict

from .config import APP_NAME, ASIA_SEOUL, LOG_DIR, ensure_directories


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


def configure_logger() -> logging.Logger:
    ensure_directories()
    logger = logging.getLogger(APP_NAME)
    logger.setLevel(logging.INFO)

    if logger.handlers:
        return logger

    text_formatter = logging.Formatter(
        "%(asctime)s %(levelname)s [%(name)s] %(message)s", "%Y-%m-%d %H:%M:%S"
    )
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(text_formatter)

    file_handler = logging.FileHandler(LOG_DIR / "app.log")
    file_handler.setFormatter(JsonFormatter())

    logger.addHandler(stream_handler)
    logger.addHandler(file_handler)
    return logger


logger = configure_logger()
