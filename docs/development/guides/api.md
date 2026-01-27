# DMS API 가이드

> 최종 업데이트: 2026-01-27

DMS 프로젝트의 API 엔드포인트에 대한 상세 가이드입니다.

---

## API 개요

DMS는 Next.js App Router의 Route Handlers를 사용합니다.

### 엔드포인트 목록

| 카테고리 | 엔드포인트 | 설명 |
|----------|-----------|------|
| **파일 관리** | `/api/file` | 단일 파일 CRUD |
| | `/api/files` | 파일 트리 조회 |
| | `/api/upload` | 파일 업로드 |
| | `/api/watch` | 실시간 파일 감시 (SSE) |
| **검색** | `/api/search` | 통합 검색 |
| | `/api/text-search` | 텍스트 전문 검색 |
| | `/api/index` | 검색 인덱싱 |
| **AI** | `/api/gemini` | Gemini AI 호출 |
| | `/api/ask` | AI 질문 응답 |
| **협업** | `/api/collaborate` | 협업 세션 |
| | `/api/comments` | 댓글 관리 |
| | `/api/versions` | 버전 히스토리 |
| | `/api/notifications` | 알림 관리 |
| **관리** | `/api/users` | 사용자 관리 |
| | `/api/permissions` | 권한 관리 |
| | `/api/tags` | 태그 관리 |
| | `/api/templates` | 템플릿 목록 |
| | `/api/plugins` | 플러그인 관리 |
| | `/api/git` | Git 연동 |

---

## 1. 파일 관리 API

### 1.1 GET /api/file

단일 파일 내용을 조회합니다.

**Request**:
```http
GET /api/file?path=docs/README.md
```

또는 헤더 사용:
```http
GET /api/file
X-File-Path: docs/README.md
```

**Response**:
```json
{
  "content": "# README\n\n내용...",
  "metadata": {
    "size": 1234,
    "createdAt": "2026-01-27T10:00:00.000Z",
    "modifiedAt": "2026-01-27T12:00:00.000Z",
    "accessedAt": "2026-01-27T12:30:00.000Z"
  }
}
```

**Error Responses**:
| 코드 | 설명 |
|------|------|
| 400 | 파일 경로 누락 |
| 404 | 파일 없음 |
| 500 | 서버 오류 |

---

### 1.2 POST /api/file

파일 CRUD 작업을 수행합니다.

**Actions**:

#### `read` - 파일 읽기
```json
{
  "action": "read",
  "path": "docs/guide.md"
}
```

#### `write` - 파일 저장
```json
{
  "action": "write",
  "path": "docs/guide.md",
  "content": "# Guide\n\n새 내용"
}
```

#### `create` - 파일 생성
```json
{
  "action": "create",
  "name": "new-file.md",
  "parent": "docs",
  "content": "# New File"
}
```

#### `createFolder` - 폴더 생성
```json
{
  "action": "createFolder",
  "path": "docs/new-folder"
}
```

또는:
```json
{
  "action": "createFolder",
  "name": "new-folder",
  "parent": "docs"
}
```

#### `rename` - 이름 변경
```json
{
  "action": "rename",
  "oldPath": "docs/old-name.md",
  "newPath": "docs/new-name.md"
}
```

#### `delete` - 삭제
```json
{
  "action": "delete",
  "path": "docs/to-delete.md"
}
```

#### `metadata` - 메타정보 조회
```json
{
  "action": "metadata",
  "path": "docs/guide.md"
}
```

**Response**:
```json
{
  "metadata": {
    "size": 1234,
    "createdAt": "2026-01-27T10:00:00.000Z",
    "modifiedAt": "2026-01-27T12:00:00.000Z",
    "accessedAt": "2026-01-27T12:30:00.000Z"
  }
}
```

---

### 1.3 GET /api/files

파일 트리를 조회합니다.

**Request**:
```http
GET /api/files
```

**Response**:
```json
[
  {
    "type": "directory",
    "name": "docs",
    "path": "docs",
    "children": [
      {
        "type": "file",
        "name": "README.md",
        "path": "docs/README.md"
      },
      {
        "type": "directory",
        "name": "guides",
        "path": "docs/guides",
        "children": [...]
      }
    ]
  }
]
```

---

### 1.4 GET /api/watch

Server-Sent Events (SSE)로 파일 변경을 실시간 감지합니다.

**Request**:
```javascript
const eventSource = new EventSource('/api/watch');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('파일 변경:', data);
};
```

**Event Types**:
```typescript
interface WatchEvent {
  type: 'file-changed' | 'file-created' | 'file-deleted' | 'connected';
  path?: string;
  timestamp: number;
}
```

**사용 예제**:
```typescript
useEffect(() => {
  const eventSource = new EventSource('/api/watch');
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
      case 'file-changed':
        handleFileChange(data.path);
        break;
      case 'file-created':
        handleFileCreate(data.path);
        break;
      case 'file-deleted':
        handleFileDelete(data.path);
        break;
    }
  };
  
  return () => eventSource.close();
}, []);
```

---

### 1.5 POST /api/upload

파일을 업로드합니다.

**Request**:
```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('path', 'docs/images');

fetch('/api/upload', {
  method: 'POST',
  body: formData
});
```

**Response**:
```json
{
  "success": true,
  "path": "docs/images/uploaded-file.png",
  "size": 12345
}
```

---

## 2. 검색 API

### 2.1 POST /api/search

통합 검색을 수행합니다.

**Request**:
```json
{
  "query": "검색어",
  "options": {
    "caseSensitive": false,
    "wholeWord": false,
    "regex": false
  }
}
```

**Response**:
```json
{
  "results": [
    {
      "path": "docs/guide.md",
      "matches": [
        {
          "line": 10,
          "content": "이것은 검색어가 포함된 줄입니다.",
          "highlight": [5, 8]
        }
      ]
    }
  ],
  "totalMatches": 5
}
```

---

### 2.2 POST /api/text-search

텍스트 전문 검색을 수행합니다.

**Request**:
```json
{
  "query": "마크다운 문법",
  "limit": 20
}
```

---

## 3. AI API

### 3.1 POST /api/gemini

Google Gemini API를 호출합니다.

**Request**:
```json
{
  "prompt": "마크다운 문서 작성법을 알려주세요.",
  "context": "현재 문서 내용...",
  "options": {
    "temperature": 0.7,
    "maxTokens": 1024
  }
}
```

**Response**:
```json
{
  "response": "마크다운 문서 작성법은 다음과 같습니다...",
  "usage": {
    "promptTokens": 50,
    "completionTokens": 200,
    "totalTokens": 250
  }
}
```

---

### 3.2 POST /api/ask

RAG 기반 AI 질문 응답입니다.

**Request**:
```json
{
  "question": "프로젝트 설정 방법은?",
  "topK": 5
}
```

**Response**:
```json
{
  "answer": "프로젝트 설정 방법은...",
  "sources": [
    {
      "path": "docs/setup.md",
      "relevance": 0.95,
      "excerpt": "관련 내용..."
    }
  ]
}
```

---

## 4. 협업 API

### 4.1 GET /api/versions

파일 버전 히스토리를 조회합니다.

**Request**:
```http
GET /api/versions?path=docs/guide.md
```

**Response**:
```json
{
  "versions": [
    {
      "id": "v3",
      "timestamp": "2026-01-27T12:00:00.000Z",
      "action": "update",
      "size": 1234
    },
    {
      "id": "v2",
      "timestamp": "2026-01-26T10:00:00.000Z",
      "action": "update",
      "size": 1100
    },
    {
      "id": "v1",
      "timestamp": "2026-01-25T09:00:00.000Z",
      "action": "create",
      "size": 500
    }
  ]
}
```

---

### 4.2 POST /api/comments

댓글을 관리합니다.

**Create Comment**:
```json
{
  "action": "create",
  "path": "docs/guide.md",
  "content": "이 부분 수정이 필요합니다.",
  "line": 25
}
```

**List Comments**:
```json
{
  "action": "list",
  "path": "docs/guide.md"
}
```

---

## 5. 에러 코드

### HTTP 상태 코드

| 코드 | 의미 | 설명 |
|------|------|------|
| 200 | OK | 요청 성공 |
| 400 | Bad Request | 잘못된 요청 |
| 404 | Not Found | 파일/리소스 없음 |
| 409 | Conflict | 이미 존재함 |
| 500 | Internal Server Error | 서버 오류 |

### 에러 응답 형식

```json
{
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "파일을 찾을 수 없습니다.",
    "details": {
      "path": "docs/missing.md"
    }
  }
}
```

---

## 6. 클라이언트 사용 예제

### React에서 파일 읽기

```typescript
const loadFile = async (path: string) => {
  try {
    const response = await fetch('/api/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read', path })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.content;
  } catch (error) {
    console.error('파일 로드 실패:', error);
    throw error;
  }
};
```

### React에서 파일 저장

```typescript
const saveFile = async (path: string, content: string) => {
  try {
    const response = await fetch('/api/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'write', path, content })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('파일 저장 실패:', error);
    throw error;
  }
};
```

### 서비스 레이어 사용 (권장)

```typescript
import { fileSystemService } from '@/services';

// 파일 트리 조회
const result = await fileSystemService.getFileTree();
if (result.success) {
  setFiles(result.data);
}

// 파일 읽기
const result = await fileSystemService.readFile('docs/guide.md');
if (result.success) {
  setContent(result.data);
}

// 파일 저장
const result = await fileSystemService.updateFile('docs/guide.md', newContent);
if (result.success) {
  showNotification('success', '저장 완료');
}
```

---

## 관련 문서

- [hooks.md](hooks.md) - useFileSystem 훅 가이드
- [components.md](components.md) - 컴포넌트 가이드
- [service-overview.md](../domain/service-overview.md) - 서비스 개요
