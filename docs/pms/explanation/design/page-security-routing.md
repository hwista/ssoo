# 페이지 보안 및 라우팅 전략

> **작성일**: 2026-01-19  
> **목적**: Next.js 라우팅 노출 방지 및 권한 기반 접근 제어

---

## 🔒 보안 아키텍처

### 문제점
- Next.js 파일 시스템 라우팅은 URL 구조를 그대로 노출
- `/request`, `/request/create` 같은 경로가 주소창에 노출
- 권한이 없는 사용자도 URL을 알면 직접 접근 가능
- 라우팅 구조 분석을 통한 정보 수집 및 해킹 위험

### 해결 방안
**하이브리드 라우팅 전략**: Next.js 라우팅 + 동적 컴포넌트 로딩

---

## 📁 파일 구조

### 1. 페이지 컴포넌트 위치
```
apps/web/pms/src/
├── app/
│   ├── (main)/
│   │   ├── layout.tsx          # 메인 레이아웃 (인증 필요, 미인증 시 로그인 폼)
│   │   ├── page.tsx            # 홈 (/)
│   │   ├── request/page.tsx    # 얇은 래퍼 → RequestListPage
│   │   ├── proposal/page.tsx   # 얇은 래퍼 → ProposalListPage
│   │   ├── execution/page.tsx  # 얇은 래퍼 → ExecutionListPage
│   │   └── transition/page.tsx # 얇은 래퍼 → TransitionListPage
│   ├── (auth)/
│   │   └── login/page.tsx      # 로그인 (현재 미사용)
│   ├── not-found.tsx           # 404 페이지 (자동 리다이렉트)
│   └── layout.tsx              # 루트 레이아웃
├── components/
│   └── pages/                  # ← 실제 비즈니스 페이지 컴포넌트
│       ├── request/
│       │   ├── RequestListPage.tsx
│       │   └── RequestCreatePage.tsx
│       ├── proposal/ProposalListPage.tsx
│       ├── execution/ExecutionListPage.tsx
│       └── transition/TransitionListPage.tsx
└── middleware.ts               # 미들웨어 (직접 접근 차단)
```

**핵심 원칙**: 
- `app/(main)` 내부에는 라우팅용 파일만 최소한으로 유지
- 실제 비즈니스 로직 페이지는 `components/pages/`에 배치
- Next.js 라우팅에 등록되지 않아 URL로 직접 접근 불가

---

## 🛡️ 보안 메커니즘

### 1. 미들웨어 (middleware.ts)

```typescript
// 허용된 경로만 통과, 나머지는 404로 리다이렉트
const allowedPaths = [
  '/',
];

// 그 외 모든 경로는 차단
return NextResponse.rewrite(new URL('/not-found', request.url));
```

**작동 방식**:
- `/request` 접근 시 → 미들웨어에서 차단 → `/not-found`로 리다이렉트
- API 라우트, 정적 파일은 제외

### 2. 404 페이지 (app/not-found.tsx)

```typescript
export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // 무조건 메인 페이지로 리다이렉트
    // (main)/layout.tsx의 checkAuth가 인증 상태를 판단하여 처리
    router.replace('/');
  }, [router]);
}
```

**작동 방식**:
- 존재하지 않는 URL 접근 시 무조건 `/`로 리다이렉트
- `(main)/layout.tsx`가 인증 상태를 확인해:
  - 로그인됨 → AppLayout 렌더링
  - 미로그인 → `/`에서 로그인 폼 표시
- 무한 루프 방지: 404 → `/` → checkAuth → (필요시) 로그인 폼 표시

### 3. ContentArea 동적 로딩

```typescript
// components/layout/ContentArea.tsx
const pageComponents = {
  '/request': lazy(() => 
    import('@/components/pages/request/RequestListPage')
  ),
  '/request/create': lazy(() => 
    import('@/components/pages/request/RequestCreatePage')
  ),
};

// activeTab.path에 해당하는 컴포넌트를 동적으로 렌더링
const PageComponent = pageComponents[activeTab.path];
return <PageComponent />;
```

**작동 방식**:
- 메뉴 클릭 시 `openTab({ path: '/request' })` 호출
- ContentArea가 path를 보고 해당 컴포넌트를 lazy load
- URL은 `http://localhost:3000/`에 고정

---

## 🔐 권한 제어 흐름

### 1. 메뉴 기반 접근 제어

```
사용자 로그인
    ↓
DB에서 권한별 메뉴 조회 (cm_menu_m + cm_user_menu_r)
    ↓
메뉴 트리 구성 (menuStore)
    ↓
사이드바에 권한 있는 메뉴만 표시
    ↓
메뉴 클릭 시 openTab() 호출
    ↓
ContentArea가 동적 컴포넌트 렌더링
```

### 2. 직접 URL 접근 시도

```
http://localhost:3000/request 입력
    ↓
middleware.ts에서 allowedPaths 체크
    ↓
허용되지 않은 경로 → /not-found로 리다이렉트
    ↓
not-found.tsx에서 무조건 / 로 리다이렉트
    ↓
(main)/layout.tsx의 checkAuth 실행
    ↓
로그인됨 → 메인 페이지
미로그인 → `/`에서 로그인 폼 표시
```

---

## 🎯 사용자 경험

### 시나리오 1: 정상 사용자
1. 로그인 → 메인 페이지
2. 사이드바에서 "고객요청 관리" 메뉴 클릭
3. 탭이 열리고 목록 페이지 렌더링
4. "등록" 버튼 클릭
5. 등록 페이지 탭 열림
6. 양식 작성 후 제출
7. 목록 페이지 탭으로 자동 이동

**URL 변화**: `http://localhost:3000/` (변화 없음)

### 시나리오 2: URL 직접 입력 시도
1. 주소창에 `http://localhost:3000/request` 입력
2. 미들웨어가 차단 → 404 페이지
3. 404 페이지에서 `/`로 리다이렉트
4. `(main)/layout.tsx`의 `checkAuth` 실행
5. 로그인 상태 확인:
   - 로그인됨 → 메인 페이지 표시
   - 미로그인 → `/`에서 로그인 폼 표시

### 시나리오 3: 미로그인 상태 직접 접근
1. 주소창에 `http://localhost:3000/some-random-path` 입력
2. 미들웨어가 차단 → 404 페이지
3. 404 페이지에서 `/`로 리다이렉트
4. `(main)/layout.tsx`의 `checkAuth` 실행
5. 토큰 없음 감지 → `/`에서 로그인 폼 표시
6. 로그인 폼 표시

---

## 📋 구현 체크리스트

### Phase 1: 기본 구조 ✅
- [x] `components/pages/` 디렉토리 생성
- [x] 페이지 컴포넌트 이동
- [x] ContentArea에 lazy import 추가
- [x] `app/(main)/*` 얇은 래퍼 구성

### Phase 2: 보안 강화 ✅
- [x] `middleware.ts` 생성 및 allowedPaths 설정
- [x] `app/not-found.tsx` 생성 및 자동 리다이렉트
- [x] 직접 URL 접근 테스트

### Phase 3: 확장 (향후)
- [ ] 더 많은 페이지 컴포넌트 추가
- [ ] ContentArea의 pageComponents 자동 등록 시스템
- [ ] 권한별 탭 접근 제어 (현재는 메뉴 기반만)

---

## 🔧 유지보수 가이드

### 새 페이지 추가 시

1. **페이지 컴포넌트 생성**
   ```
   components/pages/[domain]/[feature]/[PageName].tsx
   ```

2. **ContentArea에 등록**
   ```typescript
   // components/layout/ContentArea.tsx
   const pageComponents = {
     // 기존...
     '/new/page': lazy(() => import('@/components/pages/new/page/NewPage')),
   };
   ```

3. **메뉴 데이터베이스에 등록**
   ```sql
   INSERT INTO cm_menu_m (menu_path, menu_name, ...) 
   VALUES ('/new/page', '새 페이지', ...);
   ```

4. **권한 설정**
   ```sql
   INSERT INTO cm_role_menu_r (role_code, menu_id, access_type, ...)
   VALUES ('admin', [menu_id], 'full', ...);
   ```

### 주의사항
- `app/(main)` 내부에 새 폴더를 만들지 말 것
- 모든 비즈니스 페이지는 `components/pages/`에 배치
- `middleware.ts`의 allowedPaths는 최소한만 유지
- 직접 URL 접근이 필요한 페이지만 `app/` 내부에 생성

---

## 📊 보안 이점

| 항목 | 기존 방식 | 현재 방식 |
|------|-----------|-----------|
| URL 노출 | ✗ 전체 라우팅 구조 노출 | ✓ `/`만 노출 |
| 직접 접근 | ✗ URL 알면 접근 가능 | ✓ 404 → 리다이렉트 |
| 권한 체크 | △ 페이지별 개별 구현 | ✓ 메뉴 DB 기반 통합 |
| 해킹 리스크 | ✗ 라우팅 분석 가능 | ✓ 라우팅 구조 숨김 |
| 개발 편의성 | ✓ 파일 시스템 기반 | ✓ 컴포넌트 기반 |

---

## 🚀 성능 최적화

### 1. Lazy Loading
- 모든 페이지 컴포넌트는 `React.lazy()`로 로드
- 탭 열림 시점에만 코드 다운로드
- 초기 번들 크기 최소화

### 2. Suspense Boundary
- ContentArea에 Suspense 적용
- 로딩 상태 표시
- 사용자 경험 향상

### 3. Code Splitting
- 각 페이지 컴포넌트는 별도 청크로 분리
- 병렬 다운로드 가능
- 캐싱 효율 증가

---

## 📚 참고 자료

- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [React.lazy()](https://react.dev/reference/react/lazy)
- [OWASP - Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)

---

**작성자**: GitHub Copilot  
**검토자**: 개발팀  
**버전**: 1.0

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

