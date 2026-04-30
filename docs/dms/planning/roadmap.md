# DMS 로드맵

> 최종 업데이트: 2026-04-30

---

## 1. 현재 완료

- DMS를 pnpm workspace 앱으로 통합하고 `@ssoo/types`, `@ssoo/web-auth` 기반 공통 계약을 적용
- same-origin `/api/auth/[action]` proxy + shared session cookie 기반 로그인/세션 복원 도입
- `/api/access` 기반 DMS access snapshot hydrate, server/web feature baseline gating 적용
- 공통 permission resolution contract + auth/access validation baseline 고정
- `DocumentMetadata.acl` object ACL pilot 적용 (`file/content` read-write-metadata, `file/files/raw/serve-attachment/search/ask`, template reference/doc-assist tree hint, creator owner default, 기본 DocumentPage affordance, upload inheritance, local storage/open, validation matrix)
- DMS 주요 business API를 `apps/server` DMS module로 이관하고 Next route handler를 proxy boundary로 정렬
- 저장소/수집/AI 기본 기능 및 settings shell, template pipeline, file/git runtime 유지
- DMS 핵심 서비스 분해 (refactoring decomposition, 2026-04-28 ~ 04-30): `collaboration.service.ts` / `git.service.ts` / `access-request.service.ts` 3개 god service 를 cohesive Nest 서비스 + util 로 분해 (C-2 / C-3 / C-4 트랙 종료, 합 13 slices). `access-request.service.ts` 만으로 2150 → 1121 lines (-48%). 회귀 안전망: `pnpm --filter server test` 110 tests / 6 suites (D-2 트랙)

## 2. 단기 우선순위 (P1)

1. PMS/CMS access contract / validation baseline 정렬
2. admin·ops 예외 운영 tooling 최소 표면 정리
3. 저장소 어댑터 3종(Local/SharePoint/NAS) 라우팅 관통 적용
4. 정본/첨부 Open/Copy/Resync UX 고도화
5. 자동 수집 채널 연동 + 컨펌 후 게시 운영화
6. Ask/Search 화면의 citations/confidence UI 완결

## 3. 중기 우선순위 (P2)

1. search / ask / doc-assist / template reference에서 unreadable document 배제 규칙 적용
2. 외부 저장소 open/retry/audit 로그 운영 안정화
3. 권한 기반 admin tooling 및 예외 정책 운영 도구 정리

## 4. 장기 우선순위 (P3)

1. 조직/문서/템플릿 단위 승인 및 요청(workflow) 정책 확장
2. Teams 챗봇/외부 입력 채널 연동
3. legacy auth/org 필드 cleanup 범위 확정 및 cutover

## 5. 관련 문서

- `docs/dms/planning/auth-access-readiness.md`
- `docs/dms/planning/backlog.md`
- `docs/dms/planning/storage-and-second-brain-architecture.md`

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-30 | DMS 핵심 서비스 분해 트랙 (C-2 / C-3 / C-4, 13 slices, 7 commits) 종료를 현재 완료에 반영. `access-request.service.ts` 2150 → 1121 (-48%) 외 collaboration / git 서비스도 cohesive 단위로 분리 |
| 2026-04-14 | DMS object ACL pilot을 file/content write-read + template/doc-assist source hint + creator owner default + 기본 UI affordance + upload inheritance + local storage/open + validation matrix까지 확장한 상태를 현재 완료에 반영하고, 단기 우선순위를 PMS/CMS alignment로 전환 |
| 2026-04-14 | 공통 permission contract / auth-access validation baseline 완료를 현재 완료 항목에 반영하고, 단기 우선순위를 object ACL 중심으로 재정렬 |
| 2026-04-13 | auth/access readiness 기준으로 로드맵을 재정렬하고, DMS의 다음 우선순위를 object ACL + 검증 시나리오 고정으로 갱신 |
| 2026-02-24 | P1 항목별 1차 구현/잔여 작업 상태표 추가 |
| 2026-02-24 | 과거 Phase 체크리스트를 현행 실행 로드맵(저장소/수집/딥리서치 중심)으로 전면 갱신 |
