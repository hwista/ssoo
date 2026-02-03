# DMS 프론트엔드 표준

> 최종 업데이트: 2026-02-02

DMS 프론트엔드 개발 시 준수해야 할 표준 구조와 패턴을 정의합니다.

---

## 컴포넌트 계층 구조

```
components/
├── ui/              # Level 1 - Primitive (원자) - Radix UI 기반
├── common/          # Level 2 - Composite (분자) - 재사용 가능한 조합
├── layout/          # App Layout - Header, Sidebar, TabBar, ContentArea
├── pages/           # 비즈니스 페이지 컴포넌트
└── index.ts         # 통합 export (선택적)
```

---

## Level 1 UI 컴포넌트 (ui/)

Radix UI 기반 primitive 컴포넌트:

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

## Level 2 공통 컴포넌트 (common/)

### 폴더 구조

```
common/
├── ConfirmDialog.tsx   # 전역 Confirm Dialog (useConfirmStore 연동)
├── StateDisplay.tsx    # LoadingState, ErrorState, EmptyState 통합
└── index.ts            # 통합 export
```

### 컴포넌트 목록

| 컴포넌트 | 용도 | Props |
|----------|------|-------|
| `ConfirmDialog` | 전역 확인 대화상자 | useConfirmStore 연동 |
| `LoadingState` | 로딩 표시 | message, fullHeight |
| `ErrorState` | 에러 표시 | message, onRetry |
| `EmptyState` | 빈 상태 표시 | message, icon |

---

## 레이아웃 컴포넌트 (layout/)

### 폴더 구조

```
layout/
├── AppLayout.tsx       # 메인 앱 레이아웃
├── Header.tsx          # 상단 헤더
├── TabBar.tsx          # 탭 바
├── ContentArea.tsx     # 콘텐츠 영역 (탭 기반 페이지 렌더링)
├── sidebar/
│   ├── Sidebar.tsx     # 사이드바 컨테이너
│   ├── Section.tsx     # 접이식 섹션
│   ├── Bookmarks.tsx   # 북마크 섹션
│   ├── OpenTabs.tsx    # 열린 탭 섹션
│   ├── FileTree.tsx    # 파일 트리 섹션
│   └── Search.tsx      # 검색 섹션
└── index.ts            # 통합 export
```

### 컴포넌트 역할

| 컴포넌트 | 역할 |
|----------|------|
| `AppLayout` | 전체 레이아웃 구성, 컴팩트 모드 관리 |
| `Header` | 문서 타입 선택, AI 검색 타입 선택 |
| `TabBar` | 탭 목록 표시, 탭 전환/닫기 |
| `ContentArea` | activeTabId에 따른 페이지 렌더링 |
| `Sidebar` | 사이드바 컨테이너, 리사이즈 |
| `FileTree` | 파일 시스템 트리 표시, 파일 열기 |

---

## 페이지 컴포넌트 (pages/)

### 폴더 구조

```
pages/
├── home/
│   └── HomeDashboardPage.tsx    # 홈 대시보드
└── markdown/
    └── MarkdownViewerPage.tsx   # 마크다운 뷰어/에디터
```

### 네이밍 규칙

- **파일명:** `{Feature}Page.tsx`
- **컴포넌트명:** `{Feature}Page`
- **export:** Named export (lazy import 호환)

```typescript
// MarkdownViewerPage.tsx
export function MarkdownViewerPage() { ... }
```

---

## 훅 (hooks/)

### 폴더 구조

```
hooks/
├── useEditor.ts              # 에디터 관련 훅
├── useOpenTabWithConfirm.ts  # 탭 초과 확인 훅
└── index.ts                  # 통합 export
```

### 훅 목록

| 훅 | 용도 | 반환값 |
|----|------|-------|
| `useEditor` | 에디터 상태 관리 | isEditing, toggleEdit, save |
| `useOpenTabWithConfirm` | 탭 열기 + 초과 확인 | openTab 함수 |

---

## 네이밍 규칙

### 파일명

| 유형 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `FileTree.tsx` |
| 훅 | camelCase (use 접두사) | `useEditor.ts` |
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
| 폼 검증 | Zod + react-hook-form | 없음 (단순 입력) |
| 템플릿 컴포넌트 | ListPageTemplate, FormPageTemplate | 없음 (단일 페이지 타입) |

---

## 관련 문서

- [state-management.md](state-management.md) - 상태 관리 상세
- [utilities.md](utilities.md) - 유틸리티 함수
- [component-hierarchy.md](../design/component-hierarchy.md) - 컴포넌트 계층 상세
