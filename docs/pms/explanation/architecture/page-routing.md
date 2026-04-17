# 페이지 보안 및 라우팅 전략

> **작성일**: 2026-01-19  
> **최종 업데이트**: 2026-04-16  
> **목적**: PMS shell app 의 공개 진입 계약과 internal path 운영 방식을 정리

---

## 현재 라우팅 모델

PMS는 일반 routed app 이 아니라 **shell app** 이다.

- 브라우저 공개 진입점: `/`, `/login`
- 실제 업무 화면 path: `/request`, `/proposal`, `/execution` 등
- 업무 화면 path 는 브라우저 URL 이 아니라 `ContentArea` 내부 virtual path 로만 사용된다.

즉 브라우저에서 볼 수 있는 공개 계약은 작고, 실제 화면 전환은 탭 셸 안에서 일어난다.

---

## entry contract

| 경로 | 의미 | 담당 파일 |
|------|------|----------|
| `/` | 인증된 PMS 루트 shell | `app/(main)/layout.tsx`, `app/(main)/page.tsx` |
| `/login` | public 로그인 진입점 | `app/(auth)/login/page.tsx` |
| 그 외 모든 브라우저 경로 | 잘못된 직접 접근으로 간주, `/` 로 복구 | `middleware.ts`, `app/not-found.tsx` |

라우트 상수는 `src/lib/constants/routes.ts` 에서 관리한다.

```ts
export const APP_HOME_PATH = '/';
export const LOGIN_PATH = '/login';
export const ROOT_ENTRY_PATHS = [APP_HOME_PATH, LOGIN_PATH] as const;
```

---

## 파일 구조

```text
apps/web/pms/src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   └── login/page.tsx
│   ├── (main)/
│   │   ├── layout.tsx      # protected shell gate
│   │   └── page.tsx        # actual shell entry
│   ├── not-found.tsx
│   ├── global-error.tsx
│   └── layout.tsx
├── components/layout/
│   ├── AppLayout.tsx
│   └── ContentArea.tsx
└── middleware.ts
```

---

## 라우팅 흐름

### 1. `/login`

1. auth store hydration 대기
2. 이미 인증된 상태면 `/` 로 즉시 복귀
3. 미인증이면 공용 `AuthStandardLoginCard` 렌더
4. 로그인 성공 시 `/` shell 로 이동

### 2. `/`

1. `(main)/layout.tsx` 진입
2. `useProtectedAppBootstrap(...)` 가 auth/access bootstrap 수행
3. 미인증이면 `/login` 이동
4. 인증 + access snapshot 준비 완료 후 `children` 렌더
5. `(main)/page.tsx` 가 `AppLayout` 을 렌더
6. `ContentArea` 가 active tab 의 internal path 를 실제 페이지 컴포넌트에 매핑

### 3. 잘못된 브라우저 경로

예: `/request`, `/proposal`, `/some-random-path`

1. `middleware.ts` 가 `ROOT_ENTRY_PATHS` 외 경로를 감지
2. 브라우저를 `/` 로 redirect
3. 예외적으로 404 가 발생해도 `app/not-found.tsx` 가 다시 `/` 로 복구
4. 이후 main layout gate 가 로그인 여부를 처리

---

## middleware / not-found 역할

### middleware

- 허용: `/`, `/login`
- 제외: `/api`, `/_next`, 정적 파일
- 나머지 페이지 경로: `/` 로 redirect

이는 “404 페이지를 보여준다”기보다 **shell app 의 공개 entry contract 를 강제한다**는 의미다.

### not-found

- middleware 바깥에서 예외적으로 404 가 발생했을 때의 마지막 안전망이다.
- 항상 `APP_HOME_PATH` 로 복구한다.
- 인증 여부 판단은 not-found 가 아니라 `(main)/layout.tsx` 가 맡는다.

---

## internal path 운영 원칙

`ContentArea` 가 다음과 같은 internal path 를 실제 페이지 컴포넌트에 매핑한다.

| internal path 예시 | 의미 |
|-------------------|------|
| `/home` | 대시보드 탭 |
| `/request` | 의뢰 목록 |
| `/request/create` | 의뢰 등록 |
| `/proposal` | 제안 단계 |
| `/execution` | 수행 단계 |
| `/transition` | 전환 단계 |

새 화면을 추가할 때는 **Next route 를 늘리는 것보다 `ContentArea` 매핑과 메뉴/탭 계약을 먼저 갱신**하는 것이 PMS 표준이다.

---

## 유지보수 가이드

1. 브라우저 공개 경로를 늘려야 하는지 먼저 검토한다.
2. shell 내부 화면이면 `ROOT_ENTRY_PATHS` 를 건드리지 않는다.
3. `ContentArea` 매핑, 메뉴 snapshot, 탭 open 계약을 함께 갱신한다.
4. login / logout / not-found / middleware 는 route constants 를 통해 같은 경로 계약을 참조한다.

---

## 관련 문서

- [app-initialization-flow.md](./app-initialization-flow.md)
- [page-security-routing.md](../design/page-security-routing.md)
- [layout-system.md](../design/layout-system.md)

## Changelog

| Date | Change |
|------|--------|
| 2026-04-16 | shell-app blueprint 기준으로 `/` + `/login` 공개 계약, route constants, root recovery 흐름을 현재 구현에 맞춰 정리 |
| 2026-02-24 | Codex 품질 게이트 엄격 모드 적용에 맞춰 문서 메타 섹션 보강 |
