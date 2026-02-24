# DMS 도메인 개념

> 최종 업데이트: 2026-02-24

DMS의 핵심 도메인 개념과 운영 기준을 정의합니다.

---

## 1. 자산 분류

### 1.1 생성 문서

- 대상: DMS에서 작성/수정한 위키 문서
- 파일: `.md`, `.sidecar.json`
- 정본: Git 저장소

### 1.2 생성 입력 정본

- 대상: AI 요약/생성에 투입되는 원본 파일
- 정본: SharePoint 기본 (NAS/Local 선택 가능)

### 1.3 문서별 첨부 정본

- 대상: 위키 문서에 연결되는 첨부 파일
- 정본: SharePoint 기본 (NAS/Local 선택 가능)

---

## 2. 저장소 타입

```ts
type StorageProvider = 'local' | 'sharepoint' | 'nas';
```

- `local`: DMS 서버 로컬 경로
- `sharepoint`: 사내 SharePoint
- `nas`: 사내 NAS

기본 저장소는 설정값으로 선택하고, 문서/첨부별 오버라이드를 허용합니다.

---

## 3. 참조 포인터

외부 정본/첨부 참조는 `storageUri`를 사용합니다.

예시:

- `git://wiki/analysis/apps/App.md`
- `sp://site/library/itemId`
- `nas://share/path/file.pdf`
- `local://root/path/file.xlsx`

권장 메타:

- `provider`, `webUrl`, `versionId`, `etag`, `checksum`, `origin`, `sourceType`

---

## 4. 수정 정책

정본/첨부는 DMS 내부에서 직접 편집하지 않습니다.

- 수정: 원본 열기 후 사용자 직접 수정 (권한 기반)
- DMS 역할:
  - 열기(Open)
  - 경로/URI 복사
  - 오류 피드백(권한/경로/링크)
  - 재동기화

---

## 5. AI 모드

```ts
type AIContextMode = 'wiki' | 'deep';
```

| 모드 | 설명 | 진입 |
|------|------|------|
| `wiki` | 위키 문서 중심 질의/검색 | 기본 챗봇/검색 UI |
| `deep` | 정본/첨부/링크까지 확장 딥리서치 | 세컨드브레인 UI |

딥리서치 응답은 `citations`와 `confidence`를 반드시 포함합니다.

---

## 6. 관련 문서

- `docs/dms/planning/storage-and-second-brain-architecture.md`
- `docs/dms/explanation/domain/service-overview.md`
- `docs/dms/guides/api.md`

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-24 | 저장소/수집/세컨드브레인 정책 기준으로 도메인 개념 재작성 |
