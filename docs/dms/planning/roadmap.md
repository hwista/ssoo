# DMS 로드맵

> 최종 업데이트: 2026-05-20 (AI 검색 기록 + 잠긴 문서 미리보기 closeout)

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
- 문서 정본 GitLab `LSWIKI_DOC.git` 원격 운영 종결 (2026-04-30, Phase A): canonical `master` 직접 push 정책 확정/검증. `document-repo-three-issue-status.md` 3개 이슈 모두 closed. versionHistory dead feature 제거 + 의도(`DMS-FE-versionHistory`) backlog 등재. Track 2 / 5 / 7 closed → 100%
- DMS 접근 검증 게이트 복구: 문서 저장/설정 저장 응답 계약, 저장소 기반 원본 이미지 제공, 기존 sidecar 기준선 검증을 정렬해 `verify:access-dms:raw` 통과
- 권한 요청 UX와 관리자 권한 운영 surface 1차 완결: 검색/질의 결과의 발견 전용 표시와 권한 요청, 내 요청 목록, 승인/거절 inbox, 직접 권한 부여, 공개 범위 전환, 소유권 이전, grant 취소가 실제 API와 연결됨
- 공통 알림 모듈 1차 완결: common notification DB/API/types/history trigger, DMS same-origin proxy, SSE stream, 헤더 알림 패널/토스트, CMS bridge 를 공통 알림 계약으로 정렬
- 사용자별 DMS client state isolation 적용: 로그인 사용자 변경 시 tab/file tree/sidebar/editor/settings/query cache 상태를 분리하고, user-scope contract 검증을 추가
- 권한 요청 취소와 수신자 알림 cleanup 적용: requester pending 취소, owner 알림 archive/read 처리, notification archived 이벤트 기반 패널 갱신 연결
- AI 검색 런칭 정리: 검색 결과 AI 요약 표시, DB 기반 내 자주 검색/인기 검색어/검색 기록, 인기 검색어 최소 노출 조건과 검증/테스트 검색어 저장 차단 적용
- 잠긴 문서 미리보기 적용: unreadable 검색/AI 결과 클릭 시 즉시 팝업 대신 문서 탭을 열고, 서버 preview-only 응답 기반 잠금 화면과 권한 요청 CTA를 표시
- 현재 검증 기준선 통과: locked preview 서버 테스트, server/web-dms build, DMS access verification, Codex preflight, Docker server/dms rebuild, health/browser 확인

## 2. 단기 우선순위 (P1)

**Phase B — 권한 UX 잔여 정리**:

1. **DMS-PERM-UX-01** Search/Ask 차단 소스 수와 제외 사유 표시 UI ("권한 부족으로 N개 제외됨")
2. **DMS-PERM-UX-07** 권한 없는 검색 결과 카드 스니펫/키워드 노출 정책 정리: AI 요약은 유지하되 원문 기반 발췌는 제거하거나 서버 preview-only 기준으로 제한
3. **DMS-PERM-UX-04** 권한 UX 회귀 검증 자동화: 요청 생성 → 승인/거절 → grant 반영 → 회수/소유권 이전
4. **DMS-QA-02** hard refresh client-side error 브라우저 재현 케이스 확보: 현재 CLI/HTTP/build 기준 문제 없음, 재현 시 console 첫 오류 기준으로 regression 추가

**기타 P1**:

5. 저장소 어댑터 3종(Local/SharePoint/NAS) 라우팅 관통 적용
6. 정본/첨부 Open/Copy/Resync UX 고도화 (에러 표준화 — Phase C)
7. 자동 수집 채널 연동 + 컨펌 후 게시 운영화
8. Ask/Search 화면의 citations/confidence UI 완결 (Phase B-1 일부)

## 3. 중기 우선순위 (P2)

1. search / ask / doc-assist / template reference에서 발견 전용·차단 근거 지표 정교화
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
| 2026-05-20 | AI 검색 결과 요약, DB 기반 검색 기록/인기 검색어, 잠긴 문서 미리보기, 권한 요청 CTA, Docker/browser 검증 완료를 현재 완료 범위에 반영. 단기 P1에 unreadable 검색 결과 카드 스니펫/키워드 노출 정책 정리를 추가 |
| 2026-05-18 | 공통 알림/SSE, DMS 헤더 알림, 사용자별 client state isolation, 권한 요청 취소/알림 cleanup 을 현재 완료 범위에 반영. 현재 기준 검증 통과 상태를 명시하고, hard refresh client-side error는 브라우저 재현 기반 QA 항목으로 분리 |
| 2026-05-14 | DMS 접근 검증 게이트 복구(`verify:access-dms:raw` 통과)와 권한 UX 재감사 결과 반영. 액세스 요청 워크플로우와 관리자 권한 운영 surface 를 완료로 재분류하고, 잔여 P1을 차단 소스 수 표시와 권한 UX 회귀 자동화로 축소 |
| 2026-04-30 | Phase A 종결 — 문서 정본 GitLab push 정책 확정 (canonical `master`), versionHistory dead code 제거 + 의도 backlog 등재. Track 2/5/7 closed (100%). 단기 우선순위를 Phase B (권한 UX 3종, `DMS-PERM-UX-01/02/03`) 로 재정렬 |
| 2026-04-30 | DMS 핵심 서비스 분해 트랙 (C-2 / C-3 / C-4, 13 slices, 7 commits) 종료를 현재 완료에 반영. `access-request.service.ts` 2150 → 1121 (-48%) 외 collaboration / git 서비스도 cohesive 단위로 분리 |
| 2026-04-14 | DMS object ACL pilot을 file/content write-read + template/doc-assist source hint + creator owner default + 기본 UI affordance + upload inheritance + local storage/open + validation matrix까지 확장한 상태를 현재 완료에 반영하고, 단기 우선순위를 PMS/CMS alignment로 전환 |
| 2026-04-14 | 공통 permission contract / auth-access validation baseline 완료를 현재 완료 항목에 반영하고, 단기 우선순위를 object ACL 중심으로 재정렬 |
| 2026-04-13 | auth/access readiness 기준으로 로드맵을 재정렬하고, DMS의 다음 우선순위를 object ACL + 검증 시나리오 고정으로 갱신 |
| 2026-02-24 | P1 항목별 1차 구현/잔여 작업 상태표 추가 |
| 2026-02-24 | 과거 Phase 체크리스트를 현행 실행 로드맵(저장소/수집/딥리서치 중심)으로 전면 갱신 |
