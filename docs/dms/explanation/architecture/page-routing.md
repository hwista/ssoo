# 페이지 라우팅 (Page Routing)

> 최종 업데이트: 2026-06-16

DMS의 탭 기반 라우팅과 설정 모드 구조를 정의합니다.

---

## 라우팅 개요

DMS는 Next.js App Router를 사용하지만, 브라우저 공개 진입점은 **`/`, `/login`, `/password-reset`** 만 사용하고 실제 업무 화면 전환은 **workspace 탭 frame** 안에서 처리합니다.

- 브라우저 공개 URL: `/`, `/login`, `/password-reset`
- 내부 탭 경로: `/home`, `/doc/...`, `/doc/new*`, `/ai/chat`, `/ai/search`
- 정책: 내부 탭 경로는 주소창에 직접 노출하거나 딥링크로 사용하는 대상이 아니다.
- `/settings` 는 현재 기준의 workspace 탭 경로가 아니라, stale session/tab migration 을 위한 legacy handoff 경로다.

``` 
URL 경로 → Next.js Route → (main)/layout → (main)/page → AppLayout
                                                               └─ Header + Sidebar + TabBar + ContentArea
                                                                  ├─ workspace mode → ContentArea tabs
                                                                  └─ settings mode → settings tab paths + SettingsPage
```

브라우저에서 `/doc/...` 같은 경로로 직접 들어오면 [`src/middleware.ts`](/home/a0122024330/src/ssoo/apps/web/dms/src/middleware.ts) 가 이를 내부 virtual path 로 간주하고 `/` 루트 셸로 복구한다.

---

## entry contract

| 경로 | 의미 | 담당 파일 |
|------|------|----------|
| `/login` | public 로그인 진입점 | `app/(auth)/login/page.tsx` |
| `/password-reset` | public 비밀번호 찾기 진입점 | `app/(auth)/password-reset/page.tsx` |
| `/` | 인증된 DMS 루트 shell | `app/(main)/layout.tsx`, `app/(main)/page.tsx` |
| 그 외 브라우저 경로 | 내부 virtual path 로 간주하고 `/` 로 복구 | `middleware.ts`, `app/not-found.tsx` |

라우트 상수는 `src/lib/constants/routes.ts` 에서 `APP_HOME_PATH`, `LOGIN_PATH`, `ROOT_ENTRY_PATHS` 로 관리한다.

---

## 라우트 구조

```
src/app/
├── layout.tsx              # 루트 레이아웃 (Providers)
├── providers.tsx           # 전역 Providers
├── globals.css            # 글로벌 스타일
├── not-found.tsx          # 예외적 404 발생 시 루트 복구
├── (auth)/
│   ├── layout.tsx         # fragment layout; 공용 auth shell은 SharedAuthLoginPage/SharedPasswordResetPage가 소유
│   ├── login/page.tsx     # public 로그인 진입점
│   └── password-reset/page.tsx # public 비밀번호 찾기 진입점
├── (main)/
│   ├── layout.tsx         # protected shell gate + 파일 트리 preload
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
| 새 문서 | 상황별 생성 | `/doc/new` | ✅ 가능 |
| 새 문서 (문서) | 상황별 생성 | `/doc/new-doc` | ✅ 가능 |
| 새 문서 (템플릿) | 상황별 생성 | `/doc/new-template` | ✅ 가능 |
| 새 문서 (AI 요약) | 상황별 생성 | `/doc/new-ai-summary` | ✅ 가능 |
| AI 검색 | 상황별 생성 | `/ai/search` | ✅ 가능 |
| 설정 legacy handoff | `settings` | `/settings` | ✅ 가능 |

### 탭 → 페이지 매핑

`ContentArea`가 activeTabId와 내부 탭 경로를 기반으로 페이지 컴포넌트를 결정합니다:

```typescript
const pageComponents = {
  home: lazy(() => import('@/components/pages/home/DashboardPage')),
  markdown: lazy(() => import('@/components/pages/markdown/DocumentPage')),
  aiChat: lazy(() => import('@/components/pages/ai/ChatPage')),
  aiSearch: lazy(() => import('@/components/pages/ai/SearchPage')),
  legacySettings: LegacySettingsRedirect,
  settings: SettingsPage,
};

function getPageType(tab: TabItem): 'home' | 'markdown' | 'aiChat' | 'aiSearch' | 'legacySettings' | 'settings' | null {
  if (tab.id === 'home') return 'home';
  if (tab.path.startsWith('/doc/')) return 'markdown';
  if (tab.path.startsWith('/doc/new')) return 'markdown';
  if (tab.path.startsWith('/ai/chat')) return 'aiChat';
  if (tab.path.startsWith('/ai/search')) return 'aiSearch';
  if (parseSettingsTabPath(tab.path)) return 'settings';
  if (tab.path === '/settings') return 'legacySettings';
  return null;
}
```

### Settings mode 전환

- 사용자 메뉴, 알림, assistant help action은 workspace `settings` 탭을 열지 않고 `useSettingsPageNavigationStore.enterSettings()` 또는 `openSection()` 으로 settings mode를 켠 뒤, `/settings/{scope}/{sectionId}` 설정 탭을 엽니다.
- `useSettingsPageNavigationStore.isActive` 가 true이면 `AppLayout`은 같은 `SsooAppFrame`의 sidebar/header/tabbar/content slot을 유지하면서 settings variant 데이터를 주입합니다.
- settings mode가 켜진 동안 active content tab은 `/settings/{scope}/{sectionId}` 경로여야 합니다. `AppLayout`은 설정 모드와 활성 탭을 첫 페인트 전에 맞추고, `ContentArea`는 설정 모드에서 문서 탭을 active pane으로 렌더링하지 않습니다.
- section 탐색은 settings sidebar 메뉴 트리 클릭으로 시작하고, 클릭 결과는 같은 `TabBar`의 settings tab으로 열립니다.
- 설정 본문 내부 anchor index는 `PageTemplate`의 `leftSubContentSlot` rail로 렌더링합니다.
- 세션 복원 등으로 `/settings` 탭이 남아 있는 경우 `ContentArea` 의 `LegacySettingsRedirect` 가 settings mode로 handoff하고 해당 탭을 닫습니다.

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
DocumentPage에서 파일 로드
```

### 새 문서 런처에서 문서 생성

```
Header "새 도큐먼트" 클릭
    ↓
openTab({ path: '/doc/new', title: '새 문서' })
    ↓
ContentArea → DocumentPage (createEntryType = 'launcher')
    ↓
NewDocumentLauncher 렌더링 (Obsidian 스타일 액션 링크 4개)
    ├─ "AI 요약" → 파일 선택 → new-doc.store에 파일 저장
    │               → updateTab({ path: '/doc/new-ai-summary' })
    │               → DocumentPage AI 요약 자동 실행 → 에디터 마운트
    │               → 요약에 사용한 파일을 sourceFiles와 저장 대기 첨부로 동기화
    ├─ "문서" → updateTab({ path: '/doc/new-doc' })
    │          → DocumentPage 새 문서 에디터 마운트
    ├─ "템플릿 문서" → updateTab({ path: '/doc/new-template' })
    │                 → DocumentPage 새 템플릿 에디터 마운트
    └─ "닫기" → closeTab()
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
  home: lazy(() => import('@/components/pages/home/DashboardPage')
    .then(m => ({ default: m.DashboardPage }))),
  markdown: lazy(() => import('@/components/pages/markdown/DocumentPage')
    .then(m => ({ default: m.DocumentPage }))),
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
| 라우팅 방식 | 루트 고정 shell app | 루트 고정 workspace shell + settings mode |
| 인증 | `/login` + protected shell bootstrap | `/login` + protected shell bootstrap |
| URL 동기화 | 불필요 (internal path 중심) | 불필요 (internal path 중심) |
| 페이지 타입 | 업무 탭 중심 | Home, Markdown, AI + settings mode handoff |

---

## 미들웨어 정책

- 목적: 공개 URL을 `/` 와 `/login` 으로 제한
- 허용: `ROOT_ENTRY_PATHS = ['/', '/login']`
- 제외: `/api`, `/_next`, 정적 파일
- 직접 접근 차단 대상: `/doc/...`, `/doc/new*`, `/ai/...`, `/settings`

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
| 2026-06-15 | settings mode 활성 중 active content tab이 문서 탭으로 남아 문서 panel이 설정 화면에 표시되는 혼합 상태를 차단하는 라우팅 invariant를 문서화 |
| 2026-06-15 | settings sidebar 메뉴 클릭이 `/settings/{scope}/{sectionId}` 탭을 열고, 같은 `TabBar`/`ContentArea` 슬롯에서 `SettingsPage`를 렌더링하는 기준으로 보정 |
| 2026-06-12 | `/settings` 일반 탭을 settings mode legacy handoff로 되돌리고, 설정 section navigation은 settings tabbar로 정리 |
| 2026-04-16 | `/login` public entry, route constants, protected shell bootstrap 기준으로 공개 라우트 계약을 현행화 |
| 2026-04-02 | 과거 설정 전용 frame 실험에서 scope selector + inner section menu 3뎁스 구조를 정리 |
| 2026-04-02 | 과거 설정 전용 frame 실험에서 workspace/settings 이중 frame 구조를 반영했으나, 2026-06-12 기준 폐기 |
| 2026-03-16 | 새 문서 런처 페이지 추가: `/wiki/new` → 런처, `/wiki/new-wiki`·`new-template`·`new-ai-summary` 진입점 분기 |
| 2026-03-10 | 루트 고정 라우팅 정책과 내부 탭 경로 개념을 현재 구현 기준으로 정리 |
| 2026-02-24 | Codex 품질 게이트 엄격 모드 적용에 맞춰 문서 메타 섹션 보강 |
