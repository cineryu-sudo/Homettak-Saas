"""SaaS 디자인 에이전트 — UI/UX 설계 & 디자인 시스템 구축.

기획 에이전트의 PRD를 기반으로, 디자인 시스템과 UI 구조를 설계합니다.
기획 완료 후 백엔드 에이전트와 **병렬로** 실행됩니다.
"""

from agents.base import BaseAgent


class DesignAgent(BaseAgent):
    """디자인 에이전트.

    역할: 디자인 원칙 수립, 디자인 토큰, 컴포넌트 명세, 페이지 레이아웃, 반응형 설계.
    프롬프트: prompts/design.md
    """

    name = "design"
    prompt_file = "design.md"
    output_key = "design_output"
    temperature = 0.6  # 일관된 디자인 시스템 산출을 위해 살짝 낮춤
