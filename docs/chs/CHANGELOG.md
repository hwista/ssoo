# CHS Changelog

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

## [Unreleased]

### Added
- Phase 0: 프로젝트 초기 세팅 및 보일러플레이트 생성
- planning 문서 정본화 (`docs/chs/planning/README.md`, `backlog.md`, `handoff-2026-03-23.md`)
- 게시판 상세 페이지, 전문가 검색 페이지네이션, 댓글 트리 UI, 프로필 편집형 설정, 알림 드롭다운/헤더 뱃지 구현
- `getTimeAgo`, `useDebounce`, board/search/comment/notification 전용 훅 및 UI 컴포넌트 추가
- 게시물 상세 라우트(`/post/:id`)와 고유 공유 deep-link 추가
- COMMENT/FOLLOW/REACTION 알림 서버 트리거 연결 및 post 알림 상세 이동 지원
- 팔로우/언팔로우, 팔로워·팔로잉 목록 다이얼로그, 스킬 추가/삭제/추천, 경력 추가 UI 추가
- 게시물 수정/삭제 메뉴, 게시물 수정 다이얼로그, 댓글 섹션 스크롤, 관리자 전용 게시판 생성 버튼 가드 추가
- CHS shadcn/ui `dropdown-menu`, `dialog`, `label` 프리미티브 추가
