"""에이전트 간 공유 상태 정의 (LangGraph State).

LangGraph의 StateGraph에서 사용되는 공유 상태 스키마입니다.
각 에이전트 노드는 이 상태를 읽고 쓰며, 파이프라인 전체에서
데이터를 주고받는 유일한 통로 역할을 합니다.
"""

from __future__ import annotations

import operator
from typing import Annotated

from typing_extensions import TypedDict


class AgentState(TypedDict):
    """전체 에이전트 파이프라인에서 공유되는 상태.

    Attributes:
        user_input: 사용자가 입력한 비즈니스 요구사항 텍스트.
        consulting_output: 컨설팅 에이전트의 비즈니스 분석 결과.
        planning_output: 기획 에이전트의 PRD 및 기능 명세 결과.
        design_output: 디자인 에이전트의 UI/UX 명세 결과.
        backend_output: 백엔드 에이전트의 아키텍처/DB/API 설계 결과.
        prompting_output: 프롬프팅 에이전트의 개발 프롬프트 세트.
        messages: LangChain 메시지 리스트. ``operator.add``를 리듀서로 사용하여
            각 노드의 메시지가 누적(append)됩니다.
        current_step: 현재 실행 중인 파이프라인 단계 이름.
            병렬 노드에서 동시 갱신될 수 있으므로 last-write-wins 전략을 사용합니다.
    """

    # ── 사용자 입력 ──
    user_input: str

    # ── 각 에이전트의 산출물 ──
    consulting_output: str
    planning_output: str
    design_output: str
    backend_output: str
    prompting_output: str

    # ── 대화 메시지 누적 (리듀서: operator.add → 리스트 append) ──
    messages: Annotated[list, operator.add]

    # ── 현재 단계 (리듀서: lambda → last-write-wins) ──
    current_step: Annotated[str, lambda a, b: b]


def create_initial_state(user_input: str) -> dict:
    """파이프라인 실행을 위한 초기 상태 딕셔너리를 생성합니다.

    main.py와 api/main.py 양쪽에서 동일한 초기 상태를 사용하기 위해
    팩토리 함수로 추출했습니다.

    Args:
        user_input: 사용자가 입력한 비즈니스 요구사항 텍스트.

    Returns:
        AgentState 스키마에 맞는 초기 상태 딕셔너리.
    """
    return {
        "user_input": user_input,
        "consulting_output": "",
        "planning_output": "",
        "design_output": "",
        "backend_output": "",
        "prompting_output": "",
        "messages": [],
        "current_step": "",
    }
