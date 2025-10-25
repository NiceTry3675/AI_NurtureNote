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


def send_demo_entry(base_url: str, demo_type: str = "default") -> None:
    """Send a demo entry to the API with various parenting scenarios."""

    demo_scenarios = {
        "default": {
            "mood": "걱정됨",
            "body": "쌔근쌔근 잠든 널 보니 낮의 소란은 다 거짓말 같다. 오늘도 이유식 시간은 전쟁이었다. 내가 정성껏 만든 이유식을 떠먹이려 하면, 어느새 내 손에서 숟가락을 낚아채 바닥으로 휙- 던져버린다. 마치 내 반응을 즐기는 듯한 그 표정. 내가 안돼! 하고 단호하게 말해도, 넌 그저 재밌는 놀이인 양 꺄르르 웃어버린다. 그 웃음소리에 힘이 쭉 빠진다. 맘카페에 검색해보니 어떤 엄마는 '다들 그런다'고 하고, 어떤 엄마는 '공격성의 시작일 수 있다'고 한다. 공격성이라니. 가슴이 덜컥 내려앉는다. 오후에 잠시 들르신 시어머니는 그 모습을 보시더니 '애가 벌써부터 성질이 보통이 아니네'라며 한마디 거드신다. 내가 너무 오냐오냐 키우는 걸까? 지금 단호하게 버릇을 잡지 않으면, 나중에 정말 감당 안 되는 아이가 되면 어떡하지? 잠든 네 얼굴을 보면서도 마음이 편치 않은 밤이다.",
        },
        "sick_child": {
            "mood": "걱정되고 안쓰럽지만 최선을 다함",
            "body": "아침에 일어나니 아이가 열이 나고 컨디션이 좋지 않아서 병원에 데려갔다. 소아과에서 감기 진단을 받고 해열제를 처방받았는데, 아이가 약을 잘 먹지 않아서 좋아하는 요구르트에 섞어서 먹였다. 오후에는 주로 안아주고 동화책을 읽어주며 조용히 지냈고, 평소보다 낮잠을 길게 자서 다행이었다. 저녁에는 죽을 만들어서 조금씩 먹였고, 밤에는 아이가 자꾸 깨서 안아주느라 나도 피곤했지만 아이가 편안해하는 모습을 보니 마음이 놓였다.",
        },
        "first_separation": {
            "mood": "마음이 복잡하고 그리울 것 같지만 성장하는 기분",
            "body": "오늘 처음으로 아이를 어린이집에 보내기 시작했다. 아침에 등원할 때 울면서 매달려서 마음이 아팠지만, 선생님께서 잘 달래주시고 장난감을 보여주니 조금씩 적응하는 것 같았다. 점심시간에 전화해보니 밥도 잘 먹고 친구들과 함께 놀고 있다고 하셔서 안심이 되었다. 하원할 때 아이가 '집에 가고 싶었어'라고 말하니 가슴이 먹먹했지만, 새로운 환경에 적응하는 모습을 보니 대견하기도 했다. 저녁에는 아이와 함께 오늘 있었던 일들을 이야기하며 포근한 시간을 보냈다.",
        },
        "new_skill": {
            "mood": "신기하고 자랑스러움",
            "body": "오늘 아이가 처음으로 혼자 숟가락을 들고 밥을 먹으려는 시도를 해서 깜짝 놀랐다. 아직 서툴지만 죽을 떠서 입으로 가져가는 모습이 너무 대견스러워서 계속 응원하며 지켜봤다. 오전에는 블록으로 탑을 쌓더니 이제는 5층까지 쌓을 수 있게 되었다고 자랑하며 보여주는데, 매일 발전하는 모습에 감탄이 절로 나왔다. 낮잠 후에는 색연필을 잡고 처음으로 원을 그리는 시도를 했고, 저녁에는 '엄마', '아빠' 외에도 '밥'이라는 단어를 따라 하려는 모습이 보였다. 아이의 성장을 지켜보는 기쁨이 매일 새롭다.",
        },
        "family_outing": {
            "mood": "즐겁고 활기찬 하루",
            "body": "오늘 가족 모두 함께 동물원에 나들이를 갔다. 아이가 사자와 코끼리를 보고 처음으로 '와아!' 하며 신기해하는 모습을 보니 너무 즐거웠다. 원숭이 우리 앞에서 30분이나 서서 관찰하며 따라 하려는 동작들이 너무 귀여웠고, 기린 먹이를 주는 체험을 하며 아이가 무척 신났던 것 같다. 점심으로는 동물원에서 도시락을 먹었는데, 평소보다 훨씬 잘 먹는 모습을 보였다. 오후에는 동물 인형을 사서 집에 오는 길에 계속 안고 있었고, 저녁에는 동물원에서 본 동물들을 이야기하며 하루 종일 들떠 있었다.",
        },
        "meal_challenge": {
            "mood": "인내심이 필요하지만 보람있음",
            "body": "오늘 처음으로 브로콜리를 아이에게 먹여보기로 했다. 평소 채소를 싫어하던 아이가 처음에는 고개를 저었지만, 재미있는 이야기를 하며 한 입 먹여보니 의외로 '또!' 하며 더 달라고 해서 깜짝 놀랐다. 점심에는 당근을 갈아서 미트볼에 섞어서 먹였는데, 모르고 잘 먹는 모습을 보니 뿌듯했다. 오후에는 과일을 먹을 때 평소보다 다양한 색깔의 과일을 골라서 주니 호기심을 보이며 조금씩 시도하는 모습이 좋았다. 저녁에는 채소 스프를 만들어서 아이가 좋아하는 캐릭터 그릇에 담아주니 평소보다 훨씬 잘 먹었다. 식사 시간에 인내심을 가지며 다양한 시도를 해보는 것이 중요하다는 것을 느꼈다.",
        },
        "emotional_support": {
            "mood": "마음이 아프지만 아이를 도울 수 있어서 다행",
            "body": "오늘 아이가 장난감을 뺏기고 나서 처음으로 크게 화를 내고 울면서 바닥을 구르는 모습을 보였다. 처음에는 당황했지만, 아이를 안아주고 감정을 공감하며 '화가 많이 났구나, 슬프고 속상했지?'라고 말씀드리니 조금씩 진정되었다. 10분 정도 안아주며 기다리니 아이가 '미안해'라고 말하며 사과하는 모습을 보였고, 그 후에는 서로 번갈아 장난감을 가지고 놀며 화해했다. 낮잠 후에는 아이가 먼저 '같이 놀자'고 말하며 다가와서 마음이 놓였다. 아이의 감정 조절을 도와주는 것이 얼마나 중요한지 새삼 느꼈다.",
        },
    }

    if demo_type not in demo_scenarios:
        print(f"사용 가능한 데모 타입: {', '.join(demo_scenarios.keys())}")
        return

    payload = demo_scenarios[demo_type]
    url = base_url.rstrip("/") + "/entries"

    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
    except RequestException as exc:
        logger.error("Demo entry POST failed: %s", exc)
        print(f"데모 인풋 전송 실패: {exc}")
        return

    logger.info("Demo entry sent to %s", url)
    print(f"'{demo_type}' 데모 인풋 전송 성공:")
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
        "--demo",
        type=str,
        nargs="?",
        const="default",
        choices=["default", "sick_child", "first_separation", "new_skill", "family_outing", "meal_challenge", "emotional_support"],
        help="POST a demo entry to the running FastAPI server. Choose from: default (일상), sick_child (아픈 아이), first_separation (첫 이별), new_skill (새로운 기술), family_outing (가족 나들이), meal_challenge (식사 도전), emotional_support (감정 조절). Default: default",
    )
    parser.add_argument(
        "--server",
        type=str,
        default="http://127.0.0.1:8000",
        help="Base URL of the running backend server",
    )

    args = parser.parse_args()

    if args.demo:
        send_demo_entry(args.server, args.demo)

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
