# DMS 프론트엔드 표준

> 최종 업데이트: 2026-03-11

DMS 프론트엔드 개발 시 준수해야 할 표준 구조와 패턴을 정의합니다.

---

## 컴포넌트 계층 구조

```
components/
├── ui/              # Primitive adapter - low-level UI wrappers
├── common/          # Broadly reusable blocks + domain-common feature modules
├── layout/          # App shell and layout runtime coordinators
├── templates/       # Reusable page frames/patterns
├── pages/           # Feature entrypoints and orchestration
└── index.ts         # 선택적 export 진입점
```

---

## `ui/` Primitive Adapter

`ui/` 는 DMS의 low-level UI adapter 레이어입니다. shadcn 생성 코드, Radix primitive 래퍼, 프로젝트 스타일 래퍼가 함께 포함될 수 있지만, 역할은 일관됩니다.

핵심 규칙:

- 스토어/API/page/template 의존 금지
- 스타일/slot/primitive 조합에 집중
- 상위 레이어가 조합해서 쓰는 기초 UI만 제공

대표 컴포넌트:

| 컴포넌트 | 용도 | 기반 |
|----------|------|------|
| `AlertDialog` | 경고 대화상자 | Radix AlertDialog |
| `Button` | 버튼 | Radix Slot |
| `Card` | 카드 컨테이너 | div |
| `Dialog` | 모달 대화상자 | Radix Dialog |
| `Divider` | 구분선 | Radix Separator |
| `Dropdown` | 드롭다운 메뉴 | Radix DropdownMenu |
| `ScrollArea` | 스크롤 영역 | Radix ScrollArea |
| `Tooltip` | 툴팁 | Radix Tooltip |

---

## `common/` Mixed Reusable Layer

`common/` 은 현재 단일 성격의 레이어가 아닙니다. 2026-03 기준으로 아래 두 하위 성격이 함께 존재합니다.

- `pure common`
  - 예: `StateDisplay`, `ConfirmDialog`, `common/search/*`
- `domain-common feature modules`
  - 예: `common/editor/*`, `common/viewer/*`, `common/assistant/*`

즉 `common/` 을 "비즈니스 로직 없는 공통 조합만 담는 폴더"로 단정하면 현재 구조를 잘못 설명하게 됩니다. 현재는 broad reusable UI와 DMS 도메인 공통 기능 모듈이 함께 존재하며, template-facing frame 부품은 `templates/page-frame/*` 로 분리되었습니다.

---

## `layout/` App Shell

### 폴더 구조

```
layout/
├── AppLayout.tsx       # 메인 앱 레이아웃
├── Header.tsx          # 상단 헤더
├── TabBar.tsx          # 탭 바
├── ContentArea.tsx     # keep-alive 탭 렌더링 coordinator
├── sidebar/
│   ├── Sidebar.tsx     # 사이드바 컨테이너
│   ├── Section.tsx     # 접이식 섹션
│   ├── Bookmarks.tsx   # 북마크 섹션
│   ├── OpenTabs.tsx    # 열린 탭 섹션
│   ├── FileTree.tsx    # 파일 트리 섹션
│   └── Search.tsx      # 검색 섹션
├── tab-instance/
│   └── TabInstanceContext.ts  # keep-alive 탭 인스턴스 식별자 주입
└── index.ts            # 통합 export
```

### 컴포넌트 역할

| 컴포넌트 | 역할 |
|----------|------|
| `AppLayout` | 전체 레이아웃 구성, 컴팩트 모드 관리 |
| `Header` | 전역 상단 shell 제어 |
| `TabBar` | 탭 목록 표시, 탭 전환/닫기 |
| `ContentArea` | 열린 탭의 keep-alive 렌더링 및 페이지 lazy mount |
| `Sidebar` | 사이드바 컨테이너, 리사이즈 |
| `FileTree` | 파일 시스템 트리 표시, 파일 열기 |

---

## `templates/` Page Frame

`templates/` 는 page 를 구현할 때 반복되는 구조 패턴을 제공하는 레이어입니다. 현재는 `PageTemplate` 와 `templates/page-frame/*` 이 핵심 축이며, breadcrumb/header/content/sidecar frame 을 일관되게 제공합니다.

현재 해석 기준:

- `templates` 는 page 직전 레이어
- 순수 마크업 템플릿보다는 `stateful page frame` 에 가깝지만, 개별 page 비즈니스 로직을 흡수하는 레이어는 아님
- 이후 구조 정리에서도 유지 및 강화 대상

---

## `pages/` Feature Entrypoints

### 폴더 구조

```
pages/
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

### 네이밍 규칙

- **파일명:** `{Feature}Page.tsx`
- **예외:** 없음. App Router의 `page.tsx` 와 혼동되지 않도록 feature page도 명시적 이름을 유지
- **export:** Named export 우선

```typescript
// DocumentPage.tsx
export function DocumentPage() { ... }
```

---

## 훅 (hooks/)

### 폴더 구조

```
hooks/
├── useOpenTabWithConfirm.ts  # 탭 초과 확인 훅
├── useOpenDocumentTab.ts     # 문서 탭 열기 훅
└── index.ts                  # 통합 export
```

### 훅 목록

| 훅 | 용도 | 반환값 |
|----|------|-------|
| `useOpenTabWithConfirm` | 탭 열기 + 초과 확인 | openTab 함수 |
| `useOpenDocumentTab` | 문서 탭 열기 | openDocumentTab 함수 |

---

## 네이밍 규칙

### 파일명

| 유형 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `FileTree.tsx` |
| 훅 | camelCase (use 접두사) | `useOpenTabWithConfirm.ts` |
| 유틸리티 | camelCase | `pathUtils.ts` |
| 스토어 | kebab-case (store 접미사) | `tab.store.ts` |
| 타입 | camelCase/index | `tab.ts`, `index.ts` |

### 함수/변수명

| 유형 | 규칙 | 예시 |
|------|------|------|
| 함수 | camelCase | `handleClick`, `openTab` |
| 상수 | SCREAMING_SNAKE_CASE | `HOME_TAB`, `MAX_TABS` |
| 타입 | PascalCase | `TabItem`, `FileNode` |
| 인터페이스 | PascalCase | `SidebarStore` |

---

## Import 순서

```typescript
// 1. React/외부 라이브러리
import * as React from 'react';
import { useState, useEffect } from 'react';
import { create } from 'zustand';

// 2. 내부 alias (@/)
import { useTabStore } from '@/stores';
import { cn } from '@/lib/utils';
import type { TabItem } from '@/types';

// 3. 상대 경로 (같은 폴더)
import { Section } from './Section';
```

---

## Props 패턴

### 기본 패턴

```typescript
interface FileTreeProps {
  className?: string;
  onSelect?: (path: string) => void;
}

export function FileTree({ className, onSelect }: FileTreeProps) {
  return (
    <div className={cn('file-tree', className)}>
      ...
    </div>
  );
}
```

### Children 패턴

```typescript
interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}
```

### Polymorphic 패턴

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}
```

---

## PMS 대비 차이점

| 항목 | PMS | DMS |
|------|-----|-----|
| UI 라이브러리 | shadcn/ui | Radix UI 직접 사용 |
| API 클라이언트 | Axios + 인터셉터 | fetch + 로컬 API |
| 상태 관리 | Zustand + React Query | Zustand only |
| 폼 검증 | 별도 폼/스키마 라이브러리 미사용 | 현재는 수기 검증/도메인별 validation helper 중심 |
| 템플릿 컴포넌트 | ListPageTemplate, FormPageTemplate | 없음 (단일 페이지 타입) |

---

## 관련 문서

- [state-management.md](state-management.md) - 상태 관리 상세
- [utilities.md](utilities.md) - 유틸리티 함수
- [component-hierarchy.md](../design/component-hierarchy.md) - 컴포넌트 계층 상세

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-03-11 | `ui/layout/templates/pages` 기준으로 레이어 정의 재정렬, `common` 혼합 레이어 상태 명시 |
| 2026-02-24 | Codex 품질 게이트 엄격 모드 적용에 맞춰 문서 메타 섹션 보강 |
