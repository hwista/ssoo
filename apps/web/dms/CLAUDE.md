# DMS - Claude Code 가이드

> DMS 작업 시 자동 로드되는 상세 컨텍스트입니다.
> 상위 규칙: 루트 `CLAUDE.md` / 정본: `.github/instructions/dms.instructions.md`

---

## 독립 배포 고려사항

| 항목 | DMS | PMS |
|------|-----|-----|
| 패키지 매니저 | **pnpm workspace** | pnpm |
| 공유 패키지 | `@ssoo/types` 사용 가능 (`@ssoo/database` 직접 참조 금지) | 사용 |
| 포트 | **3001** | 3000 |

DMS는 workspace 앱으로 통합되었지만, 파일/Git/스토리지 런타임과 `src/app/api/* -> server/*` 구조는 독립 배포 가능성을 고려해 유지합니다.

---

## 기술 스택

- Next.js 15.x (App Router), React 19.x, TypeScript 5.x
- Tailwind CSS 3.x + Radix UI
- Zustand 5.x, React Hook Form + Zod
- CodeMirror 6 기반 block editor, react-markdown 기반 viewer

---

## 폴더 구조

```
src/
├── app/                    # Next.js App Router
│   ├── (main)/            # 메인 레이아웃 그룹
│   ├── api/               # API Routes
│   └── layout.tsx
├── components/
│   ├── ui/                # Radix UI 기반 원자
│   ├── common/            # 공통 컴포넌트 (editor, viewer, assistant, page)
│   ├── layout/            # AppLayout, Sidebar, Header, TabBar
│   ├── templates/         # 페이지 템플릿 (DocPageTemplate)
│   └── pages/             # 페이지별 컴포넌트
├── hooks/                 # 커스텀 훅
├── lib/                   # 유틸리티
├── stores/                # Zustand 스토어
├── types/                 # 타입 정의
server/                    # 서버 레이어 (handlers, services) - src 외부
```

---

## 서버 레이어 패턴

```typescript
// Handler: 단순 라우팅, 로직은 서비스로 위임
export async function GET(request: NextRequest) {
  const result = await fileSystemService.getFileTree();
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result.data);
}

// Service: BaseService 없이 싱글톤 export
class FileSystemService {
  async getFileTree(): Promise<ServiceResult<FileNode[]>> { /* ... */ }
}
export const fileSystemService = new FileSystemService();
```

---

## Zustand 스토어 패턴

```typescript
// State/Actions 인터페이스 분리
interface TabStoreState { tabs: TabItem[]; activeTabId: string | null; }
interface TabStoreActions { openTab: (options: OpenTabOptions) => string; }

const useTabStore = create<TabStoreState & TabStoreActions>()(
  persist((set, get) => ({ /* ... */ }), { name: 'tab-store' })
);
```

---

## Block Editor 규칙

- DMS의 핵심 에디터는 `CodeMirror 6` 기반 block editor이다
- `Editor`는 orchestration, `BlockEditor`는 CodeMirror bridge 역할만 맡는다
- 선택 범위와 커서는 editor runtime이 직접 보존한다
- 전체 reset은 실제 markdown content 변경 시에만 수행한다
- `window.prompt()` / `window.open()` 직접 호출 대신 interaction contract를 사용한다
- 파일 트리는 MUI Tree View가 아니라 현재 custom tree renderer 기준으로 유지한다

---

## 레이아웃 치수

| 영역 | 값 |
|------|-----|
| Header | 56px |
| Sidebar (펼침) | 280px |
| Sidebar (접힘) | 48px |
| TabBar | 40px |

---

## 컴포넌트 크기 가이드

| 유형 | 권장 라인 | 초과 시 조치 |
|------|----------|-------------|
| UI 컴포넌트 | ~50줄 | 분리 검토 |
| Common 컴포넌트 | ~150줄 | 책임 분리 |
| Template | ~200줄 | 하위 컴포넌트 추출 |
| Page | ~150줄 | 로직을 훅/스토어로 이동 |

---

## 금지 사항

1. **`@ssoo/database` 직접 import** - DMS는 웹 앱이며 DB 접근은 서버/플랫폼 경계를 통해 관리
2. **BaseService 등 불필요한 추상화**
3. **any 타입 사용**
4. **와일드카드 export**
5. **미사용 코드 커밋**
6. **타입에 없는 필드 추가**

---

## 빌드 & 검증

| 용도 | 명령어 |
|------|--------|
| 빌드 | `pnpm run build:web-dms` |
| DMS 가드 | `pnpm run codex:dms-guard` |
| GitLab workspace 동기화 | `pnpm run codex:workspace-sync-from-gitlab` (legacy alias: `codex:dms-sync-from-gitlab`) |
| 배포 | `pnpm run codex:workspace-publish` (GitHub + GitLab workspace 동시, legacy alias: `codex:dms-publish`) |
