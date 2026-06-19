# DMS 프론트엔드 표준

> 최종 업데이트: 2026-06-17

DMS 프론트엔드 개발 시 준수해야 할 표준 구조와 패턴을 정의합니다.

---

## 컴포넌트 계층 구조

```
components/
├── ui/              # Primitive adapter - @ssoo/web-ui re-export + low-level UI wrappers
├── common/          # Broadly reusable blocks + DMS domain-common feature modules
├── layout/          # App shell and layout runtime coordinators
├── templates/       # DMS-local page recipe adapters until web-shell promotion
├── pages/           # Feature entrypoints and orchestration
└── index.ts         # 선택적 export 진입점
```

SSOO content-area 내부 페이지 조립의 정본은 [공통 내부 페이지 조립 표준](../../../common/explanation/architecture/content-page-assembly-standard.md)을 따른다. DMS 문서 페이지는 이 표준의 첫 골든 이그잼플이며, `PageTemplate`은 `@ssoo/web-shell` recipe 승격 전 기준 구현이다.

---

## `ui/` Primitive Adapter

`ui/` 는 DMS의 low-level UI adapter 레이어입니다. Button/Badge/Card/Input/Table은 `@ssoo/web-ui`의 thin re-export이며, shadcn 생성 코드나 Radix primitive 래퍼는 아직 공용 primitive로 승격되지 않은 low-level 요소에 한정합니다.

핵심 규칙:

- 스토어/API/page/template 의존 금지
- 스타일/slot/primitive 조합에 집중
- 상위 레이어가 조합해서 쓰는 기초 UI만 제공
- 앱별 Button/Badge/Card/Input/Table variant recipe 재정의 금지
- 선별 기준선에서는 원시 `button`, 일반 `input`, 원시 table 계열 태그 직접 스타일링 금지

대표 컴포넌트:

| 컴포넌트 | 용도 | 기반 |
|----------|------|------|
| `AlertDialog` | 경고 대화상자 | Radix AlertDialog |
| `Badge` | 상태/토큰 표시 | `@ssoo/web-ui` |
| `Button` | 버튼 | `@ssoo/web-ui` |
| `Card` | 카드 컨테이너 | `@ssoo/web-ui` |
| `Dialog` | 모달 대화상자 | Radix Dialog |
| `Divider` | 구분선 | Radix Separator |
| `Dropdown` | 드롭다운 메뉴 | Radix DropdownMenu |
| `Input` | 텍스트/날짜 등 일반 입력 | `@ssoo/web-ui` |
| `ScrollArea` | 스크롤 영역 | Radix ScrollArea |
| `Table` | 데이터 표 구조 | `@ssoo/web-ui` |
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
│   ├── Sidebar.tsx     # SsooSidebarSurface adapter
│   ├── Bookmarks.tsx   # 북마크 섹션
│   ├── OpenTabs.tsx    # 열린 탭 섹션
│   ├── FileTree.tsx    # 파일 트리 섹션
│   └── Changes.tsx     # 변경/복구 상태 섹션
├── tab-instance/
│   └── TabInstanceContext.ts  # keep-alive 탭 인스턴스 식별자 주입
└── index.ts            # 통합 export
```

### 컴포넌트 역할

| 컴포넌트 | 역할 |
|----------|------|
| `AppLayout` | 전체 레이아웃 구성, settings snapshot preload 및 개인 workspace preference 적용 |
| `Header` | 전역 상단 shell 제어 |
| `TabBar` | 탭 목록 표시, 탭 전환/닫기 |
| `ContentArea` | 열린 탭의 keep-alive 렌더링 및 페이지 lazy mount |
| `Sidebar` | `SsooSidebarSurface`에 DMS section 데이터와 action을 주입하는 adapter |
| `FileTree` | `SsooSidebarTree`에 DMS 파일 데이터와 파일 열기/북마크 action을 바인딩 |

사이드바 내부 검색 입력, refresh action, 접이식 section, flat row list, recursive tree row는 `@ssoo/web-shell`의 `SsooSidebar*` primitive를 소비합니다. DMS 로컬 컴포넌트는 문서/파일/북마크 데이터 adapter와 action만 소유합니다.

---

## Settings mode / 설정 surface

DMS settings 는 별도 설정 shell 컴포넌트 세트 없이 같은 frame primitive의 settings mode로 동작하며, 설정 데이터는 `useSettingsStore` snapshot 을 기준으로 읽고 저장합니다.

현재 구조 기준:

- settings snapshot 은 app frame 에서 선로딩되어 workspace / sidebar / viewer 기본 선호값과 자연스럽게 연결됩니다.
- settings sidebar/header/tabbar/content는 새 shell 컴포넌트 세트가 아니라 기존 `Sidebar`, `Header`, `TabBar`, `ContentArea` slot을 유지한 상태에서 variant/data 주입으로 전환됩니다.
- settings sidebar는 메뉴 데이터와 검색 대상만 다르고, collapse toggle, collapsed hover reveal, refresh action, section expand/collapse, tree group expand/collapse는 workspace sidebar와 같은 `SsooSidebarSurface`/`SsooSidebarTree` 동작을 사용합니다. 검색 결과 section과 설정 메뉴 section 조립은 `@ssoo/web-shell`의 `createSsooSettingsSidebarSections`를 소비합니다.
- settings section navigation은 settings sidebar 메뉴 트리가 시작점이고, 클릭된 section은 기존 `TabBar`의 settings tab으로 열립니다. `SettingsPage` 본문은 현재 section content와 `PageTemplate`의 `leftSubContentSlot` 내부 색인만 소유합니다.
- settings mode가 활성화된 동안 active content tab은 settings tab path여야 합니다. `AppLayout`과 settings navigation store는 active tab과 settings mode를 동기화하고, `ContentArea`는 공용 MDI의 active-tab 규칙에 따라 현재 active settings tab을 렌더링합니다.
- structured settings registry 는 `settingsPageConfig.ts` 를 정본으로 사용합니다.
- system settings surface 는 `documentAccess`, `git`, `storage`, `ingest`, `templates-runtime`, `uploads`, `search`, `docAssist`, `extraction`, `templates`, `external-settings` 를 다룹니다.
- personal settings surface 는 `identity`, `workspace`, `viewer`, `sidebar` 를 다룹니다.
- Microsoft 365 / Teams / SSO 의 조직 정책과 secret/token/certificate 는 Admin/Auth/Organization 또는 AI/Common control plane 책임입니다. DMS는 문서 도메인 storage/ingest/drop mapping 처럼 DMS에 직접 필요한 provider 사용 정책만 다룹니다.

### 선별 UI 기준선

- `components/pages/access-requests/**`
- `components/pages/settings/**`
- settings JSON field row

위 기준선은 확정 화면으로 취급하며 Button/Badge/Card/Input/Table을 DMS `components/ui/*` 어댑터로 소비합니다. `.github/scripts/check-design.js`의 `selected-web-ui-primitives` rule이 원시 `button`, 일반 `input`, 원시 `table/thead/tbody/tr/th/td` 사용을 오류로 검증합니다. 체크박스/라디오/file/hidden input은 전용 primitive 승격 전까지 예외 범위입니다.

---

## `templates/` Page Frame

`templates/` 는 page 를 구현할 때 반복되는 구조 패턴을 제공하는 DMS-local adapter 레이어입니다. 현재는 `PageTemplate` 와 `templates/page-frame/*` 이 핵심 축이며, breadcrumb/header/content/sidecar frame 을 일관되게 제공합니다.

현재 해석 기준:

- `templates` 는 page 직전 레이어이지만, 도메인 중립 recipe는 `@ssoo/web-shell` 승격 대상
- 순수 마크업 템플릿보다는 `stateful page frame` 에 가깝지만, 개별 page 비즈니스 로직을 흡수하는 레이어는 아님
- DMS `PageTemplate`의 neutral composition, content surface, sidecar lane, page state surface는 `@ssoo/web-shell`의 `SsooContentPageTemplate`으로 이전
- DMS에 남는 것은 breadcrumb path/icon adapter, domain header action adapter, document body/sidecar/custom slot

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
| 템플릿 컴포넌트 | ListPageTemplate, FormPageTemplate | PageTemplate 기준 구현, web-shell recipe 승격 대상 |

---

## 관련 문서

- [state-management.md](state-management.md) - 상태 관리 상세
- [utilities.md](utilities.md) - 유틸리티 함수
- [component-hierarchy.md](../design/component-hierarchy.md) - 컴포넌트 계층 상세
- [공통 내부 페이지 조립 표준](../../../common/explanation/architecture/content-page-assembly-standard.md) - content-area 내부 페이지 recipe/material 경계

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-06-17 | DMS PageTemplate을 web-shell recipe 승격 전 기준 구현으로 정리하고 settings surface 범위와 Microsoft/Admin 경계를 최신 기준으로 보정 |
| 2026-06-15 | settings mode shell과 active content tab이 불일치해 문서 pane/panel이 설정 화면에 남는 상태를 차단하는 frontend invariant를 명시 |
| 2026-06-15 | settings sidebar의 refresh/collapse/tree expand 동작을 workspace sidebar와 같은 공용 surface 계약으로 명시 |
| 2026-06-15 | settings mode 기준을 기존 `Sidebar`/`Header`/`TabBar`/`ContentArea` 슬롯 유지와 settings sidebar 메뉴 트리 + settings tab path 구조로 보정 |
| 2026-03-11 | `ui/layout/templates/pages` 기준으로 레이어 정의 재정렬, `common` 혼합 레이어 상태 명시 |
| 2026-02-24 | Codex 품질 게이트 엄격 모드 적용에 맞춰 문서 메타 섹션 보강 |
