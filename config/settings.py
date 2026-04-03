"""애플리케이션 설정 관리.

pydantic-settings를 사용하여 `.env` 파일과 환경변수에서
설정값을 자동으로 로드합니다. 필드명은 대문자 환경변수명과 매핑됩니다.
(예: gemini_api_key → GEMINI_API_KEY)
"""

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """전역 애플리케이션 설정.

    Attributes:
        gemini_api_key: Google Gemini API 인증 키. 필수값이며
            .env 파일 또는 환경변수 GEMINI_API_KEY로 설정합니다.
        gemini_model: 사용할 Gemini 모델명. 기본값은 ``gemini-2.5-pro``.
        app_env: 실행 환경 (development / staging / production).
        app_debug: 디버그 모드 활성화 여부. production에서는 False 권장.
    """

    gemini_api_key: str = Field(
        default="",
        description="Google Gemini API 인증 키 (필수)",
    )
    gemini_model: str = Field(
        default="gemini-2.5-pro",
        description="사용할 Gemini 모델명",
    )
    app_env: str = Field(
        default="development",
        description="실행 환경 (development / staging / production)",
    )
    app_debug: bool = Field(
        default=True,
        description="디버그 모드 활성화 여부",
    )

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


# 싱글턴 — 앱 전체에서 `from config.settings import settings`로 사용
settings = Settings()
