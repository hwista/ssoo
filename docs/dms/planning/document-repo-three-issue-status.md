# DMS 문서 레포 3개 이슈 정리

> 최종 업데이트: 2026-04-17
> 상위 문서:
> - `docs/dms/explanation/architecture/document-repo-source-of-truth-policy.md`
> - `docs/common/explanation/architecture/current-workstream-baseline.md`

---

## 1. 정리 대상 3개 이슈

이번 사이클에서 정리할 대상은 아래 3개였다.

1. 문서 정본(source of truth) 정책 고정
2. 문서 Git 원격 push 가능 상태 정리
3. in-repo documents 비운 뒤에도 실제 문서가 계속 보이는지 검증

---

## 2. 항목별 현재 상태

### 2.1 이슈 1 — 문서 정본 정책 고정
상태: 완료

결정:
- 문서 내용 정본 = GitLab `LSWIKI_DOC.git`
- 앱/엔진/권한/메타데이터/control-plane = `ssoo`

현재 기준:
- host clone path: `/home/a0122024330/src/lswiki-docs`
- container doc path: `/app/apps/web/dms/data/documents`
- `server`, `dms` 서비스 모두 동일 working tree 를 본다.

의미:
- `apps/web/dms/data/documents` 내부 파일은 장기 정본이 아니다.
- 실제 DMS 문서 집합은 외부 문서 Git working tree 기준으로 운영한다.

근거 문서:
- `docs/dms/explanation/architecture/document-repo-source-of-truth-policy.md`

---

### 2.2 이슈 2 — 문서 Git 원격 push
상태: 미해결(권한/브랜치 정책 blocker)

현재 확인 사실:
- 로컬 clone 생성 완료: `/home/a0122024330/src/lswiki-docs`
- 테스트 문서 import 완료
- 로컬 commit 완료: `b963f14 feat(docs): import local DMS test documents`
- 원격 `master` push 실패
- 원격 `development` push 실패

실패 성격:
- 인증 실패가 아니라 GitLab 보호 브랜치 정책 거절이다.
- 즉 로컬 tooling 문제가 아니라 원격 프로젝트 운영 정책 문제다.

현재 blocker:
- 허용된 작업 브랜치 규칙 미확정
- 현재 계정의 push 권한 범위 미확정
- merge request 기반 반영 절차 필요 여부 미확정

다음 액션:
1. 허용 브랜치명 규칙 확인
2. 필요 시 작업 브랜치 생성 후 push 재시도
3. 직접 push 불가면 MR 기반 흐름으로 전환

---

### 2.3 이슈 3 — in-repo documents 제거 후 가시성 검증
상태: 완료

실행 내용:
- `apps/web/dms/data/documents` 내부 문서를 백업 디렉토리로 이동
- bind mount 로 `/home/a0122024330/src/lswiki-docs` 를 `server`, `dms` 에 연결
- `docker compose up -d --build server dms` 실행
- 컨테이너 내부 documents 경로 확인
- `/api/dms/files` API 확인

검증 결과:
- 컨테이너 내부 `/app/apps/web/dms/data/documents` 에 실제 문서가 보였다.
- admin 로그인 후 `/api/dms/files` 에서 실제 문서 트리가 반환됐다.
- 즉 in-repo documents 가 비어 있어도 외부 문서 Git working tree mount 만 정상이면 DMS 는 문서를 계속 본다.

의미:
- 기존 “문서가 안 보임” 문제의 1차 원인은 ACL 이전에 storage/mount wiring 이었다.
- 앞으로 DMS 권한 작업은 실제 문서 working tree 기준으로 계속 진행할 수 있다.

백업 위치:
- `/home/a0122024330/src/ssoo/apps/web/dms/data/documents.__backup_20260417_152925`

---

## 3. 최종 정리

현재 3개 중 2개는 닫혔다.

- 완료: 문서 정본 정책 고정
- 미해결: 원격 push 정책/권한 정리
- 완료: detach 테스트 및 문서 가시성 검증

따라서 남은 핵심 실무 이슈는 하나로 축소된다.

### 남은 핵심 이슈
- `LSWIKI_DOC.git` 에 어떤 브랜치/절차로 안전하게 push 할 것인가

---

## 4. 다음 작업 순서

1. 문서 원격 push 허용 브랜치/절차 확정
2. 확정된 절차로 문서 레포 remote 반영
3. 그 다음 실제 문서 기준 DMS 권한/control-plane 작업 재개

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-17 | 문서 레포 3개 이슈를 정책/검증/원격 push blocker 기준으로 재정리하고 남은 핵심 이슈를 GitLab push 정책 확인으로 축소 |
