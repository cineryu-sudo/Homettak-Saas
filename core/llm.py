"""LLM(대규모 언어 모델) 인스턴스 팩토리.

Google Gemini Pro 모델 인스턴스를 생성하여 반환합니다.
모든 에이전트는 이 팩토리를 통해 LLM 인스턴스를 받아 사용합니다.
"""

from __future__ import annotations

import logging

from langchain_google_genai import ChatGoogleGenerativeAI

from config.settings import settings

logger = logging.getLogger(__name__)


def get_llm(temperature: float = 0.7) -> ChatGoogleGenerativeAI:
    """Gemini LLM 인스턴스를 반환합니다.

    Args:
        temperature: 생성 다양성 조절 (0.0 = 결정적, 1.0 = 창의적).
            컨설팅/기획은 0.7, 백엔드 설계는 0.5 등 에이전트 특성에 맞게 설정.

    Returns:
        ChatGoogleGenerativeAI 인스턴스.

    Raises:
        ValueError: GEMINI_API_KEY가 설정되지 않은 경우.
    """
    if not settings.gemini_api_key:
        raise ValueError(
            "GEMINI_API_KEY가 설정되지 않았습니다. "
            ".env 파일에 GEMINI_API_KEY=your-key를 추가하세요."
        )

    logger.debug(
        "LLM 인스턴스 생성: model=%s, temperature=%.1f",
        settings.gemini_model,
        temperature,
    )

    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.gemini_api_key,
        temperature=temperature,
    )
