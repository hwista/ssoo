# DMS 도메인 개념

> 최종 업데이트: 2026-02-02

DMS에서 사용하는 핵심 도메인 개념을 정의합니다.

---

## 핵심 개념

### 1. 문서 (Document)

마크다운 파일로 저장되는 콘텐츠 단위

```typescript
interface FileNode {
  name: string;           // 파일명 (확장자 포함)
  path: string;           // 상대 경로
  type: 'file' | 'folder';
  children?: FileNode[];  // 폴더인 경우 하위 항목
}
```

**특징:**
- 로컬 파일시스템에 저장
- `.md`, `.mdx`, `.markdown` 확장자
- 트리 구조로 표현

### 2. 문서 타입 (DocumentType)

문서의 카테고리/용도

```typescript
type DocumentType = 'wiki' | 'blog' | 'dev';
```

| 타입 | 용도 | 저장 경로 |
|------|------|----------|
| `wiki` | 위키 문서 | `docs/wiki/` |
| `blog` | 블로그 포스트 | `docs/blog/` |
| `dev` | 개발 문서 | `docs/dev/` |

### 3. 탭 (Tab)

열린 문서를 나타내는 UI 단위

```typescript
interface TabItem {
  id: string;           // 탭 고유 ID
  title: string;        // 탭 제목
  path: string;         // 문서 경로
  icon?: string;        // 아이콘 이름
  closable: boolean;    // 닫기 가능 여부
  openedAt: Date;       // 열린 시각
  lastActiveAt: Date;   // 마지막 활성화 시각
}
```

**특징:**
- 최대 16개 제한
- Home 탭은 항상 존재
- localStorage에 영속화

### 4. 북마크 (Bookmark)

자주 사용하는 문서 바로가기

```typescript
interface BookmarkItem {
  id: string;       // 북마크 ID
  path: string;     // 문서 경로
  title: string;    // 표시 제목
  addedAt: Date;    // 추가 시각
}
```

**특징:**
- 사용자가 수동 추가
- 사이드바에서 빠른 접근
- localStorage에 영속화

---

## 사이드바 섹션

사이드바의 접이식 영역

```typescript
type SidebarSection = 'bookmarks' | 'openTabs' | 'fileTree' | 'search';
```

| 섹션 | 내용 | 기본 상태 |
|------|------|----------|
| `bookmarks` | 북마크 목록 | 펼침 |
| `openTabs` | 열린 탭 목록 | 펼침 |
| `fileTree` | 파일 트리 | 펼침 |
| `search` | 파일 검색 | 접힘 |

---

## AI 검색 타입

AI 검색 방식

```typescript
type AISearchType = 'gemini' | 'rag';
```

| 타입 | 설명 | 용도 |
|------|------|------|
| `gemini` | Google Gemini AI | 일반 질문, 요약 |
| `rag` | RAG (Retrieval-Augmented Generation) | 문서 기반 검색 |

---

## 디바이스 타입

화면 크기 기준 디바이스 분류

```typescript
type DeviceType = 'mobile' | 'desktop';

const BREAKPOINTS = {
  mobile: 768,
};
```

| 타입 | 조건 | UI |
|------|------|-----|
| `mobile` | width < 768px | 모바일 레이아웃 (추후) |
| `desktop` | width >= 768px | 데스크톱 레이아웃 |

---

## 에디터 상태

마크다운 에디터의 동작 상태

| 상태 | 설명 | 동작 |
|------|------|------|
| 뷰 모드 | `isEditing: false` | 마크다운 렌더링 표시 |
| 편집 모드 | `isEditing: true` | Tiptap 에디터 표시 |

**전환 규칙:**
- 뷰 → 편집: 편집 버튼 클릭
- 편집 → 뷰: 저장 완료 시

---

## 파일 메타데이터

파일의 부가 정보

```typescript
interface FileMetadata {
  createdAt: Date | null;    // 생성 시각
  modifiedAt: Date | null;   // 수정 시각
  size: number | null;       // 파일 크기 (bytes)
}
```

**용도:**
- 문서 정보 표시
- 정렬 기준
- 변경 감지

---

## PMS 대비 차이점

| 개념 | PMS | DMS |
|------|-----|-----|
| 콘텐츠 단위 | 메뉴/페이지 | 파일/폴더 |
| 권한 | 역할 기반 | 없음 |
| 저장소 | 서버 DB | 로컬 파일시스템 |
| 인증 | JWT | 없음 |
| 카테고리 | 메뉴 트리 | 문서 타입 |

---

## 타입 정의 위치

```
src/types/
├── index.ts        # 통합 export
├── layout.ts       # DeviceType, DocumentType, AISearchType
├── sidebar.ts      # SidebarSection, SidebarState
├── tab.ts          # TabItem, OpenTabOptions
└── file.ts         # FileNode, BookmarkItem, FileMetadata
```

---

## 관련 문서

- [service-overview.md](service-overview.md) - 서비스 개요
- [state-management.md](../architecture/state-management.md) - 상태 관리
