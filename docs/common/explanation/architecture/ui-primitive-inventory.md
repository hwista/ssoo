---
title: UI Primitive Inventory
owner: platform-team
status: active
lastReviewed: 2026-06-19
---

# UI Primitive Inventory

SSOO 원자 UI 컴포넌트는 `@ssoo/web-ui`를 플랫폼 pool로 삼는다. 특정 앱이 지금 쓰지 않는 원자라도 플랫폼 구현으로 등록하며, inventory에 오른 원자는 앱 로컬 구현을 둘 수 없다.

## 정본 파일

- machine-readable inventory: `packages/web-ui/primitive-inventory.json`
- platform implementation: `packages/web-ui/src/*.tsx`
- gate script: `.github/scripts/verify-ui-primitives.js`
- consumption gate script: `.github/scripts/verify-ui-consumption.js`

## 상태 모델

원자 UI inventory는 단일 상태만 허용한다.

| 상태 | 의미 | 앱 로컬 구현 |
|------|------|--------------|
| `platform` | `@ssoo/web-ui`가 recipe와 구현을 소유 | `components/ui/*` thin re-export만 허용 |

중간 상태, 로컬 전용 상태, 앱 전용 상태는 허용하지 않는다. 앱에서 먼저 구현하고 나중에 승격하는 흐름도 금지한다.

## 현재 platform 원자

| 원자 | 정본 exports |
|------|--------------|
| AlertDialog | `AlertDialog`, `AlertDialogPortal`, `AlertDialogOverlay`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel` |
| Avatar | `Avatar`, `AvatarImage`, `AvatarFallback` |
| Badge | `Badge`, `BadgeProps`, `badgeVariants` |
| Button | `Button`, `ButtonProps`, `buttonVariants` |
| Card | `Card`, `CardHeader`, `CardFooter`, `CardTitle`, `CardDescription`, `CardContent` |
| Checkbox | `Checkbox` |
| Dialog | `Dialog`, `DialogPortal`, `DialogOverlay`, `DialogTrigger`, `DialogClose`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogSurface`, `DialogBody` |
| Divider/Separator | `Divider`, `DividerProps`, `Separator` |
| Dropdown/DropdownMenu | `Dropdown`, `Option`, `DropdownProps`, `OptionProps`, `DropdownMenu*` |
| Input | `Input` |
| NativeSelect | `NativeSelect` |
| PopupBackdrop | `PopupBackdrop`, `PopupBackdropProps`, `POPUP_BACKDROP_TONE_CLASS`, `POPUP_BACKDROP_ANIMATION_CLASS` |
| ScrollArea | `ScrollArea`, `ScrollAreaProps` |
| SegmentedControl | `SegmentedControl`, `SegmentedControlItem`, `SegmentedControlItemProps`, `SegmentedControlProps` |
| Select | `Select`, `SelectGroup`, `SelectValue`, `SelectTrigger`, `SelectContent`, `SelectLabel`, `SelectItem`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton` |
| Skeleton | `Skeleton` |
| Table | `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption` |
| Textarea | `Textarea` |

## 강제 기준

1. inventory의 모든 primitive는 `platform` 상태여야 한다.
2. `packages/web-ui/src`의 primitive 구현 파일은 inventory에 선언되어야 한다.
3. inventory primitive는 `packages/web-ui/src/index.ts`에서 named/type re-export되어야 하며, gate는 TypeScript AST로 export source와 export name을 대조한다.
4. 앱 `apps/web/*/src/components/ui/*` 파일은 inventory에 등록된 원자만 허용한다.
5. 앱 로컬 `components/ui/*` 파일은 `@ssoo/web-ui` thin named re-export adapter만 허용한다.
6. 앱 로컬 `components/ui/*` 파일 안에서는 `React.forwardRef`, `cva`, `cn`, Radix import, JSX markup, 자체 `className` recipe를 둘 수 없다.
7. `apps/web`, `packages/web-shell`, `packages/web-auth`의 TSX surface는 원시 `button/input/textarea/select/table/thead/tbody/tfoot/tr/th/td`를 직접 렌더링하지 않고 platform primitive를 소비한다.
8. 정적 intrinsic 태그에 interactive role 또는 `onClick+tabIndex`/`onClick+onKeyDown`을 붙여 primitive처럼 쓰는 pseudo-control은 허용하지 않는다.
9. `@ssoo/web-ui` 원자 사용처의 `className`은 layout-only override만 허용한다. Button/Input/NativeSelect/SelectTrigger/Textarea/Checkbox recipe 토큰을 다시 조합하면 실패한다.
10. story 파일은 검증 대상에서 제외한다.

## 실행 지점

- `pnpm run verify:ui-primitives`: inventory와 앱 로컬 adapter를 직접 검증한다.
- `pnpm run verify:ui-consumption`: 앱/공용 web surface의 raw 원자 태그 소비를 검증한다.
- `pnpm run codex:preflight`: 작업 시작/점검 루틴에서 두 gate를 실행한다.
- `pnpm run build`: `build:raw` 진입 전에 두 gate를 실행한다.
- `pnpm run codex:push-guard`: push 전 두 gate를 실행한다.

## 신규 원자 추가 절차

1. 중복 구현 필요성을 전수 확인한다.
2. 공통 recipe를 `packages/web-ui/src/{primitive}.tsx`에 만든다.
3. `packages/web-ui/src/index.ts`에서 export한다.
4. `packages/web-ui/primitive-inventory.json`에 `platform` 상태로 등록한다.
5. 필요한 앱 `components/ui/{primitive}.tsx`는 `@ssoo/web-ui` named re-export adapter로만 만든다.
6. 기존 raw JSX, pseudo-control, recipe class override 소비처를 `@ssoo/web-ui` primitive 또는 앱 thin adapter로 옮긴다.
7. `pnpm run verify:ui-primitives`, `pnpm run verify:ui-consumption`, 대상 앱 빌드를 통과시킨다.

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-06-19 | `SegmentedControl` primitive 추가, export/adapter AST 검증과 pseudo-control/recipe class 중복 차단 기준 반영 |
| 2026-06-18 | 원자 UI raw 태그 소비를 앱/web-shell/web-auth 전역에서 막는 `verify:ui-consumption` 추가 |
| 2026-06-18 | 원자 UI inventory의 중간 상태를 제거하고 모든 원자를 `platform` 단일 상태로 정리 |
| 2026-06-18 | 원자 UI inventory 정본과 `verify:ui-primitives` 강제 기준 추가 |
