# SNS Changelog

## 2026-09-22

- 승인된 공통 검색 카드의 공개 범위·업무 명칭 표현을 적용했다. 협업 브라우저 28개 검사와 실제 서비스 간 결과 이동을 확인했다. 게시물 표시는 검증용 응답으로 확인했으며 실제 게시물 검색/열기 전체 검증과 구분한다. [핸드오프](../common/explanation/architecture/2026-09-22-search-results-handoff.md).

- 사용자 승인으로 공용 로그인에 아이디 저장·비밀번호 표시 옵션을 연결했다. 기존 로그인·세션·권한과 서비스 테마는 유지한다. 새 빌드와 협업 28개 실제 동작 검증·네 화면 폭을 확인했다. [핸드오프](../common/explanation/architecture/2026-09-22-login-options-handoff.md).

## 2026-09-17

- 승인된 링크·이미지 첨부 구현·검증 완료. 주소 입력·기존 글 링크 열기, 사진 선택·미리보기·게시·확대·권한 보호·중복 없는 재시도와 파일 정리를 연결했다. 서버 44/44·실제 요청 41/41·저장 검사 4/4·세 크기·기존 업무 6/6. [결과](../common/explanation/architecture/2026-09-17-post-attachments-handoff.md). 승인-05 전체 완료, 18완료·4잔여·운영 증거 0/5.

- 첨부 두 기능을 `미착수`로 명확히 구분하고 [통합 승인안](planning/2026-09-16-share-attachments-proposal.md)에 주소 삽입·기존 글 링크 표시, 사진 4장/장당 5MB·미리보기·확대·실패 복구·권한 검증을 구체화했다. 제안 상태이며 제품 변경이나 완료 수 증가는 없다.
- 사용자 승인-05 중 공유 단계 완료. 공유 창·실제 링크 복사·수동 복구·게시물 보기·로그인 복귀·권한/계정 보호·주소와 탭 연결을 구현했다. 서버 19/19·실제 요청 21/21·세 크기·기존 영업 2/2·문서 4/4 검증. [결과](../common/explanation/architecture/2026-09-17-post-sharing-handoff.md). 링크/이미지 첨부 미구현, 전체 17완료·5잔여 유지.

## 2026-09-16

- 승인-05 [공유·첨부 승인안](planning/2026-09-16-share-attachments-proposal.md) 준비. 공유 우선 범위·첨부 후속 결정·검증 기준을 정리하고 두 크기의 첨부 미연결을 재현했다. 제품 미변경, 세 동작 미구현, 17완료·5대기 유지.

- 승인-21 답글 원문 일치 검사 완료. 다른 공개/비공개·비활성·없는 원문 거절, 정상 댓글/답글·화면·기존 업무 보존. 관련 서버 16/16·새 서버 빌드·실제 요청/두 크기 화면·고객관리 2/2·문서관리 4/4 통과. [결과](../common/explanation/architecture/2026-09-16-reply-parent-handoff.md).

- 승인-04 댓글 열람·일반 작성·활성 집계 완료. 두 크기·권한·재시도·초안 보존·작성자 조회·기존 답글·기존 업무 회귀 통과. [결과](../common/explanation/architecture/2026-09-16-comments-handoff.md). 다른 게시물 원문을 허용하는 기존 답글 요청은 승인-21로 별도 기록. 아래 미구현 범위는 각 단계 당시 기록이다.

- 승인-03 게시판 생성 완료: 필수/길이·취소·중복·실패 입력 보존·목록 재조회·생성 확인·권한 거절 검증. 새 빌드·입력 8/8·기존 업무 회귀 통과. [결과](../common/explanation/architecture/2026-09-16-board-creation-handoff.md). 아래 승인-20의 게시판 미구현은 당시 기록이다.

- 승인-20 공용 프로필의 변경 직후 표시 갱신 완료. 다섯 서비스 빠른 조작·소개 편집, 실제 서버 알림·실패 복구와 기존 업무 회귀 통과. [결과](../common/explanation/architecture/2026-09-16-profile-refresh-handoff.md). 게시판 생성·댓글·공유/첨부는 미구현 범위를 유지한다.

## 2026-09-15

- 후속 승인-19 완료: 비활성 프로필 조회·저장 거절, 활성 기술 표시 및 재조회 거절 뒤 이전 표시 제거. 다섯 서비스 실제 화면·계정 전환·기존 업무 회귀 통과. [최신 결과](../common/explanation/architecture/2026-09-15-profile-state-handoff.md). 아래 승인-02 신규 발견 기록은 당시 상태다.

- 승인-02 전문가 검색 완료: 이름·소개·기술 검색, 여섯 분류, 실제 결과·페이지·공용 프로필 이동과 오류 복구/권한/사용자 전환 검증. 서버·커뮤니티 새 빌드와 기존 패널·문서 업무 회귀 통과.
- 기존 공용 프로필의 비활성 자료 표시를 승인-19로 별도 등록. 임의 변경 없음. [결과](../common/explanation/architecture/2026-09-15-expert-search-handoff.md).


## [Unreleased]

### Changed
- **2026-09-14 사용자 승인-17 통합 검색 가림 개선**
  - 검색 화면에서 기존 좁은 작업공간 접기 선택값만 지정. 패널 조작·넓은 배치·검색/권한 계약 보존
  - 세 크기 실제 브라우저와 직접 접속/새로고침·빈 안내·필터·크기 전환 회귀 통과
  - [최신 핸드오프](../common/explanation/architecture/2026-09-14-service-search-panel-handoff.md)에서 다른 미해결 서비스 경로와 범위를 구분
- **shared full MDI shell + all-app notification center alignment**
  - SNS shell 설명을 실제 구현 기준인 `SsooMdiTabBar` full MDI tabbar와 route-as-tab-input 계약으로 갱신
  - Header 알림센터는 SNS source 전용 필터가 아니라 5개 앱 공통 전체 수신 알림 surface를 소비하도록 정렬
  - 공용 header 알림센터의 `전체`/앱별 filter chip과 unread badge를 소비하되, SNS는 현재 앱 chip 우선순위만 힌트로 제공
  - SNS legacy notification bridge가 가능한 profile/board reference path를 common notification payload/reference에 실어 전역 알림 패널에서 SNS 대상 화면으로 전환할 수 있게 보강
- **board detail surface now resolves real board context**
  - `/board/:id` 가 더 이상 목록 placeholder 를 다시 렌더하지 않고 실제 게시판 메타데이터와 board-scoped 게시물 목록을 보여주도록 정리
  - SNS board detail route 의 TODO/unused param 상태를 제거해 라우트 계약과 실제 화면 동작을 일치시킴
- **stronger shell chrome parity with full MDI tabs**
  - SNS shell 을 colored header + collapsible shared sidebar + `SsooMdiTabBar` full MDI tabbar 조합으로 정렬
  - App Router 경로는 화면 표면 자체가 아니라 MDI tab open/active state를 동기화하는 입력으로 유지
  - sidebar 상태는 `SsooAppFrame`/`SsooSidebarSurface` collapsible 계약을 따른다
- **shared shell frame + LinkedIn-style feed surface**
  - `@ssoo/web-shell` 기반 outer shell frame 을 도입해 PMS/DMS와 같은 shell chassis를 공유
  - PMS/DMS `AppLayout` 이 같은 shared shell frame 위로 올라가도록 정리
  - SNS는 routed app 구조를 유지하면서도 홈(`/`) 피드를 좌/중앙/우 3열 SNS 구성으로 강화
  - SNS 피드에 내 프로필 rail, compose/timeline, 알림/추천 rail 을 분리해 LinkedIn 레퍼런스가 shell 안쪽에서도 보이도록 정리
- **root entry contract realignment**
  - SNS 내부 public landing 계약을 철회하고, `/`를 인증 후 기본 홈으로 다시 정렬
  - 기존 `/feed` 전용 인증 홈 라우트와 landing placeholder 연결을 제거
  - `login`, `Header`, `not-found`, `middleware`, README 설명을 PMS/DMS와 같은 첫 진입 계약 기준으로 갱신
- **public landing route split + shared bootstrap alignment**
  - SNS가 `3004` 포트의 독립 앱이라는 점을 기준으로, 앱 간 `/` 충돌 걱정 없이 SNS 내부에서만 `/` 퍼블릭 랜딩 + `/feed` 인증 홈 계약으로 정렬
  - SNS `Header`, `login`, `not-found`, `(main)` 라우트가 `/feed` 기준 인증 홈 계약을 사용하도록 정리
  - PMS/SNS/DMS `(main)` layout의 auth/access bootstrap 흐름을 `@ssoo/web-auth` 공용 hook 기준으로 맞출 수 있는 기반을 추가
- **browser-facing legacy flag 축소**
  - `SnsAccessSnapshot` 에서 redundant `isAdmin` 필드를 제거하고, override 판단은 shared `policy.hasSystemOverride` 기준으로 정리
- **공통 permission/runtime contract 정렬 확인**
  - `apps/server/src/modules/sns/access/access.service.ts` 가 계속 `AccessFoundationService` 와 shared `policy` trace 기준으로 feature snapshot 을 계산함을 기준선으로 고정
  - `buildVisiblePostWhere()` 기반 content visibility/object policy 가 DMS reference contract 이후에도 같은 상위 용어(role/org/user-exception/system override + domain object policy)로 설명 가능함을 확인
- **SNS content visibility/object policy 적용**
  - `sns_post_m` / `sns_post_h` 가 `visibility_scope_code(public/organization/followers/self)` 와 `target_org_id` 를 저장하도록 확장
  - `FeedService`, `PostService`, `CommentService`, reaction/bookmark entrypoint 가 동일한 readable-post policy 를 사용해 organization/followers/self 범위를 일관 적용
  - `organization` 공개는 작성자의 primary organization 으로 자동 귀속되도록 정리
  - `ComposeBox` 에 공개 범위 선택 UI를 추가하고 `PostCard` 에 비공개 범위 badge 를 표시
  - same-org 검증용 demo user(`dev.park`)와 `11_demo_users_customers.sql` seed 경로를 실제 `db:seed` 루프에 포함해 fresh DB 재현성을 보강
- **SNS baseline access policy 적용**
  - `GET /api/sns/access/me` 가 hard-coded `all true` snapshot 대신 role/org/user-exception/system override 기반 feature snapshot 을 계산하도록 변경
  - `canReadFeed`, `canCreatePost`, `canComment`, `canReact`, `canFollow`, `canManageSkills`, `canManageBoards` 기준으로 SNS baseline feature gate 도입
  - `SnsFeatureGuard` + `RequireSnsFeature(...)` 를 추가해 board/skill/feed/post/comment/follow/profile controller 경계를 snapshot 기준으로 보호
  - 게시물/댓글 수정·삭제는 작성자 본인 또는 system override 만 가능하도록 최소 object mutation 경계 추가
  - SNS 웹에서는 `FeedPage`, `ComposeBox`, `PostCard`, `BoardListPage`, `Header`, `SearchPage` 가 같은 snapshot 기준으로 노출/disabled 상태를 결정
  - `visibility_scope` / `target_org_id` 기반 content visibility/object policy 는 후속 슬라이스로 유지
- **auth proxy contract 정규화**
  - SNS same-origin `/api/auth/[action]` 가 backend envelope를 브라우저까지 그대로 넘기지 않고 payload-only contract로 정리되어 PMS/DMS와 같은 auth adapter 계약을 사용
- **auth surface unification (auth-web-surface-unification)**
  - `src/app/api/auth/[action]/route.ts` + `src/app/api/_shared/serverApiProxy.ts` 신규 추가로 same-origin auth proxy 완성
  - `authApi` 어댑터를 Axios `apiClient` 기반에서 same-origin `/api/auth/*` fetch 기반으로 교체
  - Axios 401 인터셉터의 session bootstrap을 직접 백엔드 호출에서 `/api/auth/session` same-origin 경유로 변경
  - PMS와 동일한 패턴으로 DMS와 브라우저-facing auth entrypoint 통일 완료
- **shared session + SNS access snapshot 기반 확장 (기존 항목)**
  - SNS auth surface를 same-origin `/api/auth/[action]` proxy 기준으로 정리하고, 401 session bootstrap도 `/api/auth/session` 경유로 통일해 DMS와 같은 브라우저-facing auth entrypoint를 사용
  - SNS auth client가 `/auth/session` bootstrap 흐름을 사용하도록 정리해 PMS/DMS와 같은 사용자 세션을 복원할 수 있게 함
  - 서버에 `GET /api/sns/access/me` snapshot endpoint를 추가해 SNS 도메인 권한을 공통 JWT와 분리할 수 있는 기준점을 마련
  - SNS `(main)` layout이 authenticated shell 진입 전에 access snapshot을 hydrate 하도록 정리하고, feed `ComposeBox` 는 `canCreatePost` 기준으로 작성 동작을 결정하도록 연결
- **공용 auth runtime/login UI 정렬**
  - `packages/types` / `packages/web-auth` 기준으로 SNS auth store와 login UI를 공용 surface 위로 이동
  - SNS login page를 placeholder에서 실제 로그인 폼으로 교체
  - SNS auth client를 공용 서버 계약에 맞춰 `/api/auth/me` POST 기준으로 정렬
  - SNS는 인증 이후에도 feed/profile bootstrap은 앱별 책임으로 유지
- **로그인 화면 PMS 기준 정렬**
- `packages/web-auth` 의 PMS 기준 표준 login card를 사용하도록 SNS login entry를 단순화
- 레이아웃, 문구, footer는 PMS와 동일하게 맞추고 SNS 틸 컬러 토큰은 그대로 유지

## [0.1.0] - 2026-03-20

### Added
- **Phase 0**: 프로젝트 인프라 보일러플레이트
  - Next.js 15 앱 (`apps/web/sns`), 포트 3004
  - 틸 컬러 테마 (`#0A3D3D`, hue 180°)
  - JWT 인증 공유 (`ssoo-auth` localStorage)
  - pnpm workspace 통합, Turborepo 빌드
  - `.github/instructions/sns.instructions.md` 개발 규칙
  - CI 파이프라인 (`pr-validation.yml`) SNS 빌드 추가

- **Phase 1**: 데이터 모델 & 서버 API
  - PostgreSQL `sns` 스키마, `ch_` 접두사 — 20개 Prisma 모델
  - NestJS 8개 서버 모듈 (post, comment, board, profile, skill, follow, notification, feed)
  - `@ssoo/types` SNS 타입 (9개 파일)
  - 히스토리 트리거 SQL (50번대, 4개)
  - 시드 데이터 (게시판 5개, 스킬 24개)

- **Phase 2-5**: SNS 피드, 게시판, 인력풀, 소셜 UI
  - shadcn/ui 기반 UI 컴포넌트 (button, card, avatar, badge 등 9개)
  - LinkedIn 스타일 레이아웃 (Header + 페이지 라우팅)
  - 피드 타임라인 (ComposeBox, PostCard, 무한스크롤)
  - 게시판 목록 (카드 그리드, 타입 배지)
  - 프로필 페이지 (커버이미지, 스킬맵 게이지바, 프로젝트 이력)
  - 전문가 검색 (스킬 카테고리 필터)
  - React Query 훅 5개 (posts, comments, boards, profiles, notifications)
  - API 엔드포인트 7개 (Axios 클라이언트)
