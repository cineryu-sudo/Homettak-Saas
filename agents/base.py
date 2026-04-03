"""에이전트 공통 베이스 클래스.

모든 에이전트(Consulting, Planning, Design, Backend, Prompting)가
상속하는 추상 베이스 클래스입니다. 프롬프트 로딩, LLM 체인 구성,
호출(invoke) 로직을 공통으로 제공합니다.
"""

from __future__ import annotations

import logging
from pathlib import Path

from langchain_core.messages import AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from core.llm import get_llm
from core.state import AgentState

# 프롬프트 마크다운 파일이 위치한 디렉토리
PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"

logger = logging.getLogger(__name__)


class BaseAgent:
    """모든 에이전트의 베이스 클래스.

    서브클래스는 아래 클래스 변수를 오버라이드하여 사용합니다:
        - ``name``: 에이전트 식별자 (예: "consulting")
        - ``prompt_file``: prompts/ 디렉토리 내 마크다운 파일명
        - ``output_key``: AgentState에서 결과를 저장할 키
        - ``temperature``: LLM 생성 다양성 (0.0~1.0)

    Example::

        class ConsultingAgent(BaseAgent):
            name = "consulting"
            prompt_file = "consulting.md"
            output_key = "consulting_output"
            temperature = 0.7
    """

    name: str = "base"
    prompt_file: str = ""
    output_key: str = ""
    temperature: float = 0.7

    def __init__(self) -> None:
        """에이전트를 초기화합니다.

        LLM 인스턴스를 생성하고, 시스템 프롬프트를 파일에서 로드합니다.
        """
        self.llm = get_llm(temperature=self.temperature)
        self.system_prompt = self._load_prompt()

    def _load_prompt(self) -> str:
        """prompts/ 디렉토리에서 시스템 프롬프트를 로드합니다.

        Returns:
            프롬프트 문자열. 파일이 없으면 빈 문자열을 반환하고 경고를 로깅합니다.
        """
        path = PROMPTS_DIR / self.prompt_file
        if path.exists():
            logger.debug("[%s] 프롬프트 로드: %s", self.name, path)
            return path.read_text(encoding="utf-8")

        logger.warning(
            "[%s] 프롬프트 파일을 찾을 수 없습니다: %s → 빈 시스템 프롬프트로 실행됩니다.",
            self.name,
            path,
        )
        return ""

    def _build_chain(self):
        """시스템 프롬프트 + 대화 메시지 → LLM 체인을 구성합니다.

        Returns:
            LangChain RunnableSequence (prompt | llm).
        """
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content=self.system_prompt),
            MessagesPlaceholder(variable_name="messages"),
        ])
        return prompt | self.llm

    def __call__(self, state: AgentState) -> dict:
        """LangGraph 노드로서 호출됩니다.

        파이프라인의 현재 상태(state)에서 메시지를 읽어 LLM에 전달하고,
        결과를 지정된 output_key에 저장하여 반환합니다.

        Args:
            state: 현재 파이프라인 공유 상태.

        Returns:
            업데이트할 상태 딕셔너리 (output, messages, current_step).
        """
        logger.info("[%s] 에이전트 실행 시작", self.name)

        try:
            chain = self._build_chain()
            result = chain.invoke({"messages": state["messages"]})

            logger.info(
                "[%s] 에이전트 실행 완료 (응답 길이: %d자)",
                self.name,
                len(result.content),
            )

            return {
                self.output_key: result.content,
                "messages": [AIMessage(content=result.content, name=self.name)],
                "current_step": self.name,
            }

        except Exception as e:
            # LLM 호출 실패 시에도 파이프라인이 crash되지 않도록
            # 에러 메시지를 output에 기록하고 계속 진행
            error_msg = f"[{self.name}] 에이전트 실행 실패: {e}"
            logger.error(error_msg, exc_info=True)

            return {
                self.output_key: f"⚠️ 에러 발생: {e}",
                "messages": [AIMessage(content=error_msg, name=self.name)],
                "current_step": self.name,
            }
