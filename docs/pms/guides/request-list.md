# 요청 목록 가이드

> 최종 업데이트: 2026-02-10

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

## 조회 데이터

- 프로젝트 기본 정보: `pr_project_m`
- 요청 상세 정보: `pr_project_request_d`
- 프로젝트 상태 상세: `pr_project_status_m`

---

## 조회 조건

- 상태: `request` (요청)
- 단계: `waiting`, `in_progress`, `done`
- 고객사 ID
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

## Changelog

| Date | Change |
|------|--------|
| 2026-02-10 | Add request list guide. |
| 2026-02-10 | Document joined data sources for request list API. |
| 2026-02-10 | Restore DataGrid styles and second grid panel behavior. |
