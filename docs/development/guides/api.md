# DMS API 가이드

> 최종 업데이트: 2026-02-02

DMS 프로젝트의 API 엔드포인트에 대한 가이드입니다.

---

## API 개요

DMS는 Next.js App Router의 Route Handlers를 사용합니다.

### 엔드포인트 목록

| 카테고리 | 엔드포인트 | 설명 |
|----------|-----------|------|
| **파일 관리** | `/api/file` | 단일 파일 CRUD |
| | `/api/files` | 파일 트리 조회 |

---

## 1. GET /api/file

단일 파일 내용을 조회합니다.

### Request

```http
GET /api/file?path=docs/README.md
```

또는 헤더 사용:

```http
GET /api/file
X-File-Path: docs/README.md
```

### Response

```json
{
  "content": "# README\n\n내용...",
  "metadata": {
    "size": 1234,
    "createdAt": "2026-02-02T10:00:00.000Z",
    "modifiedAt": "2026-02-02T12:00:00.000Z",
    "accessedAt": "2026-02-02T12:30:00.000Z"
  }
}
```

### Error Responses

| 코드 | 설명 |
|------|------|
| 400 | 파일 경로 누락 |
| 404 | 파일 없음 |
| 500 | 서버 오류 |

---

## 2. POST /api/file

파일 CRUD 작업을 수행합니다.

### Actions

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

### Response

```json
{
  "success": true,
  "message": "파일이 저장되었습니다"
}
```

---

## 3. GET /api/files

파일 트리 목록을 조회합니다.

### Request

```http
GET /api/files
```

### Response

```json
{
  "files": [
    {
      "name": "docs",
      "path": "docs",
      "isDirectory": true,
      "children": [
        {
          "name": "README.md",
          "path": "docs/README.md",
          "isDirectory": false
        }
      ]
    }
  ]
}
```

---

## API 사용 예제

### 파일 읽기

```typescript
async function readFile(path: string) {
  const response = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
  if (!response.ok) throw new Error('파일 읽기 실패');
  return response.json();
}
```

### 파일 저장

```typescript
async function saveFile(path: string, content: string) {
  const response = await fetch('/api/file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'write',
      path,
      content,
    }),
  });
  if (!response.ok) throw new Error('파일 저장 실패');
  return response.json();
}
```

### 파일 트리 조회

```typescript
async function getFileTree() {
  const response = await fetch('/api/files');
  if (!response.ok) throw new Error('파일 목록 조회 실패');
  return response.json();
}
```

---

## 에러 처리

모든 API는 일관된 에러 형식을 사용합니다:

```json
{
  "error": "에러 메시지",
  "code": "ERROR_CODE"
}
```

### 공통 에러 코드

| 코드 | 설명 |
|------|------|
| `INVALID_PATH` | 잘못된 파일 경로 |
| `FILE_NOT_FOUND` | 파일 없음 |
| `PERMISSION_DENIED` | 권한 없음 |
| `INTERNAL_ERROR` | 서버 내부 오류 |
