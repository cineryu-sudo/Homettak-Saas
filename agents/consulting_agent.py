"""AI Native 컨설팅 에이전트 — 비즈니스 분석 & AI 도입 전략 수립.

소상공인의 비즈니스 현황을 분석하고, AI 기반 SaaS 도입 전략을 수립합니다.
파이프라인에서 첫 번째로 실행되며, 이후 에이전트들에게 분석 결과를 전달합니다.
"""

from agents.base import BaseAgent


class ConsultingAgent(BaseAgent):
    """컨설팅 에이전트.

    역할: 비즈니스 분석, 문제점 진단, AI 도입 가능 영역 식별, 전략 수립.
    프롬프트: prompts/consulting.md
    """

    name = "consulting"
    prompt_file = "consulting.md"
    output_key = "consulting_output"
    temperature = 0.7  # 창의적 전략 제안을 위해 약간 높은 temperature
