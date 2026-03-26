# 프론트엔드 웹 앱 개발 규칙 템플릿

> `[FRAMEWORK]` 웹 앱 개발 규칙 템플릿
> 
> 이 파일을 복사하여 `.github/instructions/web.instructions.md`로 사용하세요.
> `[PLACEHOLDER]` 부분을 프로젝트에 맞게 수정하세요.

---

```yaml
---
applyTo: "[WEB_PATH]/**"
---
```

# [FRAMEWORK] 웹 앱 개발 규칙

> 이 규칙은 `[WEB_PATH]/` 경로의 파일 작업 시 적용됩니다.

---

## 폴더 구조

> 프로젝트에 맞게 구조를 정의하세요.

```
src/
├── app/                       # 라우팅 (App Router)
│   ├── layout.tsx
│   ├── page.tsx
│   └── [domain]/
│       ├── page.tsx
│       └── [id]/
├── components/
│   ├── ui/                    # 기본 UI 컴포넌트
│   ├── common/                # 공용 컴포넌트
│   └── templates/             # 페이지 템플릿
├── hooks/                     # 커스텀 훅
├── lib/
│   ├── api/                   # API 클라이언트
│   └── utils/                 # 유틸리티
├── stores/                    # 상태 관리
└── types/                     # 타입 정의
```

---

## 컴포넌트 의존성 규칙

```
pages/templates → common → ui
       ↓
    hooks → lib/api → stores
```

- **상위 → 하위만** 참조 가능
- **역방향 참조 금지** (ui → pages ❌)
- **순환 참조 금지**

---

## 컴포넌트 패턴

```[LANGUAGE]
// ✅ 표준: Props 타입 정의, 단일 책임

interface [Component]Props {
  title: string;
  onAction?: () => void;
  children?: React.ReactNode;
}

export function [Component]({ title, onAction, children }: [Component]Props) {
  // 로직

  return (
    <div>
      <h2>{title}</h2>
      {children}
      {onAction && <button onClick={onAction}>액션</button>}
    </div>
  );
}
```

---

## 커스텀 훅 패턴

```[LANGUAGE]
// ✅ 표준: use 접두사, 단일 책임

export function use[Feature]() {
  const [state, setState] = useState<[Type]>(initialValue);

  const action = useCallback(() => {
    // 로직
  }, [dependencies]);

  return {
    state,
    action,
  };
}
```

---

## API 호출 패턴

```[LANGUAGE]
// ✅ 표준: TanStack Query 또는 유사 라이브러리 사용

// hooks/queries/use[Entity].ts
export function use[Entity]s(params: QueryParams) {
  return useQuery({
    queryKey: ['[entity]s', params],
    queryFn: () => api.[entity].getAll(params),
  });
}

export function useCreate[Entity]() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Create[Entity]Dto) => api.[entity].create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['[entity]s'] });
    },
  });
}
```

---

## 상태 관리 패턴

```[LANGUAGE]
// ✅ 표준: Zustand 또는 유사 라이브러리

// stores/use[Store]Store.ts
interface [Store]State {
  items: [Type][];
  selected: [Type] | null;
  setItems: (items: [Type][]) => void;
  selectItem: (item: [Type]) => void;
}

export const use[Store]Store = create<[Store]State>((set) => ({
  items: [],
  selected: null,
  setItems: (items) => set({ items }),
  selectItem: (item) => set({ selected: item }),
}));
```

---

## 폼 패턴

```[LANGUAGE]
// ✅ 표준: React Hook Form + Zod

// 스키마 정의
const [entity]Schema = z.object({
  name: z.string().min(1, '이름은 필수입니다'),
  email: z.string().email('올바른 이메일을 입력하세요'),
});

type [Entity]FormData = z.infer<typeof [entity]Schema>;

// 폼 컴포넌트
export function [Entity]Form({ onSubmit }: Props) {
  const form = useForm<[Entity]FormData>({
    resolver: zodResolver([entity]Schema),
    defaultValues: { name: '', email: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* 필드들 */}
      </form>
    </Form>
  );
}
```

---

## 금지 사항

1. **컴포넌트 내 API 직접 호출** - hooks/queries 사용
2. **props drilling** - Context 또는 상태 관리 사용
3. **인라인 스타일** - Tailwind 클래스 사용
4. **any 타입** - 구체적 타입 정의
5. **useEffect 남용** - 파생 상태는 useMemo, 이벤트는 핸들러로

---

## 테스트 규칙

```[LANGUAGE]
// 컴포넌트 테스트
describe('[Component]', () => {
  it('renders correctly', () => {
    render(<[Component] title="테스트" />);
    expect(screen.getByText('테스트')).toBeInTheDocument();
  });

  it('handles action', async () => {
    const onAction = vi.fn();
    render(<[Component] title="테스트" onAction={onAction} />);
    
    await userEvent.click(screen.getByRole('button'));
    expect(onAction).toHaveBeenCalled();
  });
});
```

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| [DATE] | 초기 버전 |
