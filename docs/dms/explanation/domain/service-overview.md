# DMS 서비스 개요

> 최종 업데이트: 2026-03-27

---

## 1. 서비스 정의

DMS(Document Management System)는 위키 문서를 중심으로 문서를 생성/관리하고, 필요 시 정본/첨부 문서를 연결해 AI 기반 검색 및 질의 응답을 제공하는 시스템입니다. 최근에는 기존 문서를 AI로 재구성한 템플릿 문서를 별도 저장소에 보관하고, 편집 세션 안에서 원본 문서와 템플릿 preview를 분리해 다루는 흐름까지 포함합니다.

핵심 원칙:

- 위키 산출 문서(`.md`, `.sidecar.json`)는 Git 기반으로 관리
- 정본/첨부 문서는 저장소 어댑터(Local/SharePoint/NAS)로 관리
- 기본 대화/검색과 세컨드브레인 딥리서치 모드를 분리 운영

---

## 2. 저장소 모델

### 2.1 지원 저장소

- `local`: DMS 서버 로컬 경로
- `sharepoint`: 사내 SharePoint
- `nas`: 사내 NAS

### 2.2 기본값 및 오버라이드

- 기본 저장소: SharePoint
- 오버라이드: 문서별 + 첨부별 모두 허용

### 2.3 자산 분류

| 자산 | 설명 | 관리 방식 |
|------|------|-----------|
| 생성 문서 | DMS에서 작성한 위키 문서 | Git 버전관리 |
| 생성 입력 정본 | AI 요약/생성 원본 파일 | 저장소 어댑터 기반 |
| 문서별 첨부 정본 | 문서 연결 첨부 | 저장소 어댑터 기반 |

세부 정책 정본:

- `docs/dms/planning/storage-and-second-brain-architecture.md`

---

## 3. 수정/열기 정책

정본/첨부 파일은 DMS 내부에서 직접 편집하지 않습니다.

- 수정: 원본 파일 열기 후 사용자 직접 수정(권한 기반)
- DMS 제공 기능:
  - 열기(Open)
  - 경로/URI 복사
  - 권한/경로 오류 피드백
  - 수정 후 재동기화

---

## 4. AI 동작 모드

### 4.1 기본 모드 (챗봇/검색)

- 위키 문서 중심
- 비용/속도/응답 일관성 우선

### 4.2 딥리서치 모드 (세컨드브레인 UI)

- 별도 세컨드브레인 UI 진입 시에만 활성
- 위키 외 정본/첨부/참조 링크까지 확장
- 응답 계약:
  - 출처(citations) 필수
  - 신뢰도(confidence) 필수

---

## 5. API 현황

### 5.1 현재 운영 API

| 카테고리 | 엔드포인트 |
|----------|------------|
| 파일 | `/api/file`, `/api/files` |
| Git | `/api/git` |
| 설정 | `/api/settings` |
| AI | `/api/search`, `/api/ask`, `/api/create`, `/api/doc-assist`, `/api/templates/convert` |
| 세션 | `/api/chat-sessions` |
| 템플릿 | `/api/templates` |

### 5.2 계획 API (구현 예정)

| 카테고리 | 엔드포인트 |
|----------|------------|
| 저장소 | `/api/storage/upload`, `/api/storage/open` |
| 수집 | `/api/ingest/submit`, `/api/ingest/jobs`, `/api/ingest/jobs/:id/confirm` |

---

## 6. 운영 플로우 요약

### 6.1 수동 업로드

1. 사용자 업로드
2. 기본 저장소(또는 오버라이드 저장소) 적재
3. 참조 메타(sidecar) 기록
4. 문서와 연결

### 6.3 기존 문서 → 템플릿 전환

1. 사용자가 viewer 헤더 우측의 `내보내기 > 템플릿 전환`을 선택합니다.
2. DMS는 export trigger를 spinner 상태로 바꾸고, 현재 문서를 참조한 저장 템플릿을 조회합니다.
3. 저장 템플릿이 있으면 목록 모달을 먼저 띄우고, 항목 선택 시 overwrite 없이 읽기 전용 미리보기를 제공합니다.
4. 사용자가 `새 템플릿 생성`을 선택하거나, 참조 템플릿이 없으면 DMS는 고유 탭 ID를 가진 새 `/doc/new-template` 탭을 엽니다.
5. 현재 문서의 markdown 원문은 탭 ID keyed pending store를 통해 새 탭으로 전달되고, 새 템플릿 생성 플로우는 이를 `sourceDocument`로 소비합니다.
6. 새 탭은 pending을 non-destructive read로 먼저 복원하고, 실제 AI 변환이 시작된 시점에만 pending을 clear합니다. 개발 모드 strict mode remount에서도 source document가 유실되지 않도록 하기 위함입니다.
7. `sourceDocument`가 존재하면 `document-to-template` AI task가 자동으로 실행되어 템플릿 초안을 생성합니다.
8. 새 탭에서는 shell과 sidecar를 유지한 채, 에디터 초안이 비어 있는 동안 본문 영역에만 overlay + 로딩 문구를 표시합니다.
9. 사용자가 저장하면 원본 문서는 건드리지 않고 `data/templates/referenced/...` 또는 `data/templates/generated/...`에 템플릿 markdown + sidecar만 생성합니다.

운영 규칙:

- 템플릿 전환은 editor 모드로 들어가지 않고 새 템플릿 생성 탭으로 처리
- 현재 보고 있던 원문 문서 탭은 그대로 유지
- 새 탭 생성 실패 시 pending은 즉시 정리하고, picker는 닫지 않아 재시도 가능
- AI 변환 입력은 viewer HTML이 아니라 원문 markdown을 사용
- 템플릿 초안 생성 SSE가 실패하면 무음 복귀하지 않고 toast로 실패를 노출
- 기존 템플릿 확인은 preview-only이며 overwrite를 지원하지 않음

### 6.5 AI 스트리밍 표시 정책

AI 응답이 스트리밍으로 길어질 수 있는 화면은 공통 자동 스크롤 정책을 따릅니다.

적용 대상:

- 플로팅 어시스턴트 패널
- AI 채팅 페이지
- 기존 문서 AI 작성(Doc Assist compose)
- 기존 문서 → 템플릿 전환 AI 초안 생성

운영 규칙:

- 스크롤 컨테이너가 하단 근처(기본 60px)일 때만 자동으로 마지막 응답을 따라갑니다.
- 사용자가 위로 스크롤해 읽는 중이면 자동 추적을 중단합니다.
- 사용자가 다시 하단 근처로 내려오면 자동 추적을 재개합니다.
- 템플릿 전환처럼 shell이 이미 렌더된 화면은 전체 화면 gate로 가리지 않고, 본문/사이드카 안에서 로딩 상태를 표시합니다.
- CodeMirror 기반 에디터는 외부 DOM query 대신 `view.scrollDOM` scroll listener로 near-bottom 상태를 추적하고, 그 상태가 유지될 때만 RAF에서 `view.scrollDOM.scrollTop = view.scrollDOM.scrollHeight`를 적용합니다.

### 6.4 템플릿 저장소 구조

- `data/templates/referenced/global|personal/...`
- `data/templates/generated/global|personal/...`
- 레거시 `data/templates/global|personal|templates.json`은 읽기 호환만 유지

템플릿 sidecar 공통 필드:

- `summary`, `tags`, `createdAt`, `updatedAt`, `author`, `lastModifiedBy`

템플릿 전용 필드:

- `originType`
- `referenceDocuments`
- `generation`
- `scope`, `kind`, `ownerId`, `visibility`, `status`, `sourceType`

운영 규칙:

- 기존 템플릿 선택은 preview-only이며 overwrite를 지원하지 않음
- 템플릿 저장 시 `id`를 보내지 않아 항상 새 템플릿 생성으로 처리
- 템플릿 모드에서는 신규 첨부/이미지 업로드를 지원하지 않음
- `author/lastModifiedBy`는 서버 저장 계층에서 `요청 사용자 → git.author.name → 'Unknown'` 순서로 보정

### 6.2 자동 수집

1. 수집 공간/Teams/NAS 경로로 파일 유입
2. 비동기 요약/분류 초안 생성
3. 요청자 확인
4. 컨펌 후 위키 게시

---

## 7. 관련 문서

- `docs/dms/planning/storage-and-second-brain-architecture.md`
- `docs/dms/explanation/domain/concepts.md`
- `docs/dms/guides/api.md`
- `docs/dms/planning/backlog.md`

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-03-27 | CodeMirror 에디터 auto-scroll 구현을 `view.scrollDOM` listener + near-bottom ref + RAF 직접 DOM scroll 방식으로 보정해, 템플릿 변환/Doc Assist 스트리밍 중 follow가 끊기지 않도록 문서 갱신 |
| 2026-03-27 | 템플릿 전환 pending 전달을 `get + clear`로 분리하고, strict mode 개발 환경에서 `/api/templates/convert` 요청이 유실되지 않도록 문서 갱신 |
| 2026-03-27 | export icon-only 트리거, viewer trigger loading, shell-preserving template overlay, AI streaming auto-scroll 정책을 반영해 문서 갱신 |
| 2026-03-27 | viewer 헤더 `내보내기` 드롭다운, 새 탭 기반 템플릿 전환 pending flow, 읽기 전용 템플릿 미리보기 다이얼로그를 반영해 문서 갱신 |
| 2026-03-27 | AI 템플릿 변환 모드, `document-to-template` task, referenced/generated 템플릿 저장소 구조를 반영해 문서 갱신 |
| 2026-02-24 | 저장소 3어댑터/AI 모드 분리/수집-컨펌 정책 기준으로 문서 전면 갱신 |
