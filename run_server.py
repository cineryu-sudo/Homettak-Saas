"""FastAPI 서버 실행 스크립트.

개발 환경에서 uvicorn으로 FastAPI 서버를 시작합니다.
reload=True로 코드 변경 시 자동 재시작됩니다.

사용법::

    python run_server.py

서버가 http://0.0.0.0:8000 에서 시작됩니다.
API 문서: http://localhost:8000/docs
"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
