# DMS 백로그 (Backlog)

> DMS(Document Management System) 작업 계획 및 진행 상황

**마지막 업데이트**: 2026-01-29

---

## 🎯 현재 작업: Phase 7 - 문서 시스템 템플릿 재설계

**브랜치**: `dms/refactor/integration`  
**목표**: 문서 뷰어/에디터 템플릿 완성 및 기능 구현

---

## ✅ 완료된 작업

### Phase 7: 문서 시스템 템플릿 재설계
- [x] DocPageTemplate 슬롯 기반 구조 (뷰어/에디터 공용)
- [x] DocViewer 뷰어 툴바 구현
  - [x] 목차: 마우스 오버 플로팅 패널 + 레벨별 스타일 구분
  - [x] 검색: 하이라이트 + 결과 탐색 + 0/0 표시
  - [x] 줌: 확대/축소 + 리셋
- [x] markdownConverter.ts 커스텀 renderer (헤딩 id 부여)
- [x] PMS 네이밍 패턴 통일
  - [x] `common/doc/` → `common/page/`
- [x] 가비지 코드 정리
  - [x] `DocViewerTemplate.tsx` 삭제 (미사용)
  - [x] `pages/wiki/editor/` 빈 폴더 삭제
  - [x] 템플릿 미사용 props 제거

### Phase 4: API 레이어 정리 완료
- [x] apiClient.ts 확장 (userApi, searchApi, uploadApi, aiApi)
- [x] 직접 fetch 호출 제거 → API 클라이언트 사용
- [x] package-unification-analysis.md 작성

### Phase 2: DMS 리팩토링 완료
- [x] Fluent UI 제거 → shadcn/ui 전환
- [x] Layout 컴포넌트 PMS 표준화
- [x] 사이드바/헤더/탭바 스타일 통일
- [x] UI 컴포넌트 SSOO 디자인 시스템 적용
- [x] Store 파일명 컨벤션 통일 (`*.store.ts`)
- [x] 색상 토큰 PMS 표준 통일

---

## 📋 예정된 작업

### Phase 8: 에디터 기능 구현
- [ ] DocEditor 컴포넌트 완성
- [ ] 마크다운 에디터 툴바
- [ ] 실시간 미리보기 (좌우 분할)
- [ ] 저장/취소 기능

### Phase 9: API 연동 및 기능 완성
- [ ] 파일 목록 API 연동 (tree-store → server)
- [ ] 검색 기능 API 연동
- [ ] 책갈피 API 연동
- [ ] 히스토리 기능

### Phase 10: 레거시 정리
- [ ] WikiEditor.tsx → editor/ 이동 (현재 루트에 위치)
- [ ] WikiEditor.tsx 인라인 스타일 정리
- [ ] MarkdownToolbar.tsx 정리
- [ ] SlashCommand.tsx 정리

---

## 🏷️ 작업 우선순위

| 우선순위 | 설명 |
|:--------:|------|
| P0 | 즉시 처리 필요 |
| P1 | 이번 스프린트 내 완료 |
| P2 | 다음 스프린트 |
| P3 | 백로그 |

---

## 🔗 관련 문서

- [DMS Changelog](./changelog.md)
- [DMS Roadmap](./roadmap.md)
- [PMS Backlog](../../pms/planning/backlog.md)

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

