# SSOO 변경 이력 (Changelog) - 인덱스

> 전체 변경 이력 요약 및 영역별 문서 링크

**마지막 업데이트**: 2026-02-10

---

## 📍 Changelog 하이브리드 구조

### 자동 생성 (릴리스 노트)
- **위치**: [/docs/CHANGELOG.md](/docs/CHANGELOG.md)
- **도구**: `conventional-changelog`
- **용도**: 버전별 릴리스 노트 (Git 커밋 메시지 기반 자동 생성)
- **명령어**: `pnpm changelog` (증분) / `pnpm changelog:init` (전체 재생성)

### 수동 관리 (영역별 상세)
각 문서 하단에 해당 영역의 상세 변경 이력이 있습니다.

| 영역 | 문서 위치 | 설명 |
|------|----------|------|
| **작업 프로세스** | [workflow-process.md](../../common/explanation/architecture/workflow-process.md#changelog) | 개발 프로세스/커밋/Git (공용) |
| **프론트엔드 표준** | [architecture/frontend-standards.md](../explanation/architecture/frontend-standards.md#changelog) | 컴포넌트 표준 |
| **API** | [api-guide.md](../../common/guides/api-guide.md#changelog) | REST API 사용 가이드 (공용) |
| **레이아웃** | [design/layout-system.md](../explanation/design/layout-system.md#changelog) | 레이아웃/사이드바/탭바 |
| **상태 관리** | [architecture/state-management.md](../explanation/architecture/state-management.md#changelog) | Zustand Store |
| **UI 컴포넌트** | [design/ui-components.md](../explanation/design/ui-components.md#changelog) | 공통 컴포넌트 |
| **유틸리티** | [architecture/utilities.md](../explanation/architecture/utilities.md#changelog) | API Client, 헬퍼 |
| **인증** | [auth-system.md](../../common/explanation/architecture/auth-system.md#changelog) | 인증/인가 (공용) |
| **스크롤바** | [design/scrollbar.md](../explanation/design/scrollbar.md#changelog) | 스크롤바 스타일 |
| **데이터베이스** | [database-guide.md](../../common/guides/database-guide.md#changelog) | DB 구조/연결 (공용) |

---

## 📅 최근 변경 요약

### 2026-02-10

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | UI | **DataGrid 세컨 패널 옵션 추가**: 하단 그립 버튼 토글 + 플로팅 상세 패널 지원 |
| - | - | UI | **요청 목록 실데이터 조회/검색 적용**: 메인 그리드 API 연동, 세컨 그리드 상세 패널 추가 |

### 2026-02-09

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | 성능 | **icons.ts wildcard import 제거**: `import * as LucideIcons`(3,740모듈) → 명시적 25개 아이콘 import. 초기 모듈 4,626→1,442 (-69%) |
| - | - | 버그 | **auth.store.ts Hydration 처리 추가**: `_hasHydrated` 상태 + `onRehydrateStorage` 콜백으로 SSR→CSR 전환 시 상태 불일치 해결 |
| - | - | 버그 | **checkAuth 안전한 에러 처리**: 외부 try-catch로 네트워크 오류 등 예상치 못한 예외 시 `isLoading: true` 고정 방지 |
| - | - | 버그 | **DataGrid 클라이언트 페이지네이션 연결**: ListPageTemplate 샘플 목록에서 페이지 변경 반영 |
| - | - | 리팩 | **(main)/layout.tsx 인라인 로그인 폼 제거**: 기존 (auth)/login 페이지 활용, AppLayout dynamic import로 청크 분리 |
| - | - | 버그 | **middleware.ts `/login` 경로 허용 추가**: 미인증 시 리다이렉드 작동 |
| - | - | 신규 | **global-error.tsx 추가**: ChunkLoadError 자동 새로고침 + 폴백 UI |
| - | - | 신규 | **(main)/error.tsx 추가**: 인증 후 영역 에러 바운더리 (자동 복구) |
| - | - | 개선 | **(main)/layout.tsx 로딩 타임아웃 추가**: 15초 초과 시 자동 새로고침, 재실패 시 로그인 페이지로 이동 |
| - | - | DB | **프로젝트 단계별 상세 테이블 추가**: request/proposal/execution/transition 상세 + 히스토리 트리거 도입, UNIT 코드 그룹 시드 추가 |
| - | - | 문서 | **프로젝트 단계별 상세/전환 흐름 문서화**: concepts, lifecycle, 실행 종료 스펙 업데이트 |

### 2026-01-30

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | 정리 | **미사용 ui 컴포넌트 삭제**: badge, dialog, label, separator, sheet, tooltip, breadcrumb |
| - | - | 정리 | **미사용 ProtectedRoute 삭제** (향후 컨트롤 레벨 권한은 별도 패턴으로 구현 예정) |
| - | - | 리팩토링 | **Admin.tsx → AdminMenu.tsx** 파일명/함수명 통일 |
| - | - | 문서 | frontend-standards.md, layout-system.md, ui-components.md 현행화 |
| - | - | 버그 | **Search 컴포넌트 무한 루프 수정**: lucide-react `Search` 아이콘과 컴포넌트 이름 충돌 → `SearchIcon` alias로 해결 |
| - | - | 리팩토링 | **`ListPageTemplateV2.tsx` → `ListPageTemplate.tsx` 파일명 변경** (레거시 제거 후 표준 이름 사용) |
| - | - | 구조 | **PMS/DMS Sidebar 구조 통일**: `MainSidebar/` + `sidebar/` → `Sidebar/` 폴더 통합 |
| - | - | 구조 | Sidebar 컴포넌트 접두어 제거: `SidebarSearch` → `Search`, `SidebarSection` → `Section` 등 |
| - | - | 구조 | **common/page 네이밍 통일**: `PageHeader` → `Header`, `PageContent` → `Content` 등 |
| - | - | 삭제 | **레거시 템플릿 삭제**: `ListPageTemplate` (V2가 표준), `DetailPageTemplate`, `PageHeader` 삭제 |
| - | - | 구조 | `FormPageTemplate` 리팩토링: `PageHeader` → `Breadcrumb` + Title 내장 방식 |

### 2026-01-25

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | `50e84d0` | 문서 | **API 문서 HTML 생성**: @redocly/cli 도입, OpenAPI JSON → Redoc HTML 자동 변환 |
| - | - | 문서 | 문서 자동화 출력 패턴 통일: 모든 도구가 정적 HTML/SVG 산출물 생성 |
| - | - | 문서 | **Changelog 하이브리드 도입**: conventional-changelog 자동 + 영역별 수동 병행 |
| - | - | 문서 | docs-verify.js 검증 항목 14개로 확장 (API index.html 추가) |
| - | - | 문서 | 아키텍처 다이어그램 폴더 구조 준비 (diagrams-src, diagrams/.gitkeep) |
| - | - | 결정 | Changelog 자동화 검토 → 현행 하이브리드 방식 유지 (영역별 분산 + 인덱스) |

### 2026-01-24

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | DB | **Phase 2-B 완료: PostgreSQL 멀티스키마 분리** |
| - | - | DB | 스키마 분리 보완 - common: User/UserHistory만 (2개), pms: 나머지 (27개) |
| - | - | DB | 04_refine_schema_separation.sql 작성 및 실행 (cm_* 테이블 common→pms 이동) |
| - | - | DB | Prisma 6.x multiSchema stable 반영 (previewFeatures 제거) |
| - | - | 문서 | DB README.md 스키마 분리 내용 업데이트 |

### 2026-01-23

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | `cbfa70b` | DB | 트리거/시드 파일에 명시적 스키마 prefix(pms./common.) 적용 |
| - | `f214e92` | 문서 | 문서 경로 수정 (web-pms → web/pms) 및 레거시 스크립트 아카이브 |
| - | `be91fe2` | 구조 | 스크립트 아카이브를 docs/pms/_archive/로 통합 |
| - | `8930b75` | 문서 | **모듈러 모놀리스 아키텍처 문서** 추가 (modular-monolith.md) |
| - | `8cc8d9a` | 문서 | **프론트엔드 패키지 전략 문서** 추가 (frontend-package-strategy.md) |
| - | - | 결정 | PMS/DMS 독립 개발 후 통합 방침 결정 (별도 조직, 런칭 임박) |
| - | - | 구조 | @ssoo/types 패키지를 subpath exports 구조로 재편 (`@ssoo/types/common`, `@ssoo/types/pms`) |
| - | - | 구조 | @ssoo/types-pms 패키지 삭제 (types/pms로 통합) |
| - | - | 구조 | 프론트엔드 디렉토리 구조 재편 (apps/web/pms → apps/web/pms, apps/web-dms → apps/web/dms) |
| - | - | 수정 | @nestjs/throttler v6 API 호환성 수정 (@Throttle 데코레이터) |
| - | - | 설정 | pnpm-workspace.yaml 경로 패턴 수정 (apps/server, apps/web/*) |

### 2026-01-22

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | 백엔드 | 서버 모듈을 common/pms 도메인 단위로 분리하여 모듈러 모놀리스 구조 확립 |
| - | - | 문서 | server Typedoc을 도메인별 경로로 분리(`docs/common/reference/typedoc/server`, `docs/pms/reference/typedoc/server`)하고 빌드 스크립트 정리 |
| - | - | 문서 | 문서 아웃풋 경로 규칙 `docs/{type}/reference/{package}` 적용(typedoc·storybook 기준 확인) |
| - | - | 문서 | 최신 모듈 경로(common/pms) 기준으로 API·도메인 문서의 코드 참조 경로 정합화 |
| - | - | 백엔드 | JWT 시크릿/만료 설정을 환경변수 필수 값으로 강제하고 Joi 기반 설정 검증 추가 |
| - | - | 백엔드 | 글로벌 HTTP 예외 필터 도입, NotFound 응답을 예외 처리로 전환해 상태코드 정합성 확보 |
| - | - | 백엔드 | 로그인/토큰 갱신 레이트 리밋 적용(5/10 req per min), 비밀번호 정책 강화(8자, 영문+숫자+특수문자) |
| - | - | 백엔드 | Prisma `db.client.<model>` 접근 가이드 및 BigInt 직렬화 유틸 문서화 |
| - | - | 백엔드 | ESLint 모듈 경계 규칙(import/no-restricted-paths)으로 common↔pms 역참조 차단 |

### 2026-01-21

| 시간 | 커밋 | 영역 | 변경 내용 |
|------|------|------|----------|
| - | - | 문서 | PMS 문서와 코드 정합성 점검(구현 상태 표기/경로 정합화) |
| - | - | 문서 | 라우팅/보안 문서 경로 및 로그인 플로우 정합화 |
| - | - | 문서 | 레이아웃/상태관리 문서 정합화 (사이드바/탭/검색 섹션) |
| - | - | 문서 | 프론트엔드 표준 문서 구조/컴포넌트 정합화 |
| - | - | 문서 | 유틸리티 문서/리다이렉트 경로 정합화 |
| - | - | 문서 | @ssoo/types 커버리지 기준 및 동기화 원칙 명시 |
| - | - | 문서 | 서버 모듈 경로 변경에 따른 문서 경로 정합화 |
| - | - | 문서 | docs 구조를 common/pms/dms로 분리 |
| - | - | 문서 | apps/web → apps/web/pms 리네임 완료 |
| - | - | 문서 | apps/web-dms 디렉토리 슬롯 준비 |
| - | - | 문서 | PMS 문서 UI/렌더링 롤백 진행 |
| - | - | 문서 | PMS 문서 구조 정리 계획 문서 추가 |
| - | - | 문서 | PMS 기준 문서 구조로 수렴 |
| - | - | 문서 | /docs 홈에 문서 자동 목록 표시 추가 |
| - | - | 문서 | /docs 문서 허브 및 ReDoc 기반 API Reference 경로 추가 |
| - | - | 문서 | 리팩터링 문서 아카이브 이동 및 개발 표준 위치 정리 |
| - | `cef4630` | 문서 | UI 컴포넌트 및 유틸리티 문서화 |
| - | `63d21be` | 문서 | 상태 관리 및 레이아웃 시스템 문서화 |
| - | `38d7160` | 문서 | API 명세서 문서화 (5개 파일) |
| - | `8047c9c` | 기능 | 즐겨찾기 DB 연동 구현 |
| - | `bba91bc` | 수정 | 현재 열린 페이지에서 홈 탭 제외 |
| - | `4c902a0` | 문서 | CHANGELOG 업데이트 |
| - | `6d0a8b9` | 수정 | 접힌 사이드바에서 관리자 메뉴 표시 |
| - | `188c1f7` | 기능 | 사이드바 하단에 카피라이트 영역 추가 |
| - | `ebd82f5` | 수정 | 사이드바 스크롤 영역을 검색란 아래로 한정 |
| - | `d43cb90` | 기능 | 커스텀 스크롤바 디자인 시스템 추가 |

### 2026-01-20

| 커밋 | 영역 | 변경 내용 |
|------|------|----------|
| - | 리팩터링 | MainSidebar 컴포넌트 분리 (295줄 → 6개 파일) |
| - | 리팩터링 | DataTable 컴포넌트 분리 (454줄 → 5개 파일) |
| - | 수정 | 하드코딩 URL 수정, 인증 가드 타입 개선 |
| - | 설정 | Husky + lint-staged + Commitlint 설정 |

---

## 📋 변경 유형 범례

| 태그 | 설명 |
|------|------|
| 기능 | 새로운 기능 추가 |
| 수정 | 버그 수정 |
| 리팩터링 | 코드 구조 개선 |
| 문서 | 문서화 작업 |
| 설정 | 설정 파일 변경 |
| 스타일 | UI/UX 개선 |

---

## 🗃️ 아카이브

> 30일 이상 지난 변경 이력은 아카이브로 이동합니다.

- [2026년 1월 이전](../_archive/changelog-2025.md) *(예정)*

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

