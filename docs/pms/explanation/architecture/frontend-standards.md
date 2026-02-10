# SSOO 프론트엔드 표준

> 최종 업데이트: 2026-02-02

프론트엔드 개발 시 준수해야 할 표준 구조와 패턴을 정의합니다.

---

## 컴포넌트 계층 구조

```
components/
├── ui/              # Level 1 - Primitive (원자) - shadcn/ui
├── common/          # Level 2 - Composite (분자) - 재사용 가능한 조합
├── templates/       # Level 3 - Organism (유기체) - 페이지 템플릿
├── layout/          # App Layout - Header, Sidebar, TabBar, ContentArea
├── pages/           # 비즈니스 페이지 (라우팅 제외)
└── index.ts         # 통합 export
```

---

## Level 2 공통 컴포넌트 (common/)

### 폴더 구조

```
common/
├── ConfirmDialog.tsx   # 전역 Confirm Dialog (useConfirmStore 연동)
├── StateDisplay.tsx    # LoadingState, ErrorState, EmptyState 통합
├── datagrid/           # 데이터 그리드 컴포넌트
│   ├── DataGrid.tsx    # DataTable + Pagination 통합
│   ├── Toolbar.tsx     # 그리드 툴바
│   ├── Body.tsx        # 그리드 본문
│   ├── Footer.tsx      # 그리드 푸터
│   ├── Pagination.tsx  # 페이지 네비게이션
│   └── utils.tsx       # 유틸리티
├── form/               # 폼 컴포넌트
│   ├── FormSection.tsx
│   ├── FormActions.tsx
│   └── FormField.tsx
├── page/               # 페이지 전용 컴포넌트
│   ├── Breadcrumb.tsx
│   ├── Header.tsx
│   ├── Content.tsx
│   └── FilterBar.tsx
└── index.ts            # 통합 export
```

### 컴포넌트 목록

| 컴포넌트 | 용도 | Props |
|----------|------|-------|
| `ConfirmDialog` | 전역 확인 대화상자 | useConfirmStore 연동 |
| `StateDisplay` | 로딩/에러/빈 상태 통합 | loading, error, empty |
| `DataGrid` | DataTable + Pagination 통합 | columns, data, pagination, secondGrid |
| `Pagination` | 페이지 네비게이션 | page, pageSize, total, onChange |
| `FormSection` | 폼 섹션 제목 + 필드 그룹 | title, description, children |
| `FormActions` | 저장/취소/삭제 버튼 | onSubmit, onCancel, loading |
| `FormField` | 라벨 + 에러 래퍼 | label, required, error, hint |
| `Breadcrumb` | 페이지 경로 표시 | items |
| `Header` | 페이지 제목 + 액션 + 필터 | title, actions, filters |
| `Content` | 페이지 본문 래퍼 | children, className |
| `FilterBar` | 필터 입력 영역 | filters, onFilterChange |

---

## Level 3 페이지 템플릿 (templates/)

| 템플릿 | 용도 | 주요 Props |
|--------|------|-----------|
| `ListPageTemplate` | 목록 페이지 (표준) | header, table |
| `FormPageTemplate` | 등록/수정 페이지 | header, sections[], onSubmit, onCancel |

### DataGrid 세컨 패널

목록에서 행 선택 후 상세를 아래 패널로 펼칠 수 있습니다.

- `secondGrid.enabled`: 세컨 패널 사용 여부
- `secondGrid.content`: 패널 내부 컨텐츠 (보통 상세 그리드)
- `secondGrid.title`: 패널 헤더 타이틀
- `secondGrid.defaultOpen`: 초기 오픈 여부
- `secondGrid.height`: 패널 높이(px)
- `secondGrid.isOpen`: 패널 오픈 상태(제어형)
- `secondGrid.onOpenChange`: 패널 오픈 상태 변경 콜백

---

## API 클라이언트 구조 (lib/api/)

```
lib/api/
├── client.ts        # Axios 인스턴스 (인터셉터: 토큰 자동 주입, 401 리프레시)
├── types.ts         # ApiResponse, PaginatedResponse, ApiError
├── auth.ts          # 인증 API (login, logout, refresh, me)
├── endpoints/       # 도메인별 API 함수
│   ├── projects.ts
│   ├── menus.ts
│   └── index.ts
└── index.ts         # 통합 export (api 객체)
```

### 사용 패턴

```typescript
import { api } from '@/lib/api';

// API 호출
const result = await api.projects.list({ page: 1 });
```

---

## 상태 관리 (stores/)

```
stores/
├── auth.store.ts    # 인증 상태 (persist)
├── confirm.store.ts # 전역 Confirm Dialog
├── menu.store.ts    # 메뉴 트리, 즐겨찾기
├── tab.store.ts     # MDI 탭 (persist, sessionStorage)
├── sidebar.store.ts # 사이드바 UI 상태
├── layout.store.ts  # 디바이스 타입 감지
└── index.ts         # 배럴 export
```

---

## Validation 스키마 (lib/validations/)

```
lib/validations/
├── common.ts        # 공통 필드 (requiredString, emailField, phoneField...)
├── auth.ts          # 인증 스키마 (loginSchema)
├── project.ts       # 프로젝트 스키마
└── index.ts
```

### 사용 패턴

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProjectSchema } from '@/lib/validations';

const form = useForm({
  resolver: zodResolver(createProjectSchema),
});
```

---

## React Query 훅 (hooks/queries/)

```
hooks/
├── queries/
│   ├── useProjects.ts  # useProjectList, useProjectDetail, useCreateProject...
│   ├── useMenus.ts     # useMyMenus
│   └── index.ts
├── useAuth.ts          # 인증 헬퍼 훅
├── useOpenTabWithConfirm.ts  # 탭 초과 시 확인 대화상자 (useConfirmStore 연동)
└── index.ts            # 통합 export
```

### 사용 패턴

```typescript
import { useProjectList } from '@/hooks/queries';

const { data, isLoading, error } = useProjectList({ status: 'active' });
```

---

## 타입 정의 (types/)

```
types/
├── menu.ts          # MenuType, AccessType, MenuItem
├── tab.ts           # TabItem, TabStoreState
├── sidebar.ts       # SidebarSection, SidebarState
├── layout.ts        # DeviceType, BREAKPOINTS, LAYOUT_SIZES
└── index.ts
```

### 타입 정의 위치 컨벤션

타입의 **사용 범위**에 따라 정의 위치를 결정합니다:

| 위치 | 용도 | 예시 |
|------|------|------|
| `src/types/` | 도메인/비즈니스 타입 (여러 곳에서 공유) | MenuItem, TabItem, FileNode, SidebarSection |
| `lib/*/types.ts` | 해당 모듈에서만 사용하는 타입 | ApiResponse, AuthState |
| 컴포넌트 파일 내 | 해당 컴포넌트에서만 사용하는 Props | MenuTreeNodeProps, EditorToolbarProps |

#### Decision Tree

```
이 타입이 여러 모듈에서 공유되는가?
    ├─ YES → src/types/ (도메인 타입)
    │
    └─ NO → 특정 기능 모듈에 속하는가?
              ├─ YES → 해당 모듈 내 types.ts (예: lib/api/types.ts)
              │
              └─ NO → 컴포넌트 전용 Props인가?
                        ├─ YES → 컴포넌트 파일 내 inline 정의
                        │
                        └─ NO → src/types/에 추가
```

#### ❌ 지양 패턴

- `types/components.ts` (중앙 집중식 Props 관리)
  - 컴포넌트와 분리되어 동기화 어려움
  - 컴포넌트 삭제 시 타입이 남는 문제 발생

---

## 설치된 라이브러리

| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| @tanstack/react-query | ^5.62.0 | 서버 상태 관리, 캐싱 |
| @tanstack/react-table | ^8.21.3 | 데이터 테이블 |
| @tanstack/react-virtual | ^3.13.18 | 가상 스크롤링 |
| react-hook-form | ^7.54.0 | 폼 상태 관리 |
| @hookform/resolvers | ^3.9.0 | Zod 연동 |
| zod | ^3.24.0 | 스키마 유효성 검증 |
| axios | ^1.7.0 | HTTP 클라이언트 |
| recharts | ^3.6.0 | 차트 |
| xlsx | ^0.18.5 | 엑셀 Export |

---

## shadcn/ui 컴포넌트

| 컴포넌트 | 용도 |
|----------|------|
| button, input | 기본 폼 요소 |
| select, checkbox | 선택 요소 |
| table, card | 데이터 표시 |
| skeleton | 상태 표시 |
| dropdown-menu | 인터랙션 |
| scroll-area | 스크롤 영역 |
| textarea | 텍스트 입력 |

---

## 관련 문서

- [tech-stack.md](tech-stack.md) - 기술 스택
- [tech-decisions.md](tech-decisions.md) - 기술 결정 사항
- [../design/design-system.md](../explanation/design/design-system.md) - 디자인 시스템

---

## Backlog

> 이 영역 관련 개선/추가 예정 항목

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| FES-01 | 에러 바운더리 컴포넌트 표준화 | P2 | 🔲 대기 |
| FES-02 | 폼 컴포넌트 표준 가이드 작성 | P2 | 🔲 대기 |
| FES-03 | 테스트 코드 표준 추가 | P3 | 🔲 대기 |

---

## Changelog

> 이 영역 관련 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-10 | DataGrid 세컨 패널 토글/플로팅 + 제어형 오픈 옵션 추가 |
| 2026-01-30 | Sidebar 구조 통합, 미사용 컴포넌트 정리, 템플릿 통합 |
| 2026-01-22 | 공통/템플릿/훅 구조를 현재 코드 기준으로 정합화 |
| 2026-01-21 | Backlog/Changelog 섹션 추가 |
| 2026-01-20 | 프론트엔드 표준 문서 작성 |