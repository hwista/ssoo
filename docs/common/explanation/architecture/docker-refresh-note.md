# Docker Refresh Note

> 최종 업데이트: 2026-04-17

현재 full-stack compose 최신화 시도에서 `apps/server/Dockerfile` builder 단계의
`pnpm --filter @ssoo/database db:generate` -> `prisma generate` 과정이 container 내부에서
`ECONNRESET` 로 실패했다.

관찰:
- 로컬 WSL 호스트에서 `pnpm --filter @ssoo/database db:generate` 는 정상 통과했다.
- 따라서 현재 실패는 schema 오류보다는 container build 중 Prisma engine download/network reset 가능성이 높다.
- compose 구조와 Dockerfile 경로 자체는 현재 monorepo 구조를 반영하고 있다.

다음 액션:
1. `docker compose build server` 재시도
2. 성공 시 `docker compose up -d --build`
3. 실패가 반복되면 server Dockerfile 의 Prisma generate 단계에 대해 네트워크/engine caching 대응을 검토

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-17 | Docker full refresh 중 server builder 의 `prisma generate` 가 `ECONNRESET` 로 일시 실패한 사실과 재시도 방침을 기록 |
