---
applyTo: "apps/web/chs/**"
---

# Codex CHS Instructions

> 최종 업데이트: 2026-03-25
> 정본: `.github/instructions/chs.instructions.md`

## 기술 스택

- Next.js 15.x (App Router), React 19.x, TypeScript 5.x
- Tailwind CSS 3.x, shadcn/ui (Radix UI primitives)
- Zustand 5.x, TanStack Query 5.x, Axios

## 레이어 의존성

```
pages → templates → common → ui
  ↓
hooks → lib/api → stores
```

- 상위 → 하위만 참조
- 역방향 참조 금지
- 순환 참조 금지

## 타이포그래피 규칙

- 폰트 스택은 전역 CSS 변수(`--font-sans`, `--font-mono`)와 Tailwind token만 사용합니다.
- semantic typography token 사용 우선:
  - `text-title-page`, `text-title-section`, `text-title-subsection`, `text-title-card`
  - `text-body-md`, `text-body-sm`
  - `text-control-lg`
  - `text-label-md`, `text-label-sm`, `text-label-strong`
  - `text-caption`, `text-badge`
  - `text-code-inline`, `text-code-block`, `text-code-line-number`
- typography 선택 순서: `slot 역할 -> density -> 허용 token`
- role layer: `header`, `title`, `body`, `detail`, `label`, `badge`, `code`, `annotation`
- `label-*`는 조작/식별용 텍스트의 독립 역할 계층입니다.
- `caption`은 detail 계층 기본값입니다.
- 기존 alias(`heading-1/2/3`, `body-text`, `body-text-muted`)는 하위 호환으로 유지합니다.
- 컨트롤 primitive는 `text-xs`, `text-sm`, `text-base` 단독 raw class도 수동 정리 대상입니다.
- raw 조합(`text-sm font-medium`, `text-xs font-medium`, `text-sm font-semibold`, `text-lg font-semibold`, `text-xs font-semibold`, `text-lg font-medium`, `body-text font-medium`)과 개별 `fontFamily` 하드코딩은 금지합니다.
- `text-[Npx]` arbitrary font-size는 금지합니다.
- standalone `text-xl`, `text-2xl`, `font-bold`는 금지합니다.
- semantic token + raw weight override(`text-title-card font-bold`, `text-label-md font-semibold`)는 금지합니다.
- `badge/chip/table cell` 내부 텍스트도 역할/밀도 기준 정규화 대상입니다.
- container-scaled text는 semantic intent를 token으로 정의하고, 실제 size는 컨테이너 비례 스케일을 허용합니다.

## 검증

- 빌드: `pnpm run build:web-chs`
- 타이포 검증: `node .github/scripts/check-typography.js`

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-03-25 | CHS Codex instruction 신설, typography token 규칙 추가 |
