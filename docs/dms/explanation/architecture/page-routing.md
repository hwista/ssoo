# 페이지 라우팅 (Page Routing)

> 최종 업데이트: 2026-03-10

DMS의 탭 기반 페이지 라우팅 구조를 정의합니다.

---

## 라우팅 개요

DMS는 Next.js App Router를 사용하지만, 브라우저 공개 진입점은 `/` 하나만 사용하고 실제 화면 전환은 **탭 기반**으로 동작합니다.

- 브라우저 공개 URL: `/`
- 내부 탭 경로: `/home`, `/doc/...`, `/wiki/new`, `/ai/ask`, `/ai/search`, `/settings`
- 정책: 내부 탭 경로는 주소창에 직접 노출하거나 딥링크로 사용하는 대상이 아니다.

```
URL 경로 → Next.js Route → AppLayout → ContentArea → pageComponents
                                                        ↓
                                                    activeTabId 기반 렌더링
```

브라우저에서 `/doc/...` 같은 경로로 직접 들어오면 [`src/middleware.ts`](/home/a0122024330/src/ssoo/apps/web/dms/src/middleware.ts) 가 이를 내부 virtual path 로 간주하고 `/` 루트 셸로 복구한다.

---

## 라우트 구조

```
src/app/
├── layout.tsx              # 루트 레이아웃 (Providers)
├── providers.tsx           # 전역 Providers
├── globals.css            # 글로벌 스타일
├── not-found.tsx          # 예외적 404 발생 시 루트 복구
├── (main)/
│   └── page.tsx           # 루트 페이지(/) → AppLayout
└── api/
    ├── file/
    │   └── route.ts       # 파일 CRUD API
    └── files/
        └── route.ts       # 파일 트리 조회 API
```

---

## 탭 시스템

### 탭 타입

```typescript
interface TabItem {
  id: string;              // 탭 고유 ID
  title: string;           // 탭 제목
  path: string;            // 내부 탭 경로 (브라우저 공개 URL 아님)
  icon?: string;           // 아이콘 이름
  closable: boolean;       // 닫기 가능 여부
  openedAt: Date;          // 열린 시각
  lastActiveAt: Date;      // 마지막 활성화 시각
}
```

### 특수 탭

| 탭 | ID | 경로 | 닫기 가능 |
|----|----|------|----------|
| Home | `home` | `/home` | ❌ 불가 |
| 문서 | `file-{path}` | `/doc/{path}` | ✅ 가능 |
| 새 문서 | 상황별 생성 | `/wiki/new` | ✅ 가능 |
| AI 검색 | 상황별 생성 | `/ai/search` | ✅ 가능 |
| 설정 | `settings` 계열 | `/settings` | ✅ 가능 |

### 탭 → 페이지 매핑

`ContentArea`가 activeTabId와 내부 탭 경로를 기반으로 페이지 컴포넌트를 결정합니다:

```typescript
const pageComponents = {
  home: lazy(() => import('@/components/pages/home/HomeDashboardPage')),
  markdown: lazy(() => import('@/components/pages/markdown/ViewerPage')),
  aiAsk: lazy(() => import('@/components/pages/ai/AskPage')),
  aiSearch: lazy(() => import('@/components/pages/ai/SearchPage')),
  settings: lazy(() => import('@/components/pages/settings/Page')),
};

function getPageType(tab: TabItem): 'home' | 'markdown' | 'aiAsk' | 'aiSearch' | 'settings' | null {
  if (tab.id === 'home') return 'home';
  if (tab.path.startsWith('/doc/')) return 'markdown';
  if (tab.path === '/wiki/new') return 'markdown';
  if (tab.path.startsWith('/ai/ask')) return 'aiAsk';
  if (tab.path.startsWith('/ai/search')) return 'aiSearch';
  if (tab.path === '/settings') return 'settings';
  return null;
}
```

---

## 탭 동작

### 탭 열기

```typescript
const { openTab } = useTabStore();

// 문서 탭 열기
openTab({
  id: `doc-${filePath}`,
  title: fileName,
  path: `/doc/${filePath}`,
  icon: 'FileText',
  closable: true,
  activate: true,
});
```

### 탭 제한

- **최대 탭 수:** 16개
- 초과 시 확인 다이얼로그 표시
- 가장 오래된 탭 자동 닫기 옵션

### 탭 닫기 규칙

1. Home 탭은 닫기 불가
2. 활성 탭 닫기 시 → 인접 탭 활성화
3. 모든 탭 닫기 → Home 탭만 남음

---

## 네비게이션 흐름

### 파일 트리에서 문서 열기

```
FileTree 클릭
    ↓
useOpenTabWithConfirm 훅 호출
    ↓
탭 수 확인 (16개 이하?)
    ├─ Yes → openTab() 호출
    └─ No → confirm() 다이얼로그
              ├─ 확인 → closeOldestTab() + openTab()
              └─ 취소 → 무시
    ↓
ContentArea에서 내부 탭 경로 분석
    ↓
pageComponents.markdown 렌더링
    ↓
ViewerPage에서 파일 로드
```

### 북마크에서 문서 열기

```
Bookmarks 클릭
    ↓
동일 흐름
```

---

## 코드 분할

각 페이지 컴포넌트는 `React.lazy`로 동적 import:

```typescript
const pageComponents = {
  home: lazy(() => import('@/components/pages/home/HomeDashboardPage')
    .then(m => ({ default: m.HomeDashboardPage }))),
  markdown: lazy(() => import('@/components/pages/markdown/ViewerPage')
    .then(m => ({ default: m.ViewerPage }))),
};
```

**장점:**
- 초기 로딩 최적화
- 필요한 페이지만 로드
- Suspense로 로딩 상태 처리

---

## PMS 대비 차이점

| 항목 | PMS | DMS |
|------|-----|-----|
| 라우팅 방식 | Next.js + 권한 체크 | 루트 고정 + 탭 기반 단일 셸 |
| 인증 | 미들웨어 + Guard | 없음 |
| URL 동기화 | 필요 | 불필요 (내부 탭 경로만 관리) |
| 페이지 타입 | 다양 (대시보드, 설정...) | Home, Markdown, AI, Settings |

---

## 미들웨어 정책

- 목적: 공개 URL을 `/` 하나로 고정
- 허용: `/`
- 제외: `/api`, `/_next`, 정적 파일
- 직접 접근 차단 대상: `/doc/...`, `/wiki/new`, `/ai/...`, `/settings`

이 정책은 인증/권한 미들웨어가 아니라 “주소창 루트 고정” 정책이다. 향후 실제 공개 URL 기반 딥링크를 허용할 시점에는 이 정책을 제거하거나 허용 경로 기반으로 재설계해야 한다.

---

## 향후 계획

- [ ] URL과 탭 동기화 (브라우저 뒤로가기 지원)
- [ ] 탭 드래그 앤 드롭 순서 변경
- [ ] 탭 그룹 기능

---

## 관련 문서

- [state-management.md](state-management.md) - useTabStore 상세
- [layout-system.md](../design/layout-system.md) - TabBar 컴포넌트

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-03-10 | 루트 고정 라우팅 정책과 내부 탭 경로 개념을 현재 구현 기준으로 정리 |
| 2026-02-24 | Codex 품질 게이트 엄격 모드 적용에 맞춰 문서 메타 섹션 보강 |
