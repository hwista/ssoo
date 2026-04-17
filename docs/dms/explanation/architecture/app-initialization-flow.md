# 앱 초기화 흐름 (App Initialization Flow)

> 최종 업데이트: 2026-04-16

DMS 앱의 현재 초기화 흐름을 **로그인 진입**, **protected shell bootstrap**, **파일 트리 preload** 기준으로 정리합니다.

---

## 초기화 개요

```text
브라우저 접속
    ↓
app/layout.tsx
    ↓
Providers
    ├─ QueryClient / Toaster / ConfirmDialog
    ├─ AuthStateSync
    └─ (로그인 후 + 권한 허용 시) Assistant UI
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
        ├─ DMS access snapshot hydrate
        └─ 미인증 시 /login 복구
        ↓
        canReadDocuments 이면 refreshFileTree()
        ↓
        app/(main)/page.tsx
        ↓
        AppLayout
        ├─ workspace shell
        └─ settings shell
```

---

## 핵심 파일

```text
apps/web/dms/src/
├── app/
│   ├── layout.tsx                  # RootLayout + Providers
│   ├── providers.tsx               # QueryClient / AuthStateSync / assistant gating
│   ├── (auth)/
│   │   ├── layout.tsx              # AuthPageShell + DMS auth theme
│   │   └── login/page.tsx          # 실제 로그인 진입점
│   ├── (main)/
│   │   ├── layout.tsx              # protected shell gate + file tree preload
│   │   └── page.tsx                # actual root shell entry
│   └── not-found.tsx               # 마지막 루트 복구 장치
├── components/layout/AppLayout.tsx
├── lib/constants/routes.ts         # APP_HOME_PATH / LOGIN_PATH / ROOT_ENTRY_PATHS
└── stores/
    ├── auth.store.ts
    ├── access.store.ts
    ├── file.store.ts
    └── settings-shell.store.ts
```

---

## bootstrap 순서

### 1. 로그인 진입

- `/login` 은 public entry 다.
- auth store hydration 이후 이미 로그인된 상태면 `/` 로 복귀한다.
- 로그인 성공 시에도 `APP_HOME_PATH ('/')` 로 이동한다.

### 2. protected shell bootstrap

`app/(main)/layout.tsx` 는 직접 `AppLayout` 을 렌더하지 않는다.
공통 `useProtectedAppBootstrap(...)` 을 사용해 다음 순서를 맞춘다.

1. auth hydration 대기
2. `checkAuth()` 실행
3. 인증 성공 후 `useAccessStore.hydrate()` 실행
4. 미인증 시 access state reset 후 `/login` 이동
5. access snapshot 준비 완료 시 `children` 렌더

### 3. 파일 트리 preload

bootstrap 이후에도 DMS는 app-specific 후속 단계가 하나 더 있다.

- `accessSnapshot.features.canReadDocuments === true` 일 때만 `refreshFileTree()` 실행
- 따라서 공용 bootstrap 은 auth/access 까지만 담당하고,
  DMS-specific 파일 시스템 준비는 layout 의 후속 effect 로 유지한다.

### 4. 실제 shell 렌더링

`app/(main)/page.tsx` 가 루트 shell entry 다.

- `AppLayout` 이 workspace shell 과 settings shell 전환을 담당한다.
- `ContentArea` 는 active tab 의 internal path 를 기준으로 Home / Markdown / AI / legacy settings handoff 를 렌더한다.

---

## Providers 역할

| 항목 | 역할 |
|------|------|
| `QueryClientProvider` | query cache 경계 |
| `AuthStateSync` | browser-facing auth state 동기화 |
| `ConfirmDialog` / `Toaster` | 전역 UX surface |
| `FloatingAssistant` / `AssistantSessionSync` | 로그인 후 + `canUseAssistant` 권한이 있을 때만 노출 |

즉 assistant 런타임은 앱 전체에 항상 붙는 것이 아니라,
**로그인 경로가 아니고 인증 + 권한이 확보된 경우에만 mount** 된다.

---

## PMS 대비 차이점

| 항목 | PMS | DMS |
|------|-----|-----|
| 공개 진입점 | `/`, `/login` | `/`, `/login` |
| 공통 bootstrap | auth + access snapshot | auth + access snapshot |
| 앱별 후속 bootstrap | 메뉴 snapshot apply | 파일 트리 preload |
| shell 종류 | workspace shell | workspace + settings dual shell |

---

## 관련 문서

- [page-routing.md](page-routing.md)
- [state-management.md](state-management.md)
- [layout-system.md](../design/layout-system.md)

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-16 | shared protected bootstrap, `/login` public entry, file tree preload 후속 단계까지 현재 구현 기준으로 재작성 |
| 2026-02-24 | Codex 품질 게이트 엄격 모드 적용에 맞춰 문서 메타 섹션 보강 |
