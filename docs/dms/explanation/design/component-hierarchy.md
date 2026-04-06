# 컴포넌트 계층

> 최종 업데이트: 2026-03-11

DMS 컴포넌트의 계층 구조와 의존성을 정의합니다.

---

## 계층 개요

```
Level 1: ui (Primitive adapter)
    ↓
Level 2: common (Reusable / mixed)
    ↓
Level 3: templates (Page frame)
    ↓
Level 4: pages (Feature entry)

layout is a shell/runtime lane that spans across page rendering.
```

---

## `ui/`

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

## `common/`

`common/` 은 현재 아래 두 하위 성격이 혼재한 레이어입니다.

- `pure common`
- `domain-common feature modules`

### 대표 예시

| 하위 성격 | 예시 |
|----------|------|
| `pure common` | `StateDisplay`, `ConfirmDialog`, `common/search/*` |
| `domain-common feature` | `common/editor/*`, `common/viewer/*`, `common/assistant/*` |

### 규칙

- `pure common` 만 엄격한 저결합 공통 컴포넌트로 봄
- `templates/page-frame/*` 는 template 쪽 building block 레이어로 별도 분리됨
- `common/editor|viewer|assistant` 는 DMS 도메인 재사용 모듈로 보고, 1차 단계에서는 이동보다 내부 책임 분리를 우선

---

## `layout/`

앱 전역 shell 과 keep-alive 탭 렌더링을 담당하는 lane 입니다.

### 위치

```
src/components/layout/
```

### 컴포넌트 계층

```
AppLayout
├── Sidebar
│   ├── Section
│   ├── FlatList
│   ├── Bookmarks
│   │   ├── FlatListItem
│   │   └── 파일 스토어 의존
│   ├── OpenTabs
│   │   ├── FlatListItem
│   │   └── 탭 스토어 의존
│   ├── FileTree
│   │   └── 파일 스토어 의존
│   └── Search
│       └── 사이드바 스토어 의존
├── Header
│   └── 전역 shell 제어
├── TabBar
│   └── 탭 스토어 의존
└── ContentArea
    ├── 탭 스토어 의존
    ├── keep-alive 렌더링
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

- `FlatList`, `FlatListItem` 은 store를 직접 가지지 않는 layout primitive이며, sidebar row rhythm을 settings navigation과도 공유합니다.

---

## `templates/`

`templates` 는 page 구현을 위한 공통 frame 레이어입니다.

대표 엔트리:

- `PageTemplate`

역할:

- breadcrumb/header/content/sidecar 패턴 제공
- page 외형과 프레임 일관성 유지
- page 비즈니스 로직은 알지 않음

---

## `pages/`

실제 기능 진입점과 orchestration 레이어입니다.

### 위치

```
src/components/pages/
├── home/
│   └── DashboardPage.tsx
├── markdown/
│   └── DocumentPage.tsx
├── ai/
│   ├── ChatPage.tsx
│   └── SearchPage.tsx
└── settings/
    └── SettingsPage.tsx
```

### 페이지 구조

```
DashboardPage
└── 대시보드 콘텐츠

DocumentPage
├── useEditorStore
├── useTabStore
├── PageTemplate
└── editor/viewer orchestration
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
pages → templates → common → ui
pages → stores/
templates → common/ui/stores(프레임 상태 한정)
common → stores/ (제한적, 현재 혼합 상태 허용)
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
// DocumentPage.tsx
import { useEditorStore, useTabStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/common/StateDisplay';
```

---

## 폴더 구조 요약

```
components/
├── ui/                 # Primitive adapter
│   ├── button.tsx
│   ├── alert-dialog.tsx
│   └── ...
├── common/             # Mixed reusable layer
│   ├── ConfirmDialog.tsx
│   ├── StateDisplay.tsx
│   └── index.ts
├── layout/             # App shell / runtime coordinator
│   ├── AppLayout.tsx
│   ├── Header.tsx
│   ├── TabBar.tsx
│   ├── ContentArea.tsx
│   ├── sidebar/
│   └── index.ts
├── templates/          # Page frame
│   └── PageTemplate.tsx
└── pages/              # Feature pages
    ├── home/
    ├── markdown/
    ├── ai/
    └── settings/
```

---

## 관련 문서

- [frontend-standards.md](../architecture/frontend-standards.md) - 코딩 표준
- [ui-components.md](ui-components.md) - UI 컴포넌트 상세
- [layout-system.md](layout-system.md) - 레이아웃 상세

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-03-11 | `ui/common/layout/templates/pages` 재해석 기준 반영, `common` 혼합 레이어 상태 명시 |
| 2026-02-24 | Codex 품질 게이트 엄격 모드 적용에 맞춰 문서 메타 섹션 보강 |
