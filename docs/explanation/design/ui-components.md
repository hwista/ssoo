# UI 컴포넌트

> 최종 업데이트: 2026-02-02

DMS에서 사용하는 UI 컴포넌트 목록과 사용법을 정의합니다.

---

## 컴포넌트 개요

DMS는 **Radix UI**를 기반으로 primitive 컴포넌트를 구성합니다.

```
src/components/ui/
├── alert-dialog.tsx    # 경고 대화상자
├── button.tsx          # 버튼
├── card.tsx            # 카드
├── dialog.tsx          # 모달 대화상자
├── divider.tsx         # 구분선
├── dropdown.tsx        # 드롭다운 메뉴
├── scroll-area.tsx     # 스크롤 영역
└── tooltip.tsx         # 툴팁
```

---

## Button

버튼 컴포넌트

### Variants

| Variant | 용도 | 스타일 |
|---------|------|--------|
| `default` | 기본 | 파랑 배경, 흰색 텍스트 |
| `secondary` | 보조 | 회색 배경, 검정 텍스트 |
| `outline` | 외곽선 | 투명 배경, 테두리 |
| `ghost` | 투명 | 배경 없음, 호버 시 배경 |
| `link` | 링크 | 밑줄, 파랑 텍스트 |
| `destructive` | 삭제 | 빨강 배경, 흰색 텍스트 |

### Sizes

| Size | 용도 | 크기 |
|------|------|------|
| `sm` | 작은 버튼 | h-8, px-3, text-xs |
| `default` | 기본 | h-9, px-4, text-sm |
| `lg` | 큰 버튼 | h-10, px-6 |
| `icon` | 아이콘 전용 | h-9, w-9 |

### 사용 예

```tsx
import { Button } from '@/components/ui/button';

<Button variant="default" size="sm">저장</Button>
<Button variant="ghost" size="icon"><X /></Button>
<Button variant="destructive">삭제</Button>
```

---

## AlertDialog

경고 대화상자 - 확인/취소가 필요한 액션

### 구조

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">삭제</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
      <AlertDialogDescription>
        이 작업은 되돌릴 수 없습니다.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>취소</AlertDialogCancel>
      <AlertDialogAction>삭제</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 전역 ConfirmDialog

`useConfirmStore`와 연동된 전역 대화상자:

```tsx
// common/ConfirmDialog.tsx에서 자동 렌더링
const { confirm } = useConfirmStore();

const result = await confirm({
  title: '탭 초과',
  description: '가장 오래된 탭을 닫을까요?',
  confirmText: '닫기',
  cancelText: '취소',
});
```

---

## Dialog

모달 대화상자 - 일반 콘텐츠 표시

### 구조

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <Button>열기</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>제목</DialogTitle>
      <DialogDescription>설명</DialogDescription>
    </DialogHeader>
    <div>콘텐츠</div>
    <DialogFooter>
      <Button>확인</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Dropdown

드롭다운 메뉴

### 구조

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreHorizontal />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={handleEdit}>
      <Pencil className="mr-2 h-4 w-4" />
      수정
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={handleDelete} className="text-red-600">
      <Trash className="mr-2 h-4 w-4" />
      삭제
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## ScrollArea

커스텀 스크롤 영역

### 사용 예

```tsx
<ScrollArea className="h-[400px]">
  <div className="p-4">
    {/* 긴 콘텐츠 */}
  </div>
</ScrollArea>
```

### 특징

- Radix ScrollArea 기반
- 커스텀 스크롤바 스타일
- 가로/세로 스크롤 지원

---

## Tooltip

툴팁

### 사용 예

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="icon"><Info /></Button>
  </TooltipTrigger>
  <TooltipContent>
    추가 정보
  </TooltipContent>
</Tooltip>
```

### Provider

앱 루트에 `TooltipProvider` 필요:

```tsx
// providers.tsx
<TooltipProvider>
  {children}
</TooltipProvider>
```

---

## Card

카드 컨테이너

### 구조

```tsx
<Card>
  <CardHeader>
    <CardTitle>제목</CardTitle>
    <CardDescription>설명</CardDescription>
  </CardHeader>
  <CardContent>
    콘텐츠
  </CardContent>
  <CardFooter>
    <Button>액션</Button>
  </CardFooter>
</Card>
```

---

## Divider

구분선

### 사용 예

```tsx
<Divider />                    {/* 가로 구분선 */}
<Divider orientation="vertical" />  {/* 세로 구분선 */}
```

---

## PMS 대비 차이점

| 항목 | PMS (shadcn/ui) | DMS (Radix UI) |
|------|-----------------|----------------|
| 스타일 | 사전 정의된 스타일 | 직접 스타일링 |
| 테마 | CVA variants | Tailwind 직접 |
| 컴포넌트 수 | 다수 (30+) | 최소 (8개) |
| 폼 컴포넌트 | Input, Select, Checkbox... | 없음 (에디터만) |

---

## 관련 문서

- [design-system.md](design-system.md) - 색상, 타이포그래피
- [component-hierarchy.md](component-hierarchy.md) - 컴포넌트 계층
