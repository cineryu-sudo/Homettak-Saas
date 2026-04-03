"""프롬프팅 에이전트 — 개발용 프롬프트 세트 생성.

기획서, 디자인 명세, 백엔드 설계서를 입력받아 AI 코딩 도구
(Claude Code, Cursor 등)에서 바로 사용할 수 있는 단계별 프롬프트를 생성합니다.
파이프라인의 마지막 단계에서 실행됩니다.
"""

from agents.base import BaseAgent


class PromptingAgent(BaseAgent):
    """프롬프팅 에이전트.

    역할: 프로젝트 초기화, DB, 백엔드 API, 프론트엔드, 배포 프롬프트 생성.
    프롬프트: prompts/prompting.md
    """

    name = "prompting"
    prompt_file = "prompting.md"
    output_key = "prompting_output"
    temperature = 0.6  # 구체적이면서도 유연한 프롬프트 생성을 위해
