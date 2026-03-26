# DMS 백로그

> 최종 업데이트: 2026-03-16

---

## 🎯 진행 중

| ID | 항목 | 우선순위 | 담당 | 상태 |
|----|------|----------|------|------|
| DMS-DOC-INT-01 | `docs/dms` 단일 정본 전환 + 경로 정합성 정리 | P1 | - | ✅ 완료 |
| DMS-INT-01 | 모노레포 통합 | P1 | - | ✅ 완료 |
| DMS-INT-02 | PMS 디자인 시스템 적용 | P1 | - | ✅ 완료 |
| DMS-INT-03 | Phase 3~5: PMS 패턴 동기화 | P1 | - | ✅ 완료 |
| DMS-DOC-02 | 문서별 Backlog/Changelog 섹션 도입 | P1 | - | ✅ 완료 |
| DMS-REF-01 | **루트 컴포넌트 정리** | P2 | - | ✅ 완료: 구조 정규화, golden-example/shell-body-contract 검증 통과 |

---

## 📋 루트 컴포넌트 정리 (DMS-REF-01)

> 16개 파일을 적절한 디렉토리로 이동 필요

| 파일 | 권장 위치 | 우선순위 |
|------|----------|----------|
| `WikiApp.tsx` | 삭제 (AppLayout 대체) | P1 |
| `WikiSidebar.tsx` | 삭제 (MainSidebar 대체) | P1 |
| `WikiEditor.tsx` | `editor/` | P2 |
| `AIChat.tsx` | `pages/ai/` | P2 |
| `GeminiChat.tsx` | `pages/ai/` | P2 |
| `SearchPanel.tsx` | `layout/sidebar/` | P2 |
| `TextSearch.tsx` | `layout/sidebar/` | P2 |
| 기타 | `common/` | P3 |

---

## 📋 대기

| ID | 항목 | 우선순위 | 비고 |
|----|------|----------|------|
| DMS-STO-01 | 저장소 어댑터 3종(Local/SharePoint/NAS) 구현 | P1 | 🔄 1차 완료: 어댑터+API 도입, 라우팅 고도화 필요 |
| DMS-STO-02 | 정본/첨부 열기(Open)/경로복사/재동기화 UI | P1 | 🔄 1차 완료: Sidecar 액션 추가, 오류 표준화/실동기화 필요 |
| DMS-ING-01 | 자동 수집 큐 + 컨펌 후 게시 플로우 | P1 | 🔄 1차 완료: 큐+confirm API 구현, 채널 어댑터 연동 필요 |
| DMS-AI-01 | AI 모드 분리(wiki/deep) + 세컨드브레인 UI | P1 | 🔄 1차 완료: API 분기/응답 확장, 화면 표시 강화 필요 |
| DMS-AI-02 | `/ai/create` 제거 + 문서 편집 하단 인라인 AI 작성 통합 | P1 | ✅ 완료: 근거 강제/템플릿 단일 선택/관련성 경고 튜닝 적용 |
| DMS-TPL-01 | 템플릿 모델 분리(개인/전역) + 설정 CRUD | P1 | ✅ 완료: 서비스/API/설정UI/에디터 연동 파이프라인 완성 |
| DMS-PATH-01 | 생성 문서 경로 입력 + AI 경로 추천 + 자동 폴더 생성 | P1 | ✅ 완료: SaveLocationDialog + FolderPickerTree + 에디터/사이드카 연동 |
| DMS-AI-03 | 요약 첨부 멀티 업로드 + 연관성 경고 | P1 | ✅ 완료: 첨부 근거 강제, 관련성 경고 튜닝(단일첨부 검사, 적응 임계값) |
| DMS-FE-01 | PWA 지원 | P2 | Phase 5 |
| DMS-FE-02 | 외부 스토리지 연동 | P2 | 기존 항목 유지(세부는 DMS-STO-01로 분해) |
| DMS-BE-01 | 공용 백엔드 연동 | P2 | Phase 6 |
| DMS-BE-02 | PMS 연동 | P3 | 프로젝트 산출물 |
| DMS-UI-01 | 나머지 컴포넌트 스타일 통일 | P2 | Header, TabBar 등 → 헤더 슬롯 구조 개선 완료, 잔여 스타일 통일 |

---

## ✅ 완료

| ID | 항목 | 완료일 |
|----|------|--------|
| DMS-REF-01 | 루트 컴포넌트 정리 (구조 정규화, 검증 통과) | 2026-03-16 |
| DMS-AI-02 | 인라인 AI 작성 통합 (/ai/create 제거, 근거 강제, 관련성 경고) | 2026-03-16 |
| DMS-TPL-01 | 템플릿 CRUD + 설정 UI (서비스/API/에디터 파이프라인) | 2026-03-16 |
| DMS-PATH-01 | 경로 추천 + SaveLocationDialog 연동 | 2026-03-16 |
| DMS-AI-03 | 요약 첨부 연관성 경고 튜닝 | 2026-03-16 |
| DMS-DOC-01 | 문서 구조 정리 | 2026-01-27 |
| DMS-UI-02 | Fluent UI 제거 (Radix UI 전환) | 2026-01-28 |
| DMS-UI-03 | 레이아웃 컴포넌트 생성 (PMS 구조) | 2026-01-28 |
| DMS-UI-04 | 사이드바 PMS 스타일 통합 | 2026-01-28 |
| DMS-FE-03 | 블록 에디터 (현재 CodeMirror 기반으로 대체) | 2026-01 |
| DMS-FE-04 | AI 검색 (RAG) | 2026-01 |
| DMS-FE-05 | 알림 시스템 | 2026-01 |
| DMS-FE-06 | 권한 관리 (RBAC) | 2026-01 |

---

## 🧩 잔여 구현 체크리스트 (P1 상세)

| ID | 잔여 항목 | 상태 | 비고 |
|----|-----------|------|------|
| DMS-STO-01-A | 수동 업로드/첨부 전 경로에 기본 저장소 + 문서/첨부 오버라이드 관통 적용 | ⬜ 대기 | 기존 파일 생성/첨부 플로우와 완전 통합 필요 |
| DMS-STO-02-A | SharePoint/NAS Open 실패 사유 표준화(권한/경로/만료) 및 사용자 메시지 정교화 | ⬜ 대기 | 현재는 URL 위임 중심 |
| DMS-STO-02-B | Resync 요청 이후 sidecar 메타 실제 갱신 파이프라인 연결 | ⬜ 대기 | 현재는 작업 등록 중심 |
| DMS-ING-01-A | Teams/네트워크 드라이브/수집폴더 입력 채널 어댑터 연결 | ⬜ 대기 | ingest API는 구현 완료 |
| DMS-AI-01-A | Ask/Search 화면에 citations/confidence 표시 | ⬜ 대기 | API 응답 확장 완료 |
| DMS-QA-01 | 저장소/수집/딥리서치 7개 시나리오 테스트 자동화 | ⬜ 대기 | 통합/e2e 스크립트 추가 필요 |

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-03-16 | 에디터 UX 개선: dirty 보더(SectionedShell), 탭 dirty 표시(색상+이탤릭+dot), 탭 문서명 우선 표시, 탭 닫기 confirm, 미리보기 원본보기 색상, confirm 메시지 통일 |
| 2026-03-16 | Header 에디터 모드 슬롯 구조 개선: editorInlineSlot→editorRightSlot 이름변경, 저장/삭제 우측 재배치, 미리보기 시 우측 버튼 숨김 |
| 2026-03-16 | DMS-REF-01 완료(검증 스크립트 경로 수정), DMS-AI-02 완료(관련성 경고 튜닝), DMS-TPL-01 완료, DMS-PATH-01 완료, DMS-AI-03 완료 |
| 2026-03-10 | 홈 중복 제거, settings 페이지 구조 정리, lib/api 분리, ai handler facade화 반영 |
| 2026-03-10 | 인라인 AI 작성의 요약 첨부 근거 강제/문서 템플릿 단일 선택 진행 상태 반영 |
| 2026-03-10 | 템플릿 전용 저장 토글 및 템플릿 `.md + .sidecar.json` 정본 구조 반영 |
| 2026-02-24 | 저장소/수집/딥리서치 1차 구현 완료 기준으로 잔여 구현 체크리스트 추가 |
| 2026-02-24 | 인라인 AI 작성 통합(`/ai/create` 제거), 템플릿/경로추천/첨부 연관성 항목 추가 |
| 2026-02-24 | 저장소/수집/딥리서치 실행 항목(DMS-STO/ING/AI) 추가 |
| 2026-02-23 | `docs/dms` 단일 정본 전환 완료, 런타임 위키 경로(`apps/web/dms/data/wiki`) 분리 |
| 2026-01-28 | DMS-UI-02~04 완료, DMS-UI-01 추가, DMS-DOC-02 진행 등록 |
| 2026-01-27 | 백로그 문서 생성 |
