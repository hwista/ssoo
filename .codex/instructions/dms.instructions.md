---
applyTo: "apps/web/dms/**"
---

# Codex DMS Instructions

> 최종 업데이트: 2026-02-27
> 정본: `.github/instructions/dms.instructions.md`

## 독립성 원칙

| 항목 | DMS | PMS |
|------|-----|-----|
| 패키지 매니저 | **npm** | pnpm |
| @ssoo/* 패키지 | **사용 금지** | 사용 |
| 포트 | **3001** | 3000 |

DMS는 별도 저장소로 분리될 가능성이 있어 모노레포 의존성을 갖지 않습니다.

## 기술 스택

- Next.js 15.x (App Router), React 19.x, TypeScript 5.x
- Tailwind CSS 3.x + Radix UI + MUI (Tree View)
- Zustand 5.x, React Hook Form + Zod
- Tiptap (리치 텍스트 에디터), Marked, react-markdown

## 폴더 구조

```
src/
├── app/                    # Next.js App Router
│   ├── (main)/            # 메인 레이아웃 그룹
│   ├── api/               # API Routes
│   └── layout.tsx
├── components/
│   ├── ui/                # Radix UI 기반 원자
│   ├── common/            # 공통 (editor, viewer, assistant, page)
│   ├── layout/            # AppLayout, Sidebar, Header, TabBar
│   ├── templates/         # 페이지 템플릿
│   └── pages/             # 페이지별 컴포넌트
├── hooks/                 # 커스텀 훅
├── lib/                   # 유틸리티
├── stores/                # Zustand 스토어
├── types/                 # 타입 정의
server/                    # 서버 레이어 (handlers, services) - src 외부
```

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

## Zustand 스토어 패턴

```typescript
// State/Actions 인터페이스 분리
interface TabStoreState { tabs: TabItem[]; activeTabId: string | null; }
interface TabStoreActions { openTab: (options: OpenTabOptions) => string; }

const useTabStore = create<TabStoreState & TabStoreActions>()(
  persist((set, get) => ({ /* ... */ }), { name: 'tab-store' })
);
```

## Tiptap 에디터 규칙

- 필수 익스텐션: StarterKit, Placeholder, Link, Image, CodeBlockLowlight
- `editor.commands` 사용, DOM 직접 조작 금지
- innerHTML 직접 설정 금지

## MUI Tree View 패턴

```typescript
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';

<SimpleTreeView
  expandedItems={expandedFolders}
  onExpandedItemsChange={(_, ids) => setExpandedFolders(ids)}
  selectedItems={selectedFile}
  onSelectedItemsChange={(_, id) => handleFileSelect(id)}
>
  {renderTree(fileNodes)}
</SimpleTreeView>
```

## 타입 정의 규칙

```typescript
// 인터페이스와 구현 일치 - 타입에 없는 필드 추가 금지
export interface TabItem {
  id: string;
  title: string;
  closable: boolean;
  openedAt: Date;
}
```

## Export 규칙

```typescript
// ✅ 명시적 re-export
export { Button } from './Button';
// ❌ 와일드카드 금지
export * from './components';
```

## 레이아웃 치수

| 영역 | 값 |
|------|-----|
| Header | 56px |
| Sidebar (펼침) | 280px |
| Sidebar (접힘) | 48px |
| TabBar | 40px |

## 컴포넌트 크기 가이드

| 유형 | 권장 라인 | 초과 시 |
|------|----------|---------|
| UI 컴포넌트 | ~50줄 | 분리 검토 |
| Common 컴포넌트 | ~150줄 | 책임 분리 |
| Template | ~200줄 | 하위 추출 |
| Page | ~150줄 | 훅/스토어 이동 |

## 금지 사항

1. **@ssoo/* 패키지 import** - DMS는 독립 프로젝트
2. **BaseService 등 불필요한 추상화**
3. **any 타입 사용**
4. **와일드카드 export**
5. **미사용 코드 커밋**
6. **타입에 없는 필드 추가**

## 검증

| 용도 | 명령어 |
|------|--------|
| 빌드 | `pnpm run build:web-dms` |
| DMS 가드 | `pnpm run codex:dms-guard` |
| 배포 | `pnpm run codex:dms-publish` (GitHub + GitLab 동시) |

## 양방향 배포

- DMS 변경 커밋을 외부 공유할 때 `pnpm run codex:dms-publish` 사용
- GitHub 브랜치 push + GitLab subtree push + 해시 검증 한 번에 수행
- 필수 환경 변수: `GL_USER`, `GL_TOKEN`

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-02-27 | 독립성/기술스택/폴더구조/서버패턴/스토어/에디터/TreeView/타입/Export/치수/크기가이드/금지사항 추가 |
| 2026-02-22 | Codex DMS 정본 신설 |
