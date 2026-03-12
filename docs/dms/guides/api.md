# DMS API 가이드

> 최종 업데이트: 2026-02-25

DMS 프로젝트의 API 엔드포인트에 대한 가이드입니다.

---

## API 개요

DMS는 Next.js App Router의 Route Handlers를 사용합니다.

응답 규약:

- 성공: `200/2xx + raw JSON data`
- 실패: `4xx/5xx + { "error": "..." }`
- 예외: `/api/ask`, `/api/create`, `/api/storage/open` 은 성공 시 각각 스트림/바이너리 응답을 반환할 수 있음
- 프론트 `lib/api/core.ts` 는 위 규약을 기준으로 `{ success, data?, error? }` 로 정규화합니다.

### 엔드포인트 목록

| 카테고리 | 엔드포인트 | 설명 |
|----------|-----------|------|
| **파일 관리** | `/api/file` | 단일 파일 CRUD |
| | `/api/files` | 파일 트리 조회 |
| **AI** | `/api/search` | 문서 기반 검색 |
| | `/api/ask` | 문서 기반 질문 |
| | `/api/create` | 문서 요약(레거시 호환) |
| | `/api/doc-assist` | 인라인 문서 작성/경로 추천 |
| | `/api/chat-sessions` | AI 채팅 세션 조회/저장/삭제 |
| **템플릿** | `/api/templates` | 전역/개인 템플릿 CRUD |
| **저장소** | `/api/storage/upload` | 저장소(Local/SharePoint/NAS) 업로드 |
| | `/api/storage/open` | 참조 파일 열기 URL/링크 반환 |
| **수집** | `/api/ingest/submit` | 자동 수집 작업 등록 |
| | `/api/ingest/jobs` | 수집 작업 조회 |
| | `/api/ingest/jobs/:id/confirm` | 수집 결과 게시 승인 |

---

## 저장소/딥리서치 운영 정책

세부 운영 정책은 아래 문서를 정본으로 삼습니다.

- `docs/dms/planning/storage-and-second-brain-architecture.md`

핵심:

- 저장소 3종(Local/SharePoint/NAS) 어댑터 기반
- 기본 저장소는 설정값(`storage.defaultProvider`)으로 선택
- 문서/첨부별 오버라이드 지원
- 기본 챗봇/검색은 위키 중심, 딥리서치는 별도 UI 진입 시만 활성

---

## AI 인증 구조 (Azure OpenAI)

DMS는 다음 구조를 사용합니다.

`React -> Next API Route -> server/services/ai/provider.ts -> Azure OpenAI`

- React에서 Azure OpenAI를 직접 호출하지 않습니다.
- `AZURE_CLIENT_SECRET` 같은 민감 정보는 서버에서만 관리합니다.
- 백엔드는 Entra ID 토큰을 자동 갱신하여 Azure OpenAI를 호출합니다.
- Entra 토큰 취득 실패 시 `AZURE_OPENAI_API_KEY` 경로로 폴백할 수 있습니다.

### 권장 환경 변수

```bash
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=<chat-deployment>
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=<embedding-deployment>
OPENAI_API_VERSION=2024-10-21

AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
AZURE_USE_MANAGED_IDENTITY=true
AZURE_MANAGED_IDENTITY_CLIENT_ID=
```

---

## AI 채팅 세션 API (`/api/chat-sessions`)

브라우저 메모리 세션과 별개로, 선택한 채팅 세션만 DB에 저장/복원할 때 사용합니다.

### GET /api/chat-sessions

Query:

- `clientId` (필수, 영문/숫자/`_`/`-`, 8~80자)
- `limit` (선택, 기본 50, 최대 200)

Response:

```json
[
  {
    "id": "session_20260223_120000",
    "title": "릴리즈 체크리스트 정리",
    "createdAt": "2026-02-23T07:00:00.000Z",
    "updatedAt": "2026-02-23T07:30:00.000Z",
    "messages": [],
    "persistedToDb": true
  }
]
```

### POST /api/chat-sessions

Request:

```json
{
  "clientId": "assistant_client_abcd1234",
  "session": {
    "id": "session_20260223_120000",
    "title": "릴리즈 체크리스트 정리",
    "createdAt": "2026-02-23T07:00:00.000Z",
    "updatedAt": "2026-02-23T07:30:00.000Z",
    "messages": []
  }
}
```

검증:

- `session.id`: 영문/숫자/`._:-` 허용, 8~120자
- `title`: 1~120자
- `messages`: 최대 200개, 직렬화 기준 512KB 이하

### DELETE /api/chat-sessions

Request:

```json
{
  "clientId": "assistant_client_abcd1234",
  "sessionId": "session_20260223_120000"
}
```

Error:

- `400`: 입력 형식 검증 실패
- `500`: DB 처리 실패

---

## AI 모드 파라미터 (`/api/ask`, `/api/search`)

요청 바디 확장 필드:

```json
{
  "contextMode": "wiki | deep",
  "activeDocPath": "docs/sample.md"
}
```

- `contextMode=wiki`: 기본 모드 (위키 중심)
- `contextMode=deep`: 딥리서치 모드 (세컨드브레인 UI 전용)
- `activeDocPath`: 딥리서치 기준 문서 경로

딥리서치 응답은 출처와 신뢰도 필드를 포함해야 합니다.

```json
{
  "answer": "...",
  "confidence": "high | medium | low",
  "citations": [
    {
      "title": "원본 문서명",
      "storageUri": "sp://site/library/itemId",
      "versionId": "v12",
      "webUrl": "https://..."
    }
  ]
}
```

---

## 문서 인라인 작성 API (`/api/doc-assist`)

### Compose

```json
{
  "instruction": "요구사항에 맞게 섹션 다시 작성",
  "currentContent": "# 문서...",
  "selectedText": "선택된 기존 문장",
  "activeDocPath": "design/order/request.md",
  "templates": [],
  "summaryFiles": []
}
```

Response:

```json
{
  "text": "생성된 마크다운 본문",
  "applyMode": "replace-document",
  "suggestedPath": "design/order/request.md",
  "relevanceWarnings": []
}
```

- `applyMode`:
  - `replace-selection`: 선택 영역 치환
  - `append`: 문서 하단 추가
  - `replace-document`: 문서 전체 치환

### Recommend Path

```json
{
  "action": "recommendPath",
  "instruction": "주문 요청 설계서 작성",
  "templates": [],
  "summaryFiles": []
}
```

Response:

```json
{
  "suggestedPath": "design/order/request.md",
  "relevanceWarnings": []
}
```

---

## 템플릿 API (`/api/templates`)

- `GET`: 전역 템플릿 + 개인 템플릿 조회
- `POST`: 템플릿 생성/수정 (`scope=global|personal`, `kind=document|folder`)
- `DELETE`: 템플릿 삭제 (`id`, `scope`)

정책:

- 개인 템플릿: 사용자 개인 작성 템플릿(템플릿 승격 결과)
- 전역 템플릿: 설정 페이지에서 관리자 CRUD 후 전체 사용자 공유
- 저장 구조: 템플릿 본문은 `data/templates/**/*.md`, 메타데이터는 같은 경로의 `.sidecar.json`

응답 포맷:

- `GET /api/templates`

```json
{
  "global": [],
  "personal": {}
}
```

- `POST /api/templates`

```json
{
  "id": "template-id",
  "name": "템플릿 이름",
  "scope": "global",
  "kind": "document",
  "content": "# 템플릿 본문",
  "updatedAt": "2026-02-25T00:00:00.000Z",
  "sourceType": "markdown-file",
  "sourcePath": "global/template-id.md"
}
```

- `DELETE /api/templates`

```json
{
  "id": "template-id"
}
```

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
    "accessedAt": "2026-02-02T12:30:00.000Z",
    "document": {
      "title": "README",
      "summary": "",
      "tags": [],
      "sourceLinks": [],
      "createdAt": "2026-02-02T10:00:00.000Z",
      "updatedAt": "2026-02-09T09:00:00.000Z",
      "fileHashes": {
        "content": "sha256...",
        "sources": {}
      },
      "chunkIds": [],
      "embeddingModel": "",
      "sourceFiles": [],
      "acl": {
        "owners": [],
        "editors": [],
        "viewers": []
      },
      "versionHistory": [],
      "templateId": "default",
      "author": "admin"
    }
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

---

## 4. POST /api/search

문서 기반 키워드 검색을 수행합니다.

### Request

```json
{
  "query": "검색어"
}
```

### Response

```json
{
  "query": "검색어",
  "results": [
    {
      "id": "data/wiki/guide.md",
      "title": "Guide",
      "excerpt": "...",
      "path": "guide.md",
      "score": 2
    }
  ]
}
```

---

## 5. POST /api/ask

문서 기반 질문을 처리합니다.

### Request

```json
{
  "query": "질문 내용"
}
```

### Response

```json
{
  "query": "질문 내용",
  "answer": "관련 문서 2건을 찾았습니다...",
  "sources": [
    {
      "id": "data/wiki/guide.md",
      "title": "Guide",
      "excerpt": "...",
      "path": "guide.md",
      "score": 3
    }
  ]
}
```

---

## 문서 메타데이터(JSON) 구조

각 마크다운 문서는 동일한 이름의 JSON 파일이 함께 생성됩니다.

예: `data/wiki/guide.md` → `data/wiki/guide.json`

```json
{
  "title": "Guide",
  "summary": "",
  "tags": [],
  "sourceLinks": [],
  "createdAt": "2026-02-09T09:00:00.000Z",
  "updatedAt": "2026-02-09T09:00:00.000Z",
  "fileHashes": {
    "content": "sha256...",
    "sources": {}
  },
  "chunkIds": [],
  "embeddingModel": "",
  "sourceFiles": [],
  "acl": {
    "owners": [],
    "editors": [],
    "viewers": []
  },
  "versionHistory": [],
  "templateId": "default",
  "author": "admin"
}
```
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

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-24 | Codex 품질 게이트 엄격 모드 적용에 맞춰 문서 메타 섹션 보강 |
