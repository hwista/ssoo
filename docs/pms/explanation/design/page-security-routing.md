# 페이지 보안 및 라우팅 전략

> **작성일**: 2026-01-19  
> **최종 업데이트**: 2026-04-16  
> **목적**: PMS shell app 의 UX 관점에서 공개 경로와 내부 화면 경로를 구분

---

## UX 계약

| 주소창에 보이는 경로 | 의미 |
|----------------------|------|
| `/` | 인증된 PMS 루트 shell |
| `/login` | 로그인 화면 |
| 그 외 | 공개 진입점이 아니며 `/` 로 복구 |

업무 화면은 브라우저 URL 이 아니라 `TabBar + ContentArea` 안의 internal path 로 열린다.

---

## 디자인 원칙

1. 사용자는 PMS 안에서 탭을 이동해도 주소창 구조를 탐색하지 않는다.
2. 잘못된 경로 진입은 에러 탐색 흐름이 아니라 **루트 shell 복구 흐름**으로 처리한다.
3. 로그인 화면과 메인 shell 은 분리하되, home/login 경로 의미는 route constants 로 고정한다.
4. `(main)/layout` 은 gate, `(main)/page` 는 실제 shell entry 라는 책임 분리를 유지한다.

---

## 화면 책임

| 파일 | UX 책임 |
|------|---------|
| `middleware.ts` | 공개 진입점 외 경로를 루트 shell 로 복구 |
| `app/not-found.tsx` | 예외적 404 의 마지막 복구 장치 |
| `app/(auth)/login/page.tsx` | 로그인 진입 화면 |
| `app/(main)/layout.tsx` | 보호된 shell 진입 전 로딩/리다이렉트 gate |
| `app/(main)/page.tsx` | 실제 PMS shell 렌더 |

자세한 기술 흐름은 [architecture/page-routing.md](../architecture/page-routing.md) 를 따른다.

## Changelog

| Date | Change |
|------|--------|
| 2026-04-16 | shell-app blueprint 기준으로 design 관점의 entry contract 설명을 현재 구현에 맞춰 재작성 |
| 2026-02-24 | Codex 품질 게이트 엄격 모드 적용에 맞춰 문서 메타 섹션 보강 |
