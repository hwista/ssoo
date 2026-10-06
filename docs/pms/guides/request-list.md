# 요청 목록 가이드

> 최종 업데이트: 2026-09-30

요청 목록 화면의 조회/검색/상세 패널 사용 방법을 설명합니다.

---

## 목적

- 프로젝트 요청 상태의 목록을 조회한다.
- 검색 조건으로 요청을 필터링한다.
- 행 선택 시 세컨 그리드로 상세를 확인한다.

---

## 화면 구성

- 메인 그리드: 프로젝트 공통 테이블 기준 목록
- 세컨 그리드: 행 선택 시 하단 플로팅 상세 패널
- 화면 recipe: `@ssoo/web-shell`의 `SsooDataWorkspacePage` + `SsooDataGrid`
- 조회 action/filter controls: 별도 본문 카드가 아니라 데이터 워크스페이스 헤더 안에 표시

## 조회 데이터

- 프로젝트 기본 정보: `pr_project_m`
- 요청 상세 정보: `pr_project_request_d`
- 프로젝트 상태 상세: `pr_project_status_m`

---

## 조회 조건

- 상태: `request` (요청)
- 단계: `waiting`, `in_progress`, `done`
- 고객사: PMS 고객사 읽기 조회 결과에서 선택
- 프로젝트명(검색)

---

## 세컨 그리드

- 행 클릭 시 플로팅 패널이 열린다.
- 요청 상세 테이블 컬럼에 맞춘 데이터가 표시된다.
- 패널 상단 중앙의 쉐브론 버튼으로 접기/펼치기 가능
- 데이터가 없을 때도 그리드 영역 높이를 유지한다.
- 패널 너비는 메인 그리드와 동일하며 높이는 확장된다.
- 쉐브론 버튼은 가로형으로 표시된다.

---

## 등록 실패와 재시도

요청 등록 화면은 저장 중에도 입력 양식을 유지한다. 등록 실패 시 입력을 수정하고 다시 등록할 수 있다. 프로젝트 생성은 성공했지만 요청 상세 저장이 실패하면 부분 성공 안내를 표시한다. 이때 다시 등록하면 같은 프로젝트를 갱신하므로 중복 프로젝트를 생성하지 않는다. 정상 저장 후에는 요청 목록으로 이동한다.

[공용 오류 검증 보고서](../../common/explanation/architecture/2026-09-30-error-recovery-verification.md)에 격리 환경의 실제 생성·부분 실패·재시도 증거를 기록한다.

## Changelog

| Date | Change |
|------|--------|
| 2026-09-30 | 등록 버튼 연결, 저장 중 입력 보존과 부분 실패 시 같은 프로젝트로 재시도하는 동작을 반영했다. |
| 2026-07-07 | 요청 목록 action/filter controls 를 별도 toolbar card 에서 공용 데이터 워크스페이스 헤더 영역으로 이동하는 기준을 반영했다. |
| 2026-07-07 | 요청 목록의 PMS 로컬 `ListPageTemplate`/`DataGrid` 기준선을 `@ssoo/web-shell` 공용 데이터 워크스페이스와 DataGrid 소비로 승격했다. |
| 2026-07-06 | 요청 목록 고객사 필터를 숫자 ID 입력이 아니라 읽기용 고객 조회 선택 기준으로 현행화했다. |
| 2026-02-10 | Add request list guide. |
| 2026-02-10 | Document joined data sources for request list API. |
| 2026-02-10 | Restore DataGrid styles and second grid panel behavior. |
