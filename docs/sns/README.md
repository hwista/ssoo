# SNS 문서

> 사용자가 콘텐츠를 발행하고 공유하는 소셜 네트워크 서비스 — SSOO 모노레포 3번째 앱

> 2026-09-17 최신: [링크·이미지 첨부 완료](../common/explanation/architecture/2026-09-17-post-attachments-handoff.md). [현재 첨부 동작](explanation/architecture/post-attachments.md)을 따른다. 공유까지 세 기능 모두 완료, 전체 승인 항목 18완료·4잔여·운영 증거 0/5.

> 2026-09-17 공유 단계 당시: [공유 단계 완료](../common/explanation/architecture/2026-09-17-post-sharing-handoff.md). 공유 창·복사·게시물 보기·권한/실패 복구를 검증했다. [현재 동작](explanation/architecture/post-sharing.md)을 따른다. 링크·이미지 첨부는 미구현이며 전체 17완료·5잔여를 유지한다.

> 2026-09-16 당시 검토: [공유·첨부 승인안](planning/2026-09-16-share-attachments-proposal.md)을 준비했다. 공유와 첨부 세 동작은 아직 미구현이다. 먼저 공유 창·게시물 보기의 승인을 요청하며 전체 22항목·17완료·5대기를 유지한다. 아래 수치는 각 구현 당시 기록이다.

> 2026-09-16: 승인-21 답글 원문의 게시물 일치 검사 완료. 잘못된 원문 4종 거절·저장 0건 및 정상 댓글/답글·기존 화면/업무 검증 통과. [최신 핸드오프](../common/explanation/architecture/2026-09-16-reply-parent-handoff.md) 기준 총 21항목·15완료·6대기.

> 2026-09-16: 승인-04 홈 피드 댓글 열람·일반 작성·활성 집계 완료. [댓글 동작](explanation/architecture/comments.md)과 [최신 핸드오프](../common/explanation/architecture/2026-09-16-comments-handoff.md)를 따른다. 총 21항목·14완료·7대기. 당시 발견한 답글 원문 연결 문제는 후속 승인-21로 처리했으며 공유/첨부는 미해결이다.

> 2026-09-16: 승인-03 게시판 생성 완료. [생성 동작](explanation/architecture/board-creation.md)과 [최신 핸드오프](../common/explanation/architecture/2026-09-16-board-creation-handoff.md)를 따른다. 당시 전체 승인 13완료·7대기였으며 댓글은 후속 승인-04로 처리했다.

> 2026-09-16: 승인-20 공용 프로필의 빠른 팔로우·좋아요·북마크·소개 갱신과 오류 복구 완료. [최신 프로필 핸드오프](../common/explanation/architecture/2026-09-16-profile-refresh-handoff.md) 기준 전체 승인 12완료·8대기, 후속 게시판 생성은 승인-03으로 처리했다.

> 2026-09-15: 승인-02 전문가 검색 완료. 이름·소개·기술 검색, 분류·페이지·공용 프로필 이동·오류 복구·권한 제한을 검증했다. [검색 동작](explanation/architecture/expert-search.md)과 [검색 핸드오프](../common/explanation/architecture/2026-09-15-expert-search-handoff.md)를 따른다. 공용 프로필 비활성 자료 표시는 후속 승인-19로 처리했다. [프로필 핸드오프](../common/explanation/architecture/2026-09-15-profile-state-handoff.md)를 따른다. 변경 직후 표시 갱신은 후속 승인-20으로 처리했다. 댓글은 후속 승인-04로 처리했으며 공유/첨부는 미해결이다.

## 개요

SNS는 **일(PMS) + 문서(DMS) + 콘텐츠(SNS)** 흐름을 담당하는 앱입니다.

| 기능 | 설명 |
|------|------|
| **SNS 피드** | LinkedIn 스타일 타임라인, 게시물, 반응, 멘션 |
| **게시판** | 공지사항, Q&A, 자유게시판, 인력 모집 |
| **인력풀** | 스킬맵, 프로젝트 이력, 전문가 검색, 추천 |
| **소셜** | 팔로우, 북마크, 알림 |

## 기술 스택

- **프론트엔드**: Next.js 15 + React 19 + TypeScript 5 + Tailwind CSS 3
- **UI**: shadcn/ui (Radix) — PMS와 동일 컴포넌트, 틸 색상 테마
- **Shared shell**: `@ssoo/web-shell` 기반 outer shell frame
- **상태**: Zustand 5 + TanStack Query 5
- **백엔드**: NestJS (모듈러 모놀리스, `modules/sns/`)
- **DB**: PostgreSQL `sns` 스키마 (`sns_` 접두사)
- **포트**: 3004

## 현재 라우팅 계약

SNS는 PMS/DMS와 같은 첫 진입 계약을 따른다.

| 경로 | 역할 |
|------|------|
| `/` | 인증 후 기본 홈 |
| `/login` | 인증 진입 |
| `/post/:id` | 공유받은 게시물 한 건 보기. 기존 로그인·열람 권한 적용 |
| `/board`, `/search`, `/ssoo/search` | SNS 인증 앱 영역 |
| `/__user/profile/me`, `/__user/profile/:userId`, `/__user/settings` | 현재 앱 프레임 탭 안에서 렌더링되는 공용 사용자 profile/settings 표면 |
| `/profile/*`, `/settings` | 기존 링크 호환용 route-entry 입력. `ContentArea`에서 canonical `__user` route로 인계하며 물리 SNS page를 렌더링하지 않는다. |

인증 메인 레이아웃 bootstrap은 PMS/DMS와 같은 패턴으로 정렬하고, 루트(`/`)가 기본 앱 진입점 역할을 맡는다.

## 현재 UI shell 방향

- **outer shell**: PMS/DMS와 같은 shared shell frame 기준으로 정렬
- **routing model**: App Router 경로는 MDI 탭 open/active state를 동기화하는 입력
- **shell chrome**:
  - 컬러 header
  - collapsible shared sidebar
  - `SsooMdiTabBar` 기반 full MDI tabbar
  - 공용 알림 센터는 source app 필터 없이 사용자의 전체 수신 알림을 표시하고, 알림 source app으로 전환할 수 있게 한다
- **feed surface**: 홈(`/`)은 LinkedIn 스타일의 3열 SNS 구성을 사용
  - 좌측: 내 프로필/빠른 이동
  - 중앙: compose + 피드 타임라인
  - 우측: 알림/추천/활용 기능

## 3앱 색상 패밀리

| 앱 | 색상 | Hue | 의미 |
|---|---|---|---|
| PMS | 네이비 `#0A1E5A` | 213° | 업무·신뢰 |
| DMS | 퍼플 `#34104A` | 270° | 지식·깊이 |
| **SNS** | **틸 `#0A3D3D`** | **180°** | **연결·성장** |

## 문서 구조

| 폴더 | 용도 |
|------|------|
| `tutorials/` | 학습 가이드 |
| `guides/` | 사용 가이드 |
| `reference/` | 기술 명세 (자동 생성) |
| `explanation/` | 개념 설명 |
| `planning/` | 기획/백로그 |
| `tests/` | 테스트 시나리오 |
