# DMS API 가이드

> 최종 업데이트: 2026-04-22

DMS 프로젝트의 same-origin Next Route Handler 및 `apps/server` DMS module API에 대한 가이드입니다.

---

## API 개요

DMS는 Next.js App Router의 Route Handlers를 브라우저 진입점으로 사용하고, 주요 business 경로는 `apps/server` DMS module로 프록시됩니다.

현재 contract 요약:

- markdown document body 는 Git-managed working tree(`DMS_MARKDOWN_ROOT`)에만 저장합니다.
- image / attachment / reference 같은 binary asset 은 provider-backed non-Git storage root(`DMS_STORAGE_*_BASE_PATH`)에 저장합니다.

응답 규약:

- 성공: `200/2xx + raw JSON data`
- 실패: `4xx/5xx + { "error": "..." }`
- 예외: `/api/ask`, `/api/create`, `/api/storage/open` 은 성공 시 각각 스트림/바이너리/redirect 응답을 반환할 수 있음
- 프론트 `lib/api/core.ts` 는 위 규약을 기준으로 `{ success, data?, error? }` 로 정규화합니다.

### 엔드포인트 목록

| 카테고리 | 엔드포인트 | 설명 |
|----------|-----------|------|
| **파일 관리** | `/api/file` | 단일 파일 CRUD |
| | `/api/files` | 파일 트리 조회 |
| | `/api/file/raw` | storage-backed 이미지 바이너리 서빙 (GET, 로그인 세션 기반) |
| | `/api/file/upload-image` | 이미지 업로드 (POST, 10MB, non-Git storage provider 기준) |
| | `/api/file/upload-attachment` | 첨부파일 업로드 (POST, 20MB, non-Git storage provider 기준) |
| | `/api/file/serve-attachment` | storage-backed 첨부파일 서빙/다운로드 (GET, 로그인 세션 기반) |
| **AI** | `/api/search` | 문서 기반 검색 (`apps/server` `/api/dms/search` 프록시) |
| | `/api/ask` | 문서 기반 질문 (`apps/server` `/api/dms/ask` 프록시, SSE/JSON 지원) |
| | `/api/create` | 문서 요약 (`apps/server` `/api/dms/create` 프록시, text stream) |
| | `/api/doc-assist` | 인라인 문서 작성/경로 추천 |
| | `/api/chat-sessions` | AI 채팅 세션 조회/저장/삭제 |
| **템플릿** | `/api/templates` | 전역/개인 템플릿 CRUD |
| **운영** | `/api/settings` | 시스템/개인 설정 + Git binding observability snapshot |
| | `/api/collaboration` | 문서별 collaboration / publish / isolation snapshot |
| **저장소** | `/api/storage/upload` | 저장소(Local/SharePoint/NAS) 업로드 |
| | `/api/storage/open` | 문서에 연결된 source file 열기 (`documentPath` 필수) |
| **수집** | `/api/ingest/submit` | 자동 수집 작업 등록 |
| | `/api/ingest/jobs` | 수집 작업 조회 |
| | `/api/ingest/jobs/:id/confirm` | 수집 결과 게시 승인 |

---

## 설정 / 협업 운영 snapshot

- `GET /api/settings` 는 기본적으로 persisted config 를 반환하고, `?includeRuntime=1` 을 붙였을 때 `runtime.git` + `runtime.paths` snapshot 도 함께 반환합니다.
- `runtime.git` 에는 configured root input, resolved configured root, actual Git root, actual remote URL, actual branch, sync state, ahead/behind count, parity 결과, reconcile-needed 사유가 포함됩니다.
- `runtime.paths` 는 markdown root / ingest queue / provider별 storage roots 의 configured value, effective input, resolved path, env override 여부, 존재 여부를 노출합니다. 템플릿은 markdown root 의 `_templates/` 하위에 포함되므로 별도 template root 항목은 불필요합니다.
- 상대 경로 `git.repositoryPath`, `storage.*.basePath`, `ingest.queuePath` 는 process cwd 가 아니라 `apps/web/dms` app root 기준으로 해석됩니다.
- Docker/배포 환경에서는 `DMS_MARKDOWN_ROOT`, `DMS_INGEST_QUEUE_PATH`, `DMS_STORAGE_LOCAL_BASE_PATH` 같은 env override 가 actual runtime path 로 우선할 수 있습니다. 템플릿은 `DMS_MARKDOWN_ROOT/_templates/` 에서 자동으로 제공됩니다.
- settings `POST /api/settings` 는 markdown root 자체를 변경하지 않습니다. markdown working tree root 는 deploy/runtime-managed 경로이고, settings 에서는 runtime snapshot 으로 관측합니다.
- admin 은 같은 settings surface 에서 `bootstrapRemoteUrl`, `bootstrapBranch`, `autoInit` 같은 Git bootstrap 정책은 계속 조정할 수 있습니다.
- Git bootstrap/sync 는 app build-time 이 아니라 server runtime bootstrap/reconcile 단계에서 수행됩니다.
- `GET /api/collaboration?path=...` 는 문서 단위 publish 상태와 path isolation reason 을 반환합니다. release/unlock 은 아직 manual reconcile 범위입니다.

---

## 저장소/딥리서치 운영 정책

세부 운영 정책은 아래 문서를 정본으로 삼습니다.

- `docs/dms/planning/storage-and-second-brain-architecture.md`

핵심:

- 저장소 3종(Local/SharePoint/NAS) 어댑터 기반
- 기본 저장소는 설정값(`storage.defaultProvider`)으로 선택
- 문서/첨부별 오버라이드 지원
- GitLab binding 은 markdown working tree 에만 적용하고, attachment/reference/image 는 non-Git storage root 로 관리
- 기본 챗봇/검색은 위키 중심, 딥리서치는 별도 UI 진입 시만 활성

---

## AI 인증 구조 (Azure OpenAI)

DMS는 다음 구조를 사용합니다.

`React -> Next API Route -> apps/server DMS module -> Azure OpenAI`

- React에서 Azure OpenAI를 직접 호출하지 않습니다.
- `AZURE_CLIENT_SECRET` 같은 민감 정보는 서버에서만 관리합니다.
- `/api/search`, `/api/ask`, `/api/create` 는 DMS Route Handler가 요청을 `apps/server` Nest API로 넘기고, Nest가 Azure OpenAI와 검색 저장소를 직접 다룹니다.
- `/api/doc-assist` 도 포함한 주요 DMS AI/business 경로는 same-origin Route Handler를 거쳐 `apps/server` DMS module로 전달됩니다.
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
  "contextMode": "doc | deep | attachments-only",
  "activeDocPath": "docs/sample.md"
}
```

- `contextMode=doc`: 기본 모드 (문서 중심)
- `contextMode=deep`: 딥리서치 모드 (세컨드브레인 UI 전용)
- `contextMode=attachments-only`: `/api/ask` 전용 첨부 파일 우선 모드
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
- 저장 구조: 템플릿 본문은 문서 Git 레포의 `_templates/` 하위(`_templates/system/<id>.md` 또는 `_templates/personal/<id>.md`)에 저장되며 GitLab과 자동 동기화됩니다. 메타데이터 정본은 `dms.dm_template_m.metadataJson`

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
  "sourcePath": "system/template-id.md"
}
```

- `DELETE /api/templates`

```json
{
  "id": "template-id"
}
```

---

## 저장소 열기 API (`/api/storage/open`)

- `POST /api/storage/open`
  - body: `{ documentPath, storageUri?, provider?, path? }`
- `GET /api/storage/open`
  - query: `documentPath|storageUri|provider|path|name|download`
  - `documentPath` 는 항상 필요합니다.

- `POST /api/storage/resync`
  - body: `{ documentPath, storageUri?|provider?|path? }`
  - 문서에 연결된 source file registry 항목을 실제 저장소 파일 기준으로 다시 읽어 `size`, `versionId`, `etag`, `checksum`, `storageUri/provider` projection 을 갱신합니다.

정책:

- `open` 은 provider 종류와 무관하게 `canReadDocuments` + 문서 read ACL 계약을 따릅니다.
- 즉, `documentPath` 가 필요하고, 해당 문서 DB projection/source-file registry 안에 요청한 `path` 또는 `storageUri` 와 일치하는 항목이 있어야 합니다.
- `resync` 는 `canManageStorage` 권한에서만 허용되며, 같은 linked source-file match 계약을 다시 사용합니다.
- `GET /api/storage/open` 은 provider별 external `webUrl` 이 있으면 redirect 하고, 없으면 same-origin binary 응답으로 fallback 합니다.

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

## 4. GET /api/file/raw

문서에 연결된 storage-backed 이미지 asset path(`_assets/images/...`)를 raw 바이너리로 반환합니다. 브라우저 요청에 `Authorization` 헤더가 없더라도, same-origin 프록시가 shared session cookie로 access token을 복원한 뒤 server `canReadDocuments` 와 문서 read ACL 을 검사합니다.

### Request

```http
GET /api/file/raw?path=_assets/images/abc123.png
```

### 지원 형식

PNG, JPEG, GIF, WebP, SVG

### Response

바이너리 (Content-Type에 맞는 이미지 데이터, `Cache-Control: private, max-age=3600, must-revalidate`)

---

## 5. POST /api/file/upload-image

이미지 파일을 업로드합니다. SHA-256 해시 기반 중복 제거를 적용합니다.

### Request

```http
POST /api/file/upload-image
Content-Type: multipart/form-data

file: (바이너리)
```

- 최대 크기: 10MB
- 허용 형식: `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `image/svg+xml`

### Response

```json
{
  "success": true,
  "path": "_assets/images/a1b2c3...64자해시.png",
  "fileName": "a1b2c3...64자해시.png"
}
```

동일 내용의 파일 재업로드 시 기존 경로를 반환합니다 (디스크 쓰기 없음).

---

## 6. POST /api/file/upload-attachment

첨부파일을 업로드합니다. SHA-256 해시 기반 중복 제거를 적용합니다.

### Request

```http
POST /api/file/upload-attachment
Content-Type: multipart/form-data

file: (바이너리)
```

- 최대 크기: 20MB
- 허용 확장자: `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`, `.txt`, `.csv`, `.json`, `.xml`, `.yaml`, `.yml`, `.md`, `.html`, `.htm`, `.rtf`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`, `.bmp`, `.tiff`, `.ico`

### Response

```json
{
  "success": true,
  "path": "_assets/attachments/a1b2c3...64자해시.pdf",
  "fileName": "a1b2c3...64자해시.pdf",
  "size": 123456,
  "type": "application/pdf"
}
```

---

## 7. GET /api/file/serve-attachment

첨부파일을 서빙하거나 다운로드합니다. same-origin 프록시는 shared session cookie로 access token을 복원할 수 있으며, server는 `canReadDocuments` 와 linked-document read ACL 을 다시 검사합니다.

### Request

```http
GET /api/file/serve-attachment?path=_assets/attachments/hash.pdf&name=원본파일명.pdf&download=1
```

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `path` | ✅ | storage-relative asset path (`_assets/attachments/...` 등) |
| `name` | ❌ | 원본 파일명 (Content-Disposition에 사용) |
| `download` | ❌ | `1`이면 attachment, 미지정이면 inline |

### Response

바이너리 (Content-Type/Content-Disposition 헤더 포함, `Cache-Control: private, no-store`)

---

## 8. POST /api/search

문서 기반 키워드 검색을 수행합니다.

> 현재 DMS 라우트는 `apps/server`의 `/api/dms/search`로 프록시됩니다. DMS 앱 셸은 로그인 필수이며, same-origin 프록시는 `Authorization` 헤더나 공유 인증 쿠키를 upstream으로 전달합니다. 서버의 일부 검색 엔드포인트는 compatibility 차원에서 optional JWT 동작을 유지할 수 있지만, DMS 웹앱 기준 anonymous-first 진입은 더 이상 기본 정책이 아닙니다.

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
      "id": "guides/guide.md",
      "title": "Guide",
      "excerpt": "...",
      "path": "guides/guide.md",
      "score": 2
    }
  ]
}
```

---

## 9. POST /api/ask

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
      "id": "guides/guide.md",
      "title": "Guide",
      "excerpt": "...",
      "path": "guides/guide.md",
      "score": 3
    }
  ]
}
```

---

## 문서 metadata projection 구조

각 markdown 문서는 same-name JSON/sidecar 파일을 생성하지 않습니다.

- metadata 정본은 DB control-plane projection 입니다.
- `GET /api/content/metadata` 가 canonical read surface 이고, `/api/file` / `/api/content` 는 같은 projection(또는 in-memory default metadata)을 함께 반환합니다.

예: `guides/guide.md` 의 `/api/content/metadata` 응답

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
| 2026-04-22 | external runtime path / markdown-only Git binding / non-Git binary storage 계약에 맞춰 `file/raw`, `serve-attachment`, `storage/open`, template metadata 설명을 정리 |
| 2026-03-17 | 파일 업로드/첨부 API 추가 (upload-image, upload-attachment, serve-attachment), 해시 기반 중복 제거 |
| 2026-02-24 | Codex 품질 게이트 엄격 모드 적용에 맞춰 문서 메타 섹션 보강 |
