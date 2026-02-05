# 앱 초기화 흐름 (App Initialization Flow)

> 최종 업데이트: 2026-02-02

DMS 앱의 초기화 및 데이터 로드 흐름을 정의합니다.

---

## 초기화 개요

```
브라우저 접속
    ↓
Next.js App Router
    ↓
RootLayout (layout.tsx)
    ↓
Providers (providers.tsx)
    ↓
AppLayout
    ↓
InitializeFileTree (파일 트리 로드)
    ↓
ContentArea (Home 페이지 렌더링)
```

---

## 컴포넌트별 역할

### 1. RootLayout (`layout.tsx`)

```tsx
export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**역할:**
- 폰트 설정 (Geist Sans, Geist Mono)
- 메타데이터 설정
- Providers 래핑

### 2. Providers (`providers.tsx`)

```tsx
export function Providers({ children }) {
  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  );
}
```

**역할:**
- 전역 Providers 래핑
- Toast 컨텍스트 제공

### 3. AppLayout

```tsx
export function AppLayout() {
  // 디바이스 타입 감지
  const { deviceType } = useLayoutStore();
  
  // 컴팩트 모드 자동 전환
  useEffect(() => {
    const checkCompactMode = () => { ... };
    checkCompactMode();
    window.addEventListener('resize', checkCompactMode);
  }, []);
  
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <TabBar />
        <ContentArea />
      </div>
    </div>
  );
}
```

**역할:**
- 레이아웃 구조 정의
- 컴팩트 모드 감지 (본문 영역 < 975px)
- 디바이스 타입에 따른 UI 분기

### 4. Sidebar > FileTree

```tsx
export function FileTree() {
  const { files, isLoading, loadFileTree } = useFileStore();
  
  useEffect(() => {
    loadFileTree();
  }, [loadFileTree]);
  
  return ( ... );
}
```

**역할:**
- 마운트 시 파일 트리 로드
- 로딩 상태 표시

---

## 데이터 로드 순서

```
1. [동기] Zustand persist 복원
   - useTabStore: 저장된 탭 상태
   - useFileStore: 저장된 북마크

2. [비동기] 파일 트리 로드
   - FileTree 마운트 시 loadFileTree() 호출
   - API: GET /api/files
   - 성공 시 files, fileMap 설정

3. [사용자 액션] 문서 로드
   - 탭 클릭 시 ContentArea가 페이지 타입 결정
   - MarkdownViewerPage가 파일 내용 로드
```

---

## 상태 복원 (Persist)

### localStorage에서 복원되는 데이터

| Store | 복원 데이터 | 기본값 |
|-------|-----------|-------|
| `useTabStore` | tabs, activeTabId | [Home 탭], 'home' |
| `useFileStore` | bookmarks | [] |

### 복원 시점

Zustand persist 미들웨어가 스토어 생성 시 자동 복원:

```typescript
export const useTabStore = create<TabStore>()(
  persist(
    (set, get) => ({ ... }),
    {
      name: 'dms-tab-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

---

## 에러 처리

### 파일 트리 로드 실패

```typescript
loadFileTree: async () => {
  try {
    const result = await fileSystemService.getFileTree();
    if (!result.success) {
      set({ error: result.error });
      return { success: false, error: result.error };
    }
    // 성공 처리
  } catch (error) {
    logger.error('파일 트리 로드 실패', error);
    set({ error: getErrorMessage(error) });
    return { success: false, error: getErrorMessage(error) };
  }
};
```

### 중복 로드 방지

```typescript
if (get().isInitialized) {
  logger.debug('파일 트리 이미 로드됨, 건너뜀');
  return { success: true };
}
```

---

## 성능 측정

`PerformanceTimer` 유틸리티로 초기화 시간 측정:

```typescript
const timer = new PerformanceTimer('파일 트리 로드');

try {
  // ... 로드 로직
  timer.end({ success: true });
} catch (error) {
  timer.end({ success: false, error });
}
```

**콘솔 출력:**
```
[Performance] 파일 트리 로드 - 123ms {success: true}
```

---

## PMS 대비 차이점

| 항목 | PMS | DMS |
|------|-----|-----|
| 인증 확인 | 토큰 검증 후 리다이렉트 | 없음 |
| 메뉴 로드 | 권한 기반 필터링 | 파일 시스템 전체 |
| 프로젝트 로드 | 활성 프로젝트 선택 | 없음 |
| 에러 처리 | 401 → 로그인 페이지 | 로컬 에러 표시 |

---

## 관련 문서

- [state-management.md](state-management.md) - 스토어 상세
- [page-routing.md](page-routing.md) - 라우팅 흐름
