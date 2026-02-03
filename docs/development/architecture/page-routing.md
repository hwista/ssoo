# 페이지 라우팅 (Page Routing)

> 최종 업데이트: 2026-02-02

DMS의 탭 기반 페이지 라우팅 구조를 정의합니다.

---

## 라우팅 개요

DMS는 Next.js App Router를 사용하지만, 실제 페이지 전환은 **탭 기반**으로 동작합니다.

```
URL 경로 → Next.js Route → AppLayout → ContentArea → pageComponents
                                                        ↓
                                                    activeTabId 기반 렌더링
```

---

## 라우트 구조

```
src/app/
├── layout.tsx              # 루트 레이아웃 (Providers)
├── providers.tsx           # 전역 Providers
├── globals.css            # 글로벌 스타일
├── not-found.tsx          # 404 페이지
├── (main)/
│   └── page.tsx           # 메인 페이지 → AppLayout
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
  path: string;            // 탭 경로 (페이지 타입 결정)
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
| 문서 | `doc-{path}` | `/doc/{path}` | ✅ 가능 |

### 탭 → 페이지 매핑

`ContentArea`가 activeTabId를 기반으로 페이지 컴포넌트를 결정합니다:

```typescript
const pageComponents = {
  home: lazy(() => import('@/components/pages/home/HomeDashboardPage')),
  markdown: lazy(() => import('@/components/pages/markdown/MarkdownViewerPage')),
};

function getPageType(tab: TabItem): 'home' | 'markdown' | null {
  if (tab.id === 'home') return 'home';
  if (tab.path.startsWith('/doc/')) return 'markdown';
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
ContentArea에서 탭 경로 분석
    ↓
pageComponents.markdown 렌더링
    ↓
MarkdownViewerPage에서 파일 로드
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
  markdown: lazy(() => import('@/components/pages/markdown/MarkdownViewerPage')
    .then(m => ({ default: m.MarkdownViewerPage }))),
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
| 라우팅 방식 | Next.js + 권한 체크 | 탭 기반 (단일 페이지) |
| 인증 | 미들웨어 + Guard | 없음 |
| URL 동기화 | 필요 | 불필요 (탭만 관리) |
| 페이지 타입 | 다양 (대시보드, 설정...) | 2종 (Home, Markdown) |

---

## 향후 계획

- [ ] URL과 탭 동기화 (브라우저 뒤로가기 지원)
- [ ] 탭 드래그 앤 드롭 순서 변경
- [ ] 탭 그룹 기능

---

## 관련 문서

- [state-management.md](state-management.md) - useTabStore 상세
- [layout-system.md](../design/layout-system.md) - TabBar 컴포넌트
