"""에이전트 대화 메모리(체크포인터) 관리.

LangGraph의 체크포인터는 각 파이프라인 실행의 중간 상태를
저장하여, 이전 단계의 결과를 다음 단계에서 참조할 수 있게 합니다.

현재는 인메모리 저장소를 사용하며, 서버 재시작 시 상태가 초기화됩니다.
프로덕션 배포 시에는 Redis 또는 PostgreSQL 기반 체크포인터로 교체해야 합니다.

TODO: 프로덕션 환경에서 langgraph-checkpoint-postgres 등으로 교체
"""

from langgraph.checkpoint.memory import MemorySaver

# 인메모리 체크포인터 (프로덕션에서는 DB 기반으로 교체 필요)
checkpointer = MemorySaver()
