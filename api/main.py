"""FastAPI 엔드포인트 — 에이전트 파이프라인 API.

웹 클라이언트(Next.js webapp 등)에서 HTTP로 파이프라인을 실행할 수 있는
REST API를 제공합니다.

엔드포인트:
    - GET  /health   — 헬스체크
    - POST /run      — 전체 파이프라인 실행
"""

from __future__ import annotations

import logging
import uuid

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from agents.orchestrator import workflow
from core.state import create_initial_state

logger = logging.getLogger(__name__)

# ── FastAPI 앱 초기화 ──
app = FastAPI(
    title="HomeTTak SaaS Agent Team",
    description="소상공인을 위한 SaaS 에이전트 팀 API",
    version="0.1.0",
)

# ── CORS 설정 — webapp 등 프론트엔드에서 API 호출 허용 ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js 개발 서버
        "http://localhost:8000",  # FastAPI 자체
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── 요청/응답 스키마 ──

class RunRequest(BaseModel):
    """파이프라인 실행 요청.

    Attributes:
        user_input: 사용자의 비즈니스 요구사항 텍스트 (1~5000자).
        thread_id: 세션 식별자. 미지정 시 자동 생성됩니다.
    """

    user_input: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="사용자의 비즈니스 요구사항 텍스트",
    )
    thread_id: str | None = Field(
        default=None,
        description="세션 식별자 (미지정 시 자동 생성)",
    )


class RunResponse(BaseModel):
    """파이프라인 실행 응답.

    각 에이전트의 산출물을 포함합니다.
    """

    thread_id: str
    consulting: str
    planning: str
    design: str
    backend: str
    prompting: str


# ── 엔드포인트 ──

@app.get("/health")
async def health():
    """서버 헬스체크 엔드포인트."""
    return {"status": "ok"}


@app.post("/run", response_model=RunResponse)
async def run_pipeline(req: RunRequest):
    """전체 에이전트 파이프라인을 실행합니다.

    5단계(컨설팅→기획→디자인∥백엔드→프롬프팅) 파이프라인을 순차/병렬로
    실행하고, 각 에이전트의 산출물을 반환합니다.
    """
    thread_id = req.thread_id or str(uuid.uuid4())

    logger.info("파이프라인 실행 시작: thread_id=%s", thread_id)

    # create_initial_state() 팩토리로 초기 상태 생성 (main.py와 로직 공유)
    initial_state = create_initial_state(req.user_input)
    config = {"configurable": {"thread_id": thread_id}}

    result = await workflow.ainvoke(initial_state, config=config)

    logger.info("파이프라인 실행 완료: thread_id=%s", thread_id)

    return RunResponse(
        thread_id=thread_id,
        consulting=result.get("consulting_output", ""),
        planning=result.get("planning_output", ""),
        design=result.get("design_output", ""),
        backend=result.get("backend_output", ""),
        prompting=result.get("prompting_output", ""),
    )
