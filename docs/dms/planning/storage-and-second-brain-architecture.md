# DMS 저장소/수집/세컨드브레인 아키텍처

> 최종 업데이트: 2026-02-24
> 상태: 승인됨 (MVP 구현 기준)

---

## 1. 목표

DMS에서 다루는 문서 자산을 저장소별로 명확히 분리하고, 기본 챗봇과 세컨드브레인 딥리서치 모드를 분리해 운영한다.

핵심 목표:

- 생성 위키 문서는 Git 기반으로 안정적으로 버전관리
- 정본/첨부는 저장소(Local/SharePoint/NAS) 유연하게 사용
- 수동/자동 수집 플로우를 분리하고 자동 유입은 컨펌 후 게시
- 기본 대화/검색과 딥리서치의 범위/비용/품질을 분리

---

## 2. 자산 3분류

| 구분 | 정의 | 기본 정본 |
|------|------|-----------|
| 생성 문서 | DMS에서 작성/수정한 위키 문서 (`.md`, `.sidecar.json`) | Git 저장소 |
| 생성 입력 정본 | AI 요약/생성에 사용한 원본 파일 | SharePoint (기본), NAS/Local 선택 가능 |
| 문서별 첨부 정본 | 문서에 연결되는 첨부 파일 | SharePoint (기본), NAS/Local 선택 가능 |

---

## 3. 저장소 어댑터 정책

DMS는 아래 3개 저장소를 동시에 지원한다.

- `local`: DMS 서버 내 지정 경로
- `sharepoint`: 사내 SharePoint
- `nas`: 사내 NAS

세 저장소 모두 어댑터를 구현하고, 설정에서 기본 저장소를 선택한다.

### 3.1 기본값/오버라이드

- 시스템 기본 저장소: `sharepoint`
- 오버라이드: 문서별 + 첨부별 모두 허용
- 즉, 기본은 SharePoint에 적재하되, 케이스별로 NAS/Local 지정 가능

### 3.2 포인터 표준

외부 참조는 `storageUri`로 표준화한다.

예시:

- `git://wiki/path/to/doc.md`
- `sp://<site>/<library>/<itemId>`
- `nas://<share>/<path>`
- `local://<root>/<path>`

권장 메타 필드:

- `storageUri`, `provider`, `webUrl`
- `versionId`, `etag`, `checksum`
- `sourceType` (`generated-input`, `attachment`, `related`)
- `origin` (`dms`, `teams`, `cron`, `sharepoint`, `nas`, `local`)

---

## 4. 수정/열기 정책

정본/첨부 파일의 직접 수정은 DMS에서 수행하지 않는다.

- 수정 방식: 원본 열기 후 사용자 직접 수정 (권한 기반)
- DMS 역할: 파일 탐색/열기/링크 제공/상태 안내

### 4.1 DMS 필수 지원 기능

- 첨부/정본 항목의 `열기(Open)`
- `경로/URI 복사`
- 권한/경로 오류 안내 (`접근 권한 없음`, `링크 만료`, `경로 없음`)
- 수정 후 `재동기화` (메타/버전 재수집 + sidecar 업데이트)

### 4.2 저장소별 열기 동작

- SharePoint: `webUrl` 새 탭 열기
- NAS: 웹 게이트웨이 URL 또는 네트워크 프로토콜 링크
- Local: 서버 파일 접근 링크(다운로드/열람)

---

## 5. 수동 vs 자동 수집

## 5.1 수동 업로드

- 사용자가 DMS에서 파일 업로드
- 업로드 대상은 설정된 기본 저장소(또는 오버라이드 저장소)
- 즉시 참조 등록 후 문서와 연결

## 5.2 자동 수집 (비동기)

입력 채널:

- DMS 내 자동 수집 공간
- 네트워크 드라이브/SharePoint/NAS 수집 폴더
- Teams 챗봇 파일 전달

처리 정책:

1. 비동기 수집 → 요약/분류 초안 생성
2. 요청자에게 결과 제공
3. 요청자가 확인/컨펌하면 위키 게시
4. 미컨펌은 초안 상태 유지

> Teams 챗봇 입력도 DMS 관점에서는 수동 제출 채널로 본다(서비스 접속 경로만 다름).

---

## 6. AI 모드 분리

## 6.1 기본 챗봇/검색

- 위키 문서 중심으로 동작
- 딥리서치 기능 비활성

## 6.2 세컨드브레인 딥리서치

- 별도 세컨드브레인 UI 진입 시에만 활성
- 참조 범위:
  - 위키 문서
  - 정본 파일
  - 첨부 문서
  - 첨부 링크

응답 계약:

- 출처(citations) 필수
- 신뢰도(confidence: `high|medium|low`) 필수

---

## 7. MVP 구현 경계

MVP에서 우선 구현:

- 저장소 어댑터 3종 기본 동작
- 기본 저장소 설정 + 문서/첨부별 오버라이드
- 수동 업로드/열기/재동기화
- 자동 수집 + 컨펌 후 게시 플로우
- 기본 모드/딥리서치 모드 분기

후속 단계:

- 조직 인증/권한 연동
- 전역 그래프 탐색 고도화
- 대량 동기화 최적화

---

## 7.1 구현 상태 스냅샷 (2026-02-24)

### 완료(1차)

- 저장소 어댑터 서비스 + `storage/upload`, `storage/open` API
- 수집 큐 + `ingest/submit`, `ingest/jobs`, `ingest/jobs/:id/confirm` API
- Sidecar 첨부 `Open / URI 복사 / Resync` 액션
- AI `wiki|deep` 모드 파라미터 및 `citations/confidence` 응답 필드

### 잔여

- 기본 저장소/오버라이드 정책의 전 경로 라우팅 관통 적용
- SharePoint/NAS 열기 실패 유형별 오류 메시지 표준화
- Resync 후 sidecar 메타 자동 갱신 파이프라인
- Teams/네트워크 드라이브 수집 채널 어댑터 연결
- Ask/Search 화면의 citations/confidence 시각화
- 시나리오 7종 자동화 테스트

---

## 8. 관련 문서

- `docs/dms/explanation/domain/service-overview.md`
- `docs/dms/explanation/domain/concepts.md`
- `docs/dms/guides/api.md`
- `docs/dms/planning/backlog.md`
- `docs/dms/planning/changelog.md`

---

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-02-24 | 1차 구현 완료 범위와 잔여 항목(운영화/UX/테스트) 상태 스냅샷 추가 |
| 2026-02-24 | 저장소 3어댑터(Local/SharePoint/NAS), 수집/컨펌 플로우, 세컨드브레인 딥리서치 정책 정본화 |
