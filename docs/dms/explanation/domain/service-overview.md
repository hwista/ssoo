# DMS 서비스 개요

> 최종 업데이트: 2026-02-24

---

## 1. 서비스 정의

DMS(Document Management System)는 위키 문서를 중심으로 문서를 생성/관리하고, 필요 시 정본/첨부 문서를 연결해 AI 기반 검색 및 질의 응답을 제공하는 시스템입니다.

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
| AI | `/api/search`, `/api/ask`, `/api/create`, `/api/doc-assist` |
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
| 2026-02-24 | 저장소 3어댑터/AI 모드 분리/수집-컨펌 정책 기준으로 문서 전면 갱신 |
