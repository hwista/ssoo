# CHS 디자인 시스템

> 최종 업데이트: 2026-03-25

## 1. 폰트 스택

CHS는 PMS/DMS와 동일한 전역 typography 정본을 사용합니다.

```css
--font-sans: -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Segoe UI", "Noto Sans KR", sans-serif;
--font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

- 폰트는 `globals.css`의 CSS 변수와 `tailwind.config.ts`의 `fontFamily` token으로만 정의합니다.
- 컴포넌트에서 개별 `fontFamily` 하드코딩은 금지합니다.

## 2. 시맨틱 타이포 토큰

| 토큰 | 크기 | 행간 | 굵기 | 용도 |
|------|------|------|------|------|
| `text-title-page` | 28px | 36px | 700 | 페이지 제목 |
| `text-title-section` | 24px | 32px | 600 | 섹션 제목 |
| `text-title-subsection` | 20px | 28px | 600 | 하위 섹션 제목 |
| `text-title-card` | 18px | 28px | 600 | 카드/패널 타이틀 |
| `text-body-md` | 14px | 24px | 400 | 기본 본문 |
| `text-body-sm` | 14px | 20px | 400 | 촘촘한 본문 |
| `text-label-md` | 14px | 20px | 500 | 기본 라벨 |
| `text-label-sm` | 12px | 16px | 500 | 작은 라벨 |
| `text-label-strong` | 14px | 20px | 600 | 강조 라벨 |
| `text-caption` | 12px | 16px | 400 | 캡션/보조 설명 |
| `text-control-lg` | 16px | 24px | 400 | 큰 컨트롤 텍스트 |
| `text-badge` | 12px | 16px | 600 | badge/chip 라벨 |
| `text-code-inline` | 13px | 1.5 | 400 | 인라인 코드, 경로, 식별자 |
| `text-code-block` | 13px | 1.625 | 400 | 코드 블록 본문 |
| `text-code-line-number` | 12px | 16px | 500 | 줄번호, gutter |

## 3. Density-Driven Typography Model

- CHS typography는 `slot 역할 -> density -> 허용 token` 순서로 선택합니다.
- Role Layers: `header`, `title`, `body`, `detail`, `label`, `badge`, `code`, `annotation`
- Density: `spacious`, `normal`, `dense`, `exception`
- `label-*`는 조작/식별용 텍스트의 독립 역할 계층입니다.
- `caption`은 detail 계층 기본값입니다.

## 4. Slot Contract

- `EmptyState.title -> title`
- `EmptyState.description -> detail/body`
- `Form.label -> label`
- `Form.hint`, `Form.error -> detail`
- `Badge/Chip.text -> badge 또는 label`

## 5. 컨트롤 타이포 매핑

- Button `sm`: `text-caption`
- Button `default`: `text-label-md`
- Button `lg`, Textarea 기본: `text-control-lg`
- Dropdown/Select/Input item/trigger: `text-body-sm`
- Dropdown shortcut, Tooltip: `text-caption`
- Badge: `text-badge`
## 6. 사용 원칙

- 색상은 typography token에 포함하지 않고 호출부에서 결정합니다.
- 기존 alias(`heading-1/2/3`, `body-text`, `body-text-muted`)는 하위 호환으로 유지할 수 있습니다.
- raw 조합(`text-sm font-medium`, `text-xs font-medium`, `text-sm font-semibold`, `text-lg font-semibold`, `text-xs font-semibold`, `text-lg font-medium`, `body-text font-medium`)은 semantic token으로 치환합니다.
- `text-[Npx]` arbitrary font-size는 역할/밀도 기준 token으로 정규화합니다.
- standalone `text-xl`, `text-2xl`, `font-bold`는 금지합니다. Phase 8 기준 title token 또는 weight가 포함된 semantic token으로 닫습니다.
- semantic token + raw weight override(`text-title-card font-bold`, `text-label-md font-semibold`)는 금지합니다.
- code 계열은 `font-mono`와 함께 `text-code-*` token을 사용합니다.
- container-scaled text는 semantic intent를 token으로 정의하고, 실제 size는 컨테이너 비례 스케일을 허용합니다.

## 7. Phase 8 Structural Exceptions

- `UserAvatar.tsx`: container-scaled text
- viewer zoom (`fontSize: ${zoomLevel}%`)
- CodeMirror `HighlightStyle` em-relative sizes
- `SplitDiffViewer.tsx` CSS custom property references
- `global-error.tsx` CSS 미로드 fallback
- `*.stories.tsx` checker 제외 파일

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-03-25 | CHS typography design system 문서 신설 |
