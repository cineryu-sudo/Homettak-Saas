"""백엔드 에이전트 — 서버 아키텍처/API/DB/인프라 설계.

기획 에이전트의 PRD와 데이터 모델을 기반으로 백엔드 시스템을 설계합니다.
기획 완료 후 디자인 에이전트와 **병렬로** 실행됩니다.
"""

from agents.base import BaseAgent


class BackendAgent(BaseAgent):
    """백엔드 에이전트.

    역할: 아키텍처 결정, DB 설계, API 상세 설계, 비즈니스 로직, 인프라 구성.
    프롬프트: prompts/backend.md
    """

    name = "backend"
    prompt_file = "backend.md"
    output_key = "backend_output"
    temperature = 0.5  # 정확한 스키마/API 명세를 위해 낮은 temperature
