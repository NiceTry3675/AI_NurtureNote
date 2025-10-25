from __future__ import annotations

import argparse
import json
from typing import Optional

import requests
from fastapi import HTTPException
from requests import RequestException

from .analysis import request_analysis
from .config import DEFAULT_RANGE_DAYS, SINGLE_ENTRY_QUESTION
from .db import get_entries_within_range, initialize_database
from .logging_config import logger


def send_demo_entry(base_url: str) -> None:
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


def cli_main() -> None:
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
