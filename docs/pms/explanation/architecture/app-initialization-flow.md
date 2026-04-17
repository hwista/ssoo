# PMS 앱 초기화 흐름

> **작성일**: 2026-01-29  
> **최종 업데이트**: 2026-04-16  
> **목적**: PMS shell app 기준의 실제 진입 흐름과 bootstrap 책임을 정리

---

## 초기화 개요

```text
브라우저 접속
    ↓
app/layout.tsx
    ↓
Providers (QueryClient, 전역 UI)
    ↓
경로 판별
    ├─ /login
    │   ↓
    │   app/(auth)/login/page.tsx
    │   ↓
    │   AuthStandardLoginCard
    │
    └─ /
        ↓
        app/(main)/layout.tsx
        ↓
        useProtectedAppBootstrap(...)
        ├─ auth hydration / checkAuth
        ├─ PMS access snapshot hydrate
        └─ 미인증 시 /login 복구
        ↓
        app/(main)/page.tsx
        ↓
        AppLayout
        ↓
        Sidebar / Header / TabBar / ContentArea
```

---

## 핵심 파일

```text
apps/web/pms/src/
├── app/
│   ├── layout.tsx                  # RootLayout + Providers
│   ├── (auth)/
│   │   ├── layout.tsx              # AuthPageShell
│   │   └── login/page.tsx          # 실제 로그인 진입점
│   ├── (main)/
│   │   ├── layout.tsx              # protected shell gate
│   │   └── page.tsx                # 실제 루트 shell entry
│   ├── not-found.tsx               # 마지막 루트 복구 장치
│   └── global-error.tsx            # shell 전역 에러 복구
├── components/layout/
│   ├── AppLayout.tsx
│   ├── Header.tsx
│   ├── TabBar.tsx
│   └── ContentArea.tsx
├── lib/constants/routes.ts         # APP_HOME_PATH / LOGIN_PATH / ROOT_ENTRY_PATHS
└── stores/
    ├── auth.store.ts
    ├── access.store.ts
    └── menu.store.ts
```

---

## 컴포넌트별 역할

| 파일 | 역할 |
|------|------|
| `app/layout.tsx` | HTML 문서 구조와 전역 Providers 구성 |
| `app/(auth)/login/page.tsx` | 공용 `AuthStandardLoginCard` 기반 로그인 UI |
| `app/(main)/layout.tsx` | `useProtectedAppBootstrap(...)` 로 auth/access gate 수행 |
| `app/(main)/page.tsx` | 동적 import된 `AppLayout` 을 루트 shell entry로 렌더 |
| `stores/access.store.ts` | `/api/menus/my` 응답을 access snapshot으로 hydrate |
| `stores/menu.store.ts` | access snapshot을 실제 메뉴/즐겨찾기/navigation 상태로 반영 |
| `components/layout/ContentArea.tsx` | 탭의 internal path를 실제 페이지 컴포넌트에 매핑 |

---

## bootstrap 순서

### 1. 로그인 진입

- `/login` 은 별도의 public entry다.
- auth store hydration 이후 이미 로그인된 상태면 `APP_HOME_PATH ('/')` 로 즉시 복귀한다.
- 로그인 성공 시에도 `/` shell entry로 이동한다.

### 2. 보호된 루트 진입

`app/(main)/layout.tsx` 는 직접 `AppLayout` 을 그리지 않고 **gate** 만 담당한다.

1. auth store hydration 대기
2. `checkAuth()` 1회 실행
3. 인증 성공 후 `useAccessStore.hydrate()` 실행
4. 미인증이면 access/menu 상태를 reset 하고 `/login` 으로 이동
5. access snapshot 이 준비되면 `children` 렌더

이 공통 orchestration 은 `packages/web-auth/src/protected-app-bootstrap.ts` 의
`useProtectedAppBootstrap(...)` 으로 정렬되어 있다.

### 3. PMS access/menu 초기화

`useAccessStore.hydrate()` 흐름:

1. `menusApi.getMyMenus()` 호출
2. `PmsAccessSnapshot` 수신
3. `useMenuStore.applyAccessSnapshot(snapshot)` 실행
4. 사이드바/즐겨찾기/관리자 메뉴가 동일 snapshot 기준으로 구성

즉, 예전처럼 main layout 이 메뉴를 직접 로드하는 구조가 아니라,
**shared bootstrap -> access store -> menu store** 순서로 책임이 분리되어 있다.

### 4. 실제 shell 렌더링

`app/(main)/page.tsx` 가 루트 shell entry다.

- `AppLayout` 은 동적 import로 로드된다.
- `AppLayout` 내부에서 `Sidebar`, `Header`, `TabBar`, `ContentArea` 가 닫힌다.
- 실제 업무 화면 전환은 브라우저 라우팅이 아니라 `ContentArea` 의 internal path 매핑으로 처리한다.

---

## PMS shell-app 계약

| 브라우저 경로 | 의미 | 실제 담당 |
|--------------|------|----------|
| `/` | 인증된 PMS shell home | `(main)/layout` + `(main)/page` |
| `/login` | 로그인 진입점 | `(auth)/login/page.tsx` |
| 그 외 | 공개 진입점이 아님, 루트 shell 로 복구 | `middleware.ts` / `not-found.tsx` |

---

## 관련 문서

- [page-routing.md](./page-routing.md)
- [state-management.md](./state-management.md)
- [layout-system.md](../design/layout-system.md)

## Changelog

| Date | Change |
|------|--------|
| 2026-04-16 | `(main)/layout = gate`, `(main)/page = actual shell entry` 구조와 shared bootstrap/access snapshot 흐름을 현재 구현 기준으로 반영 |
| 2026-02-09 | Add changelog section. |
