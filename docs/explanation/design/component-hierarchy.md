# 컴포넌트 계층

> 최종 업데이트: 2026-02-02

DMS 컴포넌트의 계층 구조와 의존성을 정의합니다.

---

## 계층 개요

```
Level 1: UI (Primitive)
    ↓
Level 2: Common (Composite)
    ↓
Level 3: Layout / Pages (Feature)
```

---

## Level 1: UI 컴포넌트

**원자(Atom)** 수준의 기본 UI 요소

### 위치

```
src/components/ui/
```

### 컴포넌트 목록

| 컴포넌트 | 기반 | 용도 |
|----------|------|------|
| `Button` | Radix Slot | 버튼 |
| `AlertDialog` | Radix AlertDialog | 경고 대화상자 |
| `Dialog` | Radix Dialog | 모달 대화상자 |
| `Dropdown` | Radix DropdownMenu | 드롭다운 메뉴 |
| `ScrollArea` | Radix ScrollArea | 스크롤 영역 |
| `Tooltip` | Radix Tooltip | 툴팁 |
| `Card` | div | 카드 컨테이너 |
| `Divider` | Radix Separator | 구분선 |

### 규칙

- 외부 라이브러리(Radix UI)만 의존
- 스토어/API 호출 금지
- props로만 동작 제어
- 재사용 가능한 순수 컴포넌트

---

## Level 2: Common 컴포넌트

**분자(Molecule)** 수준의 조합 컴포넌트

### 위치

```
src/components/common/
```

### 컴포넌트 목록

| 컴포넌트 | 의존성 | 용도 |
|----------|--------|------|
| `ConfirmDialog` | AlertDialog, useConfirmStore | 전역 확인 대화상자 |
| `LoadingState` | - | 로딩 표시 |
| `ErrorState` | Button | 에러 표시 |
| `EmptyState` | - | 빈 상태 표시 |

### 의존성 다이어그램

```
ConfirmDialog
    ├── ui/AlertDialog
    └── stores/confirm.store

StateDisplay
    ├── LoadingState
    ├── ErrorState
    │   └── ui/Button
    └── EmptyState
```

### 규칙

- Level 1 UI 컴포넌트만 사용
- 스토어 사용 가능 (단, 특정 스토어에만 의존)
- 비즈니스 로직 없음

---

## Level 3: Layout 컴포넌트

**유기체(Organism)** 수준의 레이아웃 컴포넌트

### 위치

```
src/components/layout/
```

### 컴포넌트 계층

```
AppLayout
├── Sidebar
│   ├── Section
│   ├── Bookmarks
│   │   └── 파일 스토어 의존
│   ├── OpenTabs
│   │   └── 탭 스토어 의존
│   ├── FileTree
│   │   └── 파일 스토어 의존
│   └── Search
│       └── 사이드바 스토어 의존
├── Header
│   └── 레이아웃 스토어 의존
├── TabBar
│   └── 탭 스토어 의존
└── ContentArea
    └── 탭 스토어 의존
        └── Pages (lazy load)
```

### 스토어 의존성

| 컴포넌트 | 스토어 |
|----------|--------|
| `AppLayout` | useLayoutStore, useSidebarStore |
| `Header` | useLayoutStore, useTabStore |
| `Sidebar` | useSidebarStore |
| `TabBar` | useTabStore |
| `ContentArea` | useTabStore |
| `FileTree` | useFileStore, useSidebarStore |
| `Bookmarks` | useFileStore |
| `OpenTabs` | useTabStore |
| `Search` | useSidebarStore |

---

## Level 3: Page 컴포넌트

**페이지(Template)** 수준의 비즈니스 컴포넌트

### 위치

```
src/components/pages/
├── home/
│   └── HomeDashboardPage.tsx
└── markdown/
    └── MarkdownViewerPage.tsx
```

### 페이지 구조

```
HomeDashboardPage
└── 대시보드 콘텐츠

MarkdownViewerPage
├── useEditorStore
├── useTabStore
└── Tiptap Editor
```

### 규칙

- `ContentArea`에서 lazy import
- 자체적으로 데이터 로드
- 스토어 자유롭게 사용
- 비즈니스 로직 포함

---

## 의존성 규칙

### 허용되는 의존성

```
Level 3 → Level 2 → Level 1
Level 3 → stores/
Level 2 → stores/ (제한적)
Level 1 → 외부 라이브러리만
```

### 금지되는 의존성

```
Level 1 → stores/
Level 1 → Level 2
Level 2 → Level 3
```

### 순환 의존성 방지

- 스토어 간 직접 참조 금지
- 컴포넌트 간 순환 import 금지

---

## Import 패턴

### Level 1 (UI)

```typescript
// button.tsx
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
```

### Level 2 (Common)

```typescript
// ConfirmDialog.tsx
import { AlertDialog } from '@/components/ui/alert-dialog';
import { useConfirmStore } from '@/stores';
```

### Level 3 (Layout)

```typescript
// AppLayout.tsx
import { useLayoutStore, useSidebarStore } from '@/stores';
import { Sidebar } from './sidebar';
import { Header } from './Header';
```

### Level 3 (Pages)

```typescript
// MarkdownViewerPage.tsx
import { useEditorStore, useTabStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/common/StateDisplay';
```

---

## 폴더 구조 요약

```
components/
├── ui/                 # Level 1 - Radix UI 기반
│   ├── button.tsx
│   ├── alert-dialog.tsx
│   └── ...
├── common/             # Level 2 - 재사용 가능 조합
│   ├── ConfirmDialog.tsx
│   ├── StateDisplay.tsx
│   └── index.ts
├── layout/             # Level 3 - 앱 레이아웃
│   ├── AppLayout.tsx
│   ├── Header.tsx
│   ├── TabBar.tsx
│   ├── ContentArea.tsx
│   ├── sidebar/
│   └── index.ts
└── pages/              # Level 3 - 비즈니스 페이지
    ├── home/
    └── markdown/
```

---

## 관련 문서

- [frontend-standards.md](../architecture/frontend-standards.md) - 코딩 표준
- [ui-components.md](ui-components.md) - UI 컴포넌트 상세
- [layout-system.md](layout-system.md) - 레이아웃 상세
