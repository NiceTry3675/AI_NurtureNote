from __future__ import annotations

import os
from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import APP_NAME, load_env_file
from .db import initialize_database
from .logging_config import logger
from .routers import entries_router, health_router


def _cors_origins() -> List[str]:
    load_env_file()
    raw = os.getenv("CORS_ORIGINS")
    if raw:
        return [origin.strip() for origin in raw.split(",") if origin.strip()]
    return [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


app = FastAPI(title=APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(entries_router)


@app.on_event("startup")
def on_startup() -> None:
    initialize_database()
    logger.info("Application startup complete.")


if __name__ == "__main__":  # pragma: no cover - CLI compatibility
    from .cli import cli_main

    cli_main()
