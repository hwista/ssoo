# Docker Refresh Note

> 최종 업데이트: 2026-06-23

## 2026-06-23 AI/RAG platform rebuild

AI/RAG platform commonization slice 이후 full compose image rebuild를 완료했다.

관찰:
- 기본 `pnpm docker:build`는 Docker Desktop credential helper(`credsStore: desktop.exe`)가 WSL vsock 오류(`UtilAcceptVsock: accept4 failed 110`)로 실패할 수 있다.
- 이번 rebuild는 credential helper를 우회하기 위해 임시 Docker config를 명시했다.
- `env DOCKER_CONFIG=/tmp/ssoo-docker-no-creds docker compose build`로 `ssoo-server`, `ssoo-dms`, `ssoo-pms`, `ssoo-crm`, `ssoo-sns`, `ssoo-admin`, `ssoo-db-init` 이미지가 모두 `Built` 상태로 완료됐다.
- Next.js web app build 중 stale Browserslist data warning은 계속 출력되지만 functional blocker는 아니다.

다음 액션:
1. Docker Desktop credential helper 오류가 재발하면 다음 명령을 사용한다.

```bash
mkdir -p /tmp/ssoo-docker-no-creds
env DOCKER_CONFIG=/tmp/ssoo-docker-no-creds docker compose build
```

2. `AI-RAG-10A Runtime smoke and runbook`에서 DB migration apply, trigger apply, DMS reindex, common retrieval, DMS Ask audit 확인을 Docker runtime 기준으로 고정한다.

## 2026-04-17 Prisma generate network reset

이전 full-stack compose 최신화 시도에서 `apps/server/Dockerfile` builder 단계의
`pnpm --filter @ssoo/database db:generate` -> `prisma generate` 과정이 container 내부에서
`ECONNRESET` 로 실패했다.

관찰:
- 로컬 WSL 호스트에서 `pnpm --filter @ssoo/database db:generate` 는 정상 통과했다.
- 따라서 해당 실패는 schema 오류보다는 container build 중 Prisma engine download/network reset 가능성이 높았다.
- compose 구조와 Dockerfile 경로 자체는 현재 monorepo 구조를 반영하고 있다.

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-06-23 | AI/RAG platform slice 이후 Docker compose image rebuild 완료와 Docker Desktop credential helper 우회 방법을 기록 |
| 2026-04-17 | Docker full refresh 중 server builder 의 `prisma generate` 가 `ECONNRESET` 로 일시 실패한 사실과 재시도 방침을 기록 |
