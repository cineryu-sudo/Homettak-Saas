"""SaaS 기획 에이전트 — 제품 기획 & PRD 작성.

컨설팅 에이전트의 전략서를 기반으로, 실제 개발 가능한 SaaS 제품을 기획합니다.
기능 명세(PRD), 사용자 스토리, 데이터 모델, API 설계를 산출합니다.
"""

from agents.base import BaseAgent


class PlanningAgent(BaseAgent):
    """기획 에이전트.

    역할: 제품 비전 정의, 기능 명세(PRD), 정보 구조 설계, 데이터 모델, API 설계.
    프롬프트: prompts/planning.md
    """

    name = "planning"
    prompt_file = "planning.md"
    output_key = "planning_output"
    temperature = 0.7  # 다양한 기능 아이디어 도출을 위해
