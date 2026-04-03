"""오케스트레이터 — LangGraph 기반 에이전트 파이프라인.

사용자의 비즈니스 요구사항 입력을 받아 5단계 에이전트 파이프라인을 실행합니다.

워크플로우:
  사용자 입력 → 컨설팅 → 기획 → (디자인 ∥ 백엔드) → 프롬프팅 → 최종 출력

  - 컨설팅 → 기획은 **순차** 실행 (기획에 컨설팅 결과가 필요)
  - 디자인 ↔ 백엔드는 **병렬** 실행 (서로 독립적이므로)
  - 프롬프팅은 디자인 + 백엔드 **모두 완료** 후 실행
"""

from __future__ import annotations

import logging

from langchain_core.messages import HumanMessage
from langgraph.graph import END, StateGraph

from agents.backend_agent import BackendAgent
from agents.consulting_agent import ConsultingAgent
from agents.design_agent import DesignAgent
from agents.planning_agent import PlanningAgent
from agents.prompting_agent import PromptingAgent
from core.memory import checkpointer
from core.state import AgentState

logger = logging.getLogger(__name__)

# ── 에이전트 인스턴스 (싱글턴) ──
consulting = ConsultingAgent()
planning = PlanningAgent()
design = DesignAgent()
backend = BackendAgent()
prompting = PromptingAgent()


# ── 컨텍스트 주입 헬퍼 ──

def _inject_context(
    state: AgentState,
    *,
    sections: list[tuple[str, str]],
    instruction: str,
    step_name: str,
) -> dict:
    """이전 에이전트의 산출물을 다음 에이전트의 입력 메시지로 주입합니다.

    반복되는 컨텍스트 주입 패턴을 통합한 헬퍼 함수입니다.

    Args:
        state: 현재 파이프라인 공유 상태.
        sections: (섹션 제목, state 키) 튜플 목록.
            예: [("컨설팅 분석 결과", "consulting_output")]
        instruction: 다음 에이전트에 전달할 지시사항.
        step_name: 현재 단계 이름 (current_step에 기록).

    Returns:
        업데이트할 상태 딕셔너리.
    """
    parts = []
    for title, key in sections:
        parts.append(f"[{title}]\n{state[key]}")
    parts.append(instruction)

    return {
        "messages": [HumanMessage(content="\n\n".join(parts))],
        "current_step": step_name,
    }


# ── 파이프라인 노드 함수들 ──

def _prepare_input(state: AgentState) -> dict:
    """사용자 입력을 HumanMessage로 변환하여 파이프라인을 시작합니다."""
    return {
        "messages": [HumanMessage(content=state["user_input"])],
        "current_step": "input",
    }


def _inject_consulting(state: AgentState) -> dict:
    """컨설팅 결과 → 기획 에이전트로 전달합니다."""
    return _inject_context(
        state,
        sections=[("이전 단계: 컨설팅 에이전트 분석 결과", "consulting_output")],
        instruction="위 분석 결과를 기반으로 작업해 주세요.",
        step_name="consulting_done",
    )


def _inject_planning(state: AgentState) -> dict:
    """기획 결과 → 디자인/백엔드 에이전트로 전달합니다."""
    return _inject_context(
        state,
        sections=[("이전 단계: 기획 에이전트 산출물", "planning_output")],
        instruction="위 기획서를 기반으로 작업해 주세요.",
        step_name="planning_done",
    )


def _inject_for_prompting(state: AgentState) -> dict:
    """기획 + 디자인 + 백엔드 결과 → 프롬프팅 에이전트로 전달합니다."""
    return _inject_context(
        state,
        sections=[
            ("기획서", "planning_output"),
            ("디자인 명세", "design_output"),
            ("백엔드 설계서", "backend_output"),
        ],
        instruction="위 산출물을 기반으로 개발용 프롬프트 세트를 생성해 주세요.",
        step_name="design_backend_done",
    )


# ── 그래프 빌더 ──

def build_graph() -> StateGraph:
    """에이전트 파이프라인 그래프를 구성하고 컴파일합니다.

    그래프 구조::

        prepare → consulting → inject_consulting → planning → inject_planning
                                                                   ├→ design  ─┐
                                                                   └→ backend ─┤
                                                         inject_for_prompting ←┘
                                                                   └→ prompting → END

    Returns:
        컴파일된 LangGraph CompiledStateGraph 인스턴스.
    """
    logger.info("에이전트 파이프라인 그래프 빌드 시작")

    graph = StateGraph(AgentState)

    # ── 노드 등록 ──
    graph.add_node("prepare", _prepare_input)
    graph.add_node("consulting", consulting)
    graph.add_node("inject_consulting", _inject_consulting)
    graph.add_node("planning", planning)
    graph.add_node("inject_planning", _inject_planning)
    graph.add_node("design", design)
    graph.add_node("backend", backend)
    graph.add_node("inject_for_prompting", _inject_for_prompting)
    graph.add_node("prompting", prompting)

    # ── 엣지 연결: 순차 파이프라인 ──
    graph.set_entry_point("prepare")
    graph.add_edge("prepare", "consulting")
    graph.add_edge("consulting", "inject_consulting")
    graph.add_edge("inject_consulting", "planning")
    graph.add_edge("planning", "inject_planning")

    # ── 기획 완료 후 디자인 & 백엔드 병렬 실행 ──
    graph.add_edge("inject_planning", "design")
    graph.add_edge("inject_planning", "backend")

    # ── 디자인 & 백엔드 모두 완료 후 프롬프팅으로 합류 ──
    graph.add_edge("design", "inject_for_prompting")
    graph.add_edge("backend", "inject_for_prompting")
    graph.add_edge("inject_for_prompting", "prompting")

    # ── 프롬프팅 완료 → 종료 ──
    graph.add_edge("prompting", END)

    logger.info("에이전트 파이프라인 그래프 빌드 완료")
    return graph.compile(checkpointer=checkpointer)


# 컴파일된 그래프 싱글턴 — import 시 1회만 빌드됨
workflow = build_graph()
