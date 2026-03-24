# DMS API 가이드

> 최종 업데이트: 2026-03-23

DMS의 Route Handler, server facade, client API contract 기준을 정리한 문서입니다.

## 응답 규약

non-stream JSON API는 아래 envelope를 사용합니다.

- 성공: `{ "success": true, "data": <payload>, "status": 200 }`
- 실패: `{ "success": false, "error": "...", "status": 4xx|5xx, "code"?: "..." }`
- 정본 타입: `apps/web/dms/server/shared/result.ts` 의 `AppResult<T>`
- route는 `ok`, `fail`, `toNextResponse` helper를 사용합니다.

예외:

- `/api/ask`, `/api/create` 는 SSE/스트리밍 응답
- `/api/doc-assist` 는 기본 compose 시 SSE, `stream=false` 요청만 JSON envelope
- `/api/storage/open`, `/api/file/raw`, `/api/file/serve-attachment` 는 바이너리/외부 열기 응답
- 단, 예외 route도 스트림 시작 전 또는 바이너리 반환 전의 JSON 실패는 envelope를 사용합니다.
- `/api/ask` 의 `stream=false` 응답도 envelope를 사용합니다.

`src/lib/api/core.ts` 는 envelope를 우선 해석하고, 남은 레거시 raw JSON은 호환 fallback으로만 처리합니다.

## 서버 레이어 기준

- route: wire parsing + HTTP response만 담당
- handler: facade only
- service: 실제 비즈니스 로직 담당

대표 흐름:

```ts
export async function POST(req: Request) {
  const body = await req.json();
  return toNextResponse(await handleSomething(body));
}
```

## 주요 엔드포인트

| 카테고리 | 엔드포인트 | 설명 |
|----------|-----------|------|
| 파일 관리 | `/api/file` | 단일 파일 CRUD |
| 파일 관리 | `/api/files` | 파일 트리 조회 |
| 파일 관리 | `/api/file/upload-image` | 이미지 업로드 |
| 파일 관리 | `/api/file/upload-attachment` | 첨부파일 업로드 |
| 파일 관리 | `/api/file/extract-text` | 업로드 파일 텍스트 추출 |
| AI | `/api/search` | 문서 기반 검색 |
| AI | `/api/ask` | 문서 기반 질문, SSE |
| AI | `/api/create` | 레거시 요약 스트림 |
| AI | `/api/doc-assist` | 인라인 작성/경로 추천 |
| AI | `/api/chat-sessions` | AI 채팅 세션 조회/저장/삭제 |
| 템플릿 | `/api/templates` | 전역/개인 템플릿 CRUD |
| 설정 | `/api/settings` | 편집기/AI/스토리지 설정 |
| 저장소 | `/api/storage/upload` | 저장소 업로드 |
| 저장소 | `/api/storage/open` | 외부 열기 URL/바이너리 |
| 수집 | `/api/ingest/submit` | 자동 수집 등록 |
| 수집 | `/api/ingest/jobs` | 수집 작업 조회 |
| 수집 | `/api/ingest/jobs/:id/confirm` | 게시 승인 |

## 예시

### GET `/api/chat-sessions`

```json
{
  "success": true,
  "status": 200,
  "data": [
    {
      "id": "session_20260223_120000",
      "title": "릴리즈 체크리스트 정리",
      "createdAt": "2026-02-23T07:00:00.000Z",
      "updatedAt": "2026-02-23T07:30:00.000Z",
      "messages": [],
      "persistedToDb": true
    }
  ]
}
```

### POST `/api/doc-assist` with `stream=false`

```json
{
  "success": true,
  "status": 200,
  "data": {
    "text": "생성된 마크다운 본문",
    "applyMode": "replace-document",
    "suggestedPath": "design/order/request.md",
    "relevanceWarnings": []
  }
}
```

### POST `/api/doc-assist` with `action=recommendPath`

```json
{
  "success": true,
  "status": 200,
  "data": {
    "suggestedPath": "design/order/request.md",
    "relevanceWarnings": []
  }
}
```

### 공통 JSON 오류

```json
{
  "success": false,
  "error": "에러 메시지",
  "status": 400,
  "code": "ERROR_CODE"
}
```

## AI 모드 파라미터

`/api/ask`, `/api/search` 요청은 아래 확장 필드를 받습니다.

```json
{
  "contextMode": "doc | deep",
  "activeDocPath": "docs/sample.md"
}
```

- `contextMode=doc`: 기본 위키 모드
- `contextMode=deep`: 딥리서치 모드
- `activeDocPath`: 현재 문서 기준 경로

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-03-23 | `/api/ask`, `/api/create` 의 pre-stream JSON 실패와 `stream=false` JSON branch까지 envelope 정책을 명시적으로 반영 |
| 2026-03-23 | `AppResult` 기반 JSON envelope, doc-assist JSON branch, stream/binary 예외 정책 반영 |
| 2026-03-17 | 파일 업로드/첨부 API 추가 |
