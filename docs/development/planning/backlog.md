# DMS 백로그

> 최종 업데이트: 2026-01-29

---

## 🎯 진행 중

| ID | 항목 | 우선순위 | 담당 | 상태 |
|----|------|----------|------|------|
| DMS-INT-01 | 모노레포 통합 | P1 | - | ✅ 완료 |
| DMS-INT-02 | PMS 디자인 시스템 적용 | P1 | - | ✅ 완료 |
| DMS-INT-03 | **Phase 3: PMS 패턴 동기화** | P1 | - | 🔄 **진행중** |
| DMS-DOC-02 | 문서별 Backlog/Changelog 섹션 도입 | P1 | - | ✅ 완료 |

---

## 📋 Phase 3: PMS 패턴 동기화 상세

> ⚠️ **상세 내용은 모노레포 통합 문서 참조**  
> 📄 `docs/dms/architecture/package-integration-plan.md` → Phase 3 섹션

### 요약
- ContentArea를 PMS `pageComponents` 패턴으로 변경
- 페이지 컴포넌트 (WikiHomePage, WikiViewerPage, AISearchPage) 생성
- 페이지가 자체적으로 데이터 로드하도록 책임 분리

---

## 📋 대기

| ID | 항목 | 우선순위 | 비고 |
|----|------|----------|------|
| DMS-FE-01 | PWA 지원 | P2 | Phase 5 |
| DMS-FE-02 | 외부 스토리지 연동 | P3 | S3, Azure Blob |
| DMS-BE-01 | 공용 백엔드 연동 | P2 | Phase 6 |
| DMS-BE-02 | PMS 연동 | P3 | 프로젝트 산출물 |
| DMS-UI-01 | 나머지 컴포넌트 스타일 통일 | P2 | Header, TabBar 등 |

---

## ✅ 완료

| ID | 항목 | 완료일 |
|----|------|--------|
| DMS-DOC-01 | 문서 구조 정리 | 2026-01-27 |
| DMS-UI-02 | Fluent UI 제거 (Radix UI 전환) | 2026-01-28 |
| DMS-UI-03 | 레이아웃 컴포넌트 생성 (PMS 구조) | 2026-01-28 |
| DMS-UI-04 | 사이드바 PMS 스타일 통합 | 2026-01-28 |
| DMS-FE-03 | 블록 에디터 (Tiptap) | 2026-01 |
| DMS-FE-04 | AI 검색 (RAG) | 2026-01 |
| DMS-FE-05 | 알림 시스템 | 2026-01 |
| DMS-FE-06 | 권한 관리 (RBAC) | 2026-01 |

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-28 | DMS-UI-02~04 완료, DMS-UI-01 추가, DMS-DOC-02 진행 등록 |
| 2026-01-27 | 백로그 문서 생성 |
