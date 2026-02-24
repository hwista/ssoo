# DMS 로드맵

> 최종 업데이트: 2026-02-24

---

## 1. 현재 완료

- 위키 문서 관리 기본 기능 (`/api/file`, `/api/files`, `/api/git`)
- AI 질문/검색 + 인라인 문서 작성 기본 기능 (`/api/ask`, `/api/search`, `/api/doc-assist`)
- 설정 페이지 표준화 및 Git 경로 설정
- 플로팅 어시스턴트/AI 검색 UI 고도화

---

## 2. 단기 우선순위 (P1)

1. 저장소 어댑터 3종(Local/SharePoint/NAS) 라우팅 관통 적용
2. 정본/첨부 Open/Copy/Resync UX 고도화
3. 자동 수집 채널 연동 + 컨펌 후 게시 운영화
4. AI 모드 분리(wiki/deep) UI 완결

---

## 2.1 P1 진행 현황 (2026-02-24)

| 항목 | 1차 구현 | 잔여 |
|------|----------|------|
| 저장소 어댑터 | ✅ 어댑터 서비스 + 업로드/열기 API 도입 | 기본 저장소/오버라이드 라우팅 전 경로 관통 |
| Open/Copy/Resync | ✅ Sidecar 액션 추가 | SharePoint/NAS 오류 표준화, Resync 후 메타 반영 자동화 |
| 자동 수집 | ✅ ingest 큐 + confirm API | Teams/네트워크 드라이브 채널 어댑터 연결 |
| AI 모드 분리 | ✅ `contextMode`, `activeDocPath`, `citations/confidence` 응답 확장 | Ask/Search UI 출처/신뢰도 표기 강화 |

---

## 3. 중기 우선순위 (P2)

1. 외부 저장소 연동 안정화(재시도/백오프/감사로그)
2. NAS 보조 저장소 운영 자동화
3. 문서-참조 그래프 기반 인사이트 강화

---

## 4. 장기 우선순위 (P3)

1. 인증/권한 체계 도입
2. Teams 챗봇 입력 채널 확장
3. 승인 워크플로우 고도화(다단계 컨펌)

---

## 5. 관련 백로그

- `docs/dms/planning/backlog.md`
- `docs/dms/planning/storage-and-second-brain-architecture.md`

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-24 | P1 항목별 1차 구현/잔여 작업 상태표 추가 |
| 2026-02-24 | 과거 Phase 체크리스트를 현행 실행 로드맵(저장소/수집/딥리서치 중심)으로 전면 갱신 |
