# DMS 개발 가이드

> 최종 업데이트: 2026-02-02

DMS 개발 시 참고해야 할 가이드 문서입니다.

---

## 가이드 목록

| 문서 | 설명 |
|------|------|
| [api.md](api.md) | API 엔드포인트 - 파일 CRUD, 트리 조회 |
| [components.md](components.md) | 컴포넌트 가이드 - 폴더 구조, 네이밍 규칙 |
| [hooks.md](hooks.md) | 커스텀 훅 - useEditor, useOpenTabWithConfirm |

---

## 빠른 참조

### 파일 API

```typescript
import { fileApi } from '@/lib/utils/apiClient';

// 파일 읽기
const response = await fileApi.read('docs/readme.md');

// 파일 생성
await fileApi.create({ path: 'docs/new.md', content: '# New' });

// 파일 수정
await fileApi.update('docs/readme.md', { content: '# Updated' });

// 파일 삭제
await fileApi.delete('docs/old.md');
```

### 탭 열기

```typescript
import { useOpenTabWithConfirm } from '@/hooks';

const openTab = useOpenTabWithConfirm();

openTab({
  id: `doc-${filePath}`,
  title: fileName,
  path: `/doc/${filePath}`,
  icon: 'FileText',
});
```

### 스토어 사용

```typescript
import { useTabStore, useFileStore, useEditorStore } from '@/stores';

// 탭 관리
const { tabs, activeTabId, openTab, closeTab } = useTabStore();

// 파일 트리
const { files, loadFileTree, getFileByPath } = useFileStore();

// 에디터
const { content, isEditing, loadFile, saveFile } = useEditorStore();
```

---

## 개발 서버 실행

```bash
cd apps/web/dms
npm install
npm run dev
```

기본 포트: `http://localhost:3001`

---

## 관련 문서

### 아키텍처
- [tech-stack.md](../architecture/tech-stack.md) - 기술 스택
- [state-management.md](../architecture/state-management.md) - 상태 관리
- [frontend-standards.md](../architecture/frontend-standards.md) - 개발 표준

### 디자인
- [design-system.md](../design/design-system.md) - 디자인 시스템
- [layout-system.md](../design/layout-system.md) - 레이아웃

### 도메인
- [service-overview.md](../domain/service-overview.md) - 서비스 개요
- [concepts.md](../domain/concepts.md) - 도메인 개념
