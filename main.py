"""CLI 엔트리포인트 — 터미널에서 에이전트 파이프라인을 실행합니다.

사용법::

    python main.py "카페를 운영하는데 주문/재고 관리를 자동화하고 싶어요"

입력을 인자로 전달하지 않으면, 대화형으로 입력을 받습니다.
"""

from __future__ import annotations

import asyncio
import logging
import sys

from agents.orchestrator import workflow
from core.state import create_initial_state

# 로깅 설정 — DEBUG 레벨로 에이전트 실행 과정 추적 가능
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


async def run(user_input: str) -> None:
    """에이전트 파이프라인을 실행하고 결과를 출력합니다.

    Args:
        user_input: 사용자가 입력한 비즈니스 요구사항 텍스트.
    """
    # create_initial_state() 팩토리로 초기 상태 생성 (api/main.py와 로직 공유)
    initial_state = create_initial_state(user_input)
    config = {"configurable": {"thread_id": "cli-session"}}

    print("=" * 60)
    print("HomeTTak SaaS 에이전트 팀 파이프라인 시작")
    print("=" * 60)
    print(f"\n입력: {user_input}\n")

    result = await workflow.ainvoke(initial_state, config=config)

    # 각 에이전트 산출물을 순서대로 출력
    sections = [
        ("1. 컨설팅 분석", "consulting_output"),
        ("2. SaaS 기획", "planning_output"),
        ("3. 디자인 명세", "design_output"),
        ("4. 백엔드 설계", "backend_output"),
        ("5. 개발 프롬프트", "prompting_output"),
    ]

    for title, key in sections:
        print(f"\n{'=' * 60}")
        print(f"  {title}")
        print("=" * 60)
        print(result.get(key, "(결과 없음)"))

    print(f"\n{'=' * 60}")
    print("  파이프라인 완료!")
    print("=" * 60)


def main():
    """CLI 진입점. 인자 또는 대화형 입력을 받아 파이프라인을 실행합니다."""
    if len(sys.argv) > 1:
        # 커맨드라인 인자로 입력 전달
        user_input = " ".join(sys.argv[1:])
    else:
        print('사용법: python main.py "카페를 운영하는데 주문/재고 관리를 자동화하고 싶어요"')
        print("\n입력을 직접 입력하세요:")
        user_input = input("> ").strip()
        if not user_input:
            print("입력이 비어있습니다.")
            sys.exit(1)

    asyncio.run(run(user_input))


if __name__ == "__main__":
    main()
