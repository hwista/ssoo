# DMS 문서 레포 3개 이슈 정리

> 최종 업데이트: 2026-04-30
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
상태: **완료** (2026-04-30 검증)

현재 확인 사실:
- 로컬 clone: `/home/a0122024330/src/lswiki-docs`
- canonical branch: `master` (host clone 의 `git branch -a` 결과)
- `b963f14 feat(docs): import local DMS test documents` 가 **`origin/master` 에 반영 완료**
- 검증: `git rev-list --left-right --count origin/master...HEAD` → `0\t0` (즉 ahead/behind 0건)

해석:
- 2026-04-17 시점에는 push 거부 (보호 브랜치 정책) 로 보였지만, 실제로는 `master` 직접 push 가 허용되며 그 시점에 import commit 이 정상 반영됨
- `document-repo-source-of-truth-policy.md:79` 가 정합 ("2026-04-17 기준 초기 import commit 이 원격 `LSWIKI_DOC.git` `master` 에 반영되어 있다")
- 본 status 문서가 stale 상태로 "미해결"로 남아있던 것 → 갱신

운영 기준 (확정):
- canonical branch: `master`
- push 허용: `master` 직접 push (현재 계정 기준)
- 추가 보호 브랜치 (`development`) 가 있는지는 운영 상 사용 안 함 — 본 레포 (`LSWIKI_DOC.git`) 는 단일 `master` 흐름

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

3개 이슈 모두 닫혔다.

- 완료: 문서 정본 정책 고정
- 완료: 원격 push 정책 (canonical `master` 직접 push, 2026-04-30 검증)
- 완료: detach 테스트 및 문서 가시성 검증

남은 핵심 실무 이슈 없음. **본 트랙 종결**.

---

## 4. 후속 권장 (별도 작업)

원격 push 자체는 안정 운영 단계에 들어갔으므로 다음 후속 항목은 별도 backlog 트랙:

- 정기 push 자동화 (auto-publish enqueue 가 이미 완료, 실 운영 검증만 잔여)
- 충돌/리모트 변경 감지 워크플로우 (`refresh`/`retry-publish` API 활용)
- DMS 권한/control-plane 작업 재개 (Phase B — 권한 UX 3종)

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-30 | 이슈 2 (원격 push) 를 완료로 갱신 — `b963f14` 가 `origin/master` 에 반영됨을 검증 (`git rev-list --left-right --count` = `0\t0`). 본 status 문서가 stale 상태로 남아있던 것을 정정. 트랙 종결 |
| 2026-04-17 | 문서 레포 3개 이슈를 정책/검증/원격 push blocker 기준으로 재정리하고 남은 핵심 이슈를 GitLab push 정책 확인으로 축소 |
