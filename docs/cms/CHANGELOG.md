# CMS Changelog

## [Unreleased]

### Changed
- **stronger shell chrome parity without real MDI tabs**
  - CMS shell 을 colored header + hover-reveal icon rail sidebar + route-aware secondary strip 조합으로 재구성
  - PMS/DMS 계열의 shell 모양을 더 가깝게 맞추되, CMS는 routed app 의미를 유지
  - sidebar hover reveal 은 PMS collapsed toggle state 와 분리된 CMS 전용 interaction 으로 정의
- **shared shell frame + LinkedIn-style feed surface**
  - `@ssoo/web-shell` 기반 outer shell frame 을 도입해 PMS/DMS와 같은 shell chassis를 공유
  - PMS/DMS `AppLayout` 이 같은 shared shell frame 위로 올라가도록 정리
  - CMS는 routed app 구조를 유지하면서도 홈(`/`) 피드를 좌/중앙/우 3열 SNS 구성으로 강화
  - CMS 피드에 내 프로필 rail, compose/timeline, 알림/추천 rail 을 분리해 LinkedIn 레퍼런스가 shell 안쪽에서도 보이도록 정리
- **root entry contract realignment**
  - CMS 내부 public landing 계약을 철회하고, `/`를 인증 후 기본 홈으로 다시 정렬
  - 기존 `/feed` 전용 인증 홈 라우트와 landing placeholder 연결을 제거
  - `login`, `Header`, `not-found`, `middleware`, README 설명을 PMS/DMS와 같은 첫 진입 계약 기준으로 갱신
- **public landing route split + shared bootstrap alignment**
  - CMS가 `3002` 포트의 독립 앱이라는 점을 기준으로, 앱 간 `/` 충돌 걱정 없이 CMS 내부에서만 `/` 퍼블릭 랜딩 + `/feed` 인증 홈 계약으로 정렬
  - CMS `Header`, `login`, `not-found`, `(main)` 라우트가 `/feed` 기준 인증 홈 계약을 사용하도록 정리
  - PMS/CMS/DMS `(main)` layout의 auth/access bootstrap 흐름을 `@ssoo/web-auth` 공용 hook 기준으로 맞출 수 있는 기반을 추가
- **browser-facing legacy flag 축소**
  - `CmsAccessSnapshot` 에서 redundant `isAdmin` 필드를 제거하고, override 판단은 shared `policy.hasSystemOverride` 기준으로 정리
- **공통 permission/runtime contract 정렬 확인**
  - `apps/server/src/modules/cms/access/access.service.ts` 가 계속 `AccessFoundationService` 와 shared `policy` trace 기준으로 feature snapshot 을 계산함을 기준선으로 고정
  - `buildVisiblePostWhere()` 기반 content visibility/object policy 가 DMS reference contract 이후에도 같은 상위 용어(role/org/user-exception/system override + domain object policy)로 설명 가능함을 확인
- **CMS content visibility/object policy 적용**
  - `cms_post_m` / `cms_post_h` 가 `visibility_scope_code(public/organization/followers/self)` 와 `target_org_id` 를 저장하도록 확장
  - `FeedService`, `PostService`, `CommentService`, reaction/bookmark entrypoint 가 동일한 readable-post policy 를 사용해 organization/followers/self 범위를 일관 적용
  - `organization` 공개는 작성자의 primary organization 으로 자동 귀속되도록 정리
  - `ComposeBox` 에 공개 범위 선택 UI를 추가하고 `PostCard` 에 비공개 범위 badge 를 표시
  - same-org 검증용 demo user(`dev.park`)와 `11_demo_users_customers.sql` seed 경로를 실제 `db:seed` 루프에 포함해 fresh DB 재현성을 보강
- **CMS baseline access policy 적용**
  - `GET /api/cms/access/me` 가 hard-coded `all true` snapshot 대신 role/org/user-exception/system override 기반 feature snapshot 을 계산하도록 변경
  - `canReadFeed`, `canCreatePost`, `canComment`, `canReact`, `canFollow`, `canManageSkills`, `canManageBoards` 기준으로 CMS baseline feature gate 도입
  - `CmsFeatureGuard` + `RequireCmsFeature(...)` 를 추가해 board/skill/feed/post/comment/follow/profile controller 경계를 snapshot 기준으로 보호
  - 게시물/댓글 수정·삭제는 작성자 본인 또는 system override 만 가능하도록 최소 object mutation 경계 추가
  - CMS 웹에서는 `FeedPage`, `ComposeBox`, `PostCard`, `BoardListPage`, `Header`, `SearchPage` 가 같은 snapshot 기준으로 노출/disabled 상태를 결정
  - `visibility_scope` / `target_org_id` 기반 content visibility/object policy 는 후속 슬라이스로 유지
- **auth proxy contract 정규화**
  - CMS same-origin `/api/auth/[action]` 가 backend envelope를 브라우저까지 그대로 넘기지 않고 payload-only contract로 정리되어 PMS/DMS와 같은 auth adapter 계약을 사용
- **auth surface unification (auth-web-surface-unification)**
  - `src/app/api/auth/[action]/route.ts` + `src/app/api/_shared/serverApiProxy.ts` 신규 추가로 same-origin auth proxy 완성
  - `authApi` 어댑터를 Axios `apiClient` 기반에서 same-origin `/api/auth/*` fetch 기반으로 교체
  - Axios 401 인터셉터의 session bootstrap을 직접 백엔드 호출에서 `/api/auth/session` same-origin 경유로 변경
  - PMS와 동일한 패턴으로 DMS와 브라우저-facing auth entrypoint 통일 완료
- **shared session + CMS access snapshot 기반 확장 (기존 항목)**
  - CMS auth surface를 same-origin `/api/auth/[action]` proxy 기준으로 정리하고, 401 session bootstrap도 `/api/auth/session` 경유로 통일해 DMS와 같은 브라우저-facing auth entrypoint를 사용
  - CMS auth client가 `/auth/session` bootstrap 흐름을 사용하도록 정리해 PMS/DMS와 같은 사용자 세션을 복원할 수 있게 함
  - 서버에 `GET /api/cms/access/me` snapshot endpoint를 추가해 CMS 도메인 권한을 공통 JWT와 분리할 수 있는 기준점을 마련
  - CMS `(main)` layout이 authenticated shell 진입 전에 access snapshot을 hydrate 하도록 정리하고, feed `ComposeBox` 는 `canCreatePost` 기준으로 작성 동작을 결정하도록 연결
- **공용 auth runtime/login UI 정렬**
  - `packages/types` / `packages/web-auth` 기준으로 CMS auth store와 login UI를 공용 surface 위로 이동
  - CMS login page를 placeholder에서 실제 로그인 폼으로 교체
  - CMS auth client를 공용 서버 계약에 맞춰 `/api/auth/me` POST 기준으로 정렬
  - CMS는 인증 이후에도 feed/profile bootstrap은 앱별 책임으로 유지
- **로그인 화면 PMS 기준 정렬**
- `packages/web-auth` 의 PMS 기준 표준 login card를 사용하도록 CMS login entry를 단순화
- 레이아웃, 문구, footer는 PMS와 동일하게 맞추고 CMS 틸 컬러 토큰은 그대로 유지

## [0.1.0] - 2026-03-20

### Added
- **Phase 0**: 프로젝트 인프라 보일러플레이트
  - Next.js 15 앱 (`apps/web/cms`), 포트 3002
  - 틸 컬러 테마 (`#0A3D3D`, hue 180°)
  - JWT 인증 공유 (`ssoo-auth` localStorage)
  - pnpm workspace 통합, Turborepo 빌드
  - `.github/instructions/cms.instructions.md` 개발 규칙
  - CI 파이프라인 (`pr-validation.yml`) CMS 빌드 추가

- **Phase 1**: 데이터 모델 & 서버 API
  - PostgreSQL `cms` 스키마, `ch_` 접두사 — 20개 Prisma 모델
  - NestJS 8개 서버 모듈 (post, comment, board, profile, skill, follow, notification, feed)
  - `@ssoo/types` CMS 타입 (9개 파일)
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
