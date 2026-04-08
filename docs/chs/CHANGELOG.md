# CHS Changelog

## [Unreleased]

### Changed
- **auth surface unification (auth-web-surface-unification)**
  - `src/app/api/auth/[action]/route.ts` + `src/app/api/_shared/serverApiProxy.ts` 신규 추가로 same-origin auth proxy 완성
  - `authApi` 어댑터를 Axios `apiClient` 기반에서 same-origin `/api/auth/*` fetch 기반으로 교체
  - Axios 401 인터셉터의 session bootstrap을 직접 백엔드 호출에서 `/api/auth/session` same-origin 경유로 변경
  - PMS와 동일한 패턴으로 DMS와 브라우저-facing auth entrypoint 통일 완료
- **shared session + CHS access snapshot 기반 확장 (기존 항목)**
  - CHS auth surface를 same-origin `/api/auth/[action]` proxy 기준으로 정리하고, 401 session bootstrap도 `/api/auth/session` 경유로 통일해 DMS와 같은 브라우저-facing auth entrypoint를 사용
  - CHS auth client가 `/auth/session` bootstrap 흐름을 사용하도록 정리해 PMS/DMS와 같은 사용자 세션을 복원할 수 있게 함
  - 서버에 `GET /api/chs/access/me` snapshot endpoint를 추가해 CHS 도메인 권한을 공통 JWT와 분리할 수 있는 기준점을 마련
  - CHS `(main)` layout이 authenticated shell 진입 전에 access snapshot을 hydrate 하도록 정리하고, feed `ComposeBox` 는 `canCreatePost` 기준으로 작성 동작을 결정하도록 연결
- **공용 auth runtime/login UI 정렬**
  - `packages/types` / `packages/web-auth` 기준으로 CHS auth store와 login UI를 공용 surface 위로 이동
  - CHS login page를 placeholder에서 실제 로그인 폼으로 교체
  - CHS auth client를 공용 서버 계약에 맞춰 `/api/auth/me` POST 기준으로 정렬
  - CHS는 인증 이후에도 feed/profile bootstrap은 앱별 책임으로 유지
- **로그인 화면 PMS 기준 정렬**
- `packages/web-auth` 의 PMS 기준 표준 login card를 사용하도록 CHS login entry를 단순화
- 레이아웃, 문구, footer는 PMS와 동일하게 맞추고 CHS 틸 컬러 토큰은 그대로 유지

## [0.1.0] - 2026-03-20

### Added
- **Phase 0**: 프로젝트 인프라 보일러플레이트
  - Next.js 15 앱 (`apps/web/chs`), 포트 3002
  - 틸 컬러 테마 (`#0A3D3D`, hue 180°)
  - JWT 인증 공유 (`ssoo-auth` localStorage)
  - pnpm workspace 통합, Turborepo 빌드
  - `.github/instructions/chs.instructions.md` 개발 규칙
  - CI 파이프라인 (`pr-validation.yml`) CHS 빌드 추가

- **Phase 1**: 데이터 모델 & 서버 API
  - PostgreSQL `chs` 스키마, `ch_` 접두사 — 20개 Prisma 모델
  - NestJS 8개 서버 모듈 (post, comment, board, profile, skill, follow, notification, feed)
  - `@ssoo/types` CHS 타입 (9개 파일)
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
