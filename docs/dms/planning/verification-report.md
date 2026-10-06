# DMS 문서-코드 검증 리포트

> 2026-09-30 오류 처리 경계 후속: toast·추천/저장 실패·수집 이력과 문서 삭제/이동·대화 저장·댓글 갱신·AI 요약의 실패를 공용 notice/toast에 연결했다. 대화 검색/스트림 오류는 부분 응답과 별도 오류 필드로 보존하고 사용자 중단으로 덮지 않는다. 실제 스트림/store 경로 5개 검증을 추가했으며 [공용 검증 기록](../../common/explanation/architecture/2026-09-30-error-recovery-verification.md)을 따른다. 업무 조합 전수는 완료 조건이 아니며 외부 환경 검증은 사용자 요청으로 보류한다.

> 2026-09-30 홈 공용 계약: 고정 홈 판별·저장 탭 별칭 정규화·좌측 열린 페이지의 홈 제외를 `web-shell` 계약으로 연결했다. 문서 2탭과 미저장 CodeMirror 본문/편집 상태의 홈 왕복 보존 및 모바일 화면을 실제 브라우저로 확인했고 격리 소스의 DMS guard와 정식 lint를 통과했다. [공용 홈 적용 기록](../../common/explanation/architecture/2026-09-30-home-navigation-review.md)과 `output/playwright/home-navigation/verification.json`을 따른다.

> 2026-09-30 오류 표면 공용화: ErrorState/settings/sidebar/문서 조회·입력 오류를 공용 안내에 연결했다. 접근 조회 503과 권한 부족을 분리하고, 재시도·계정 초기화 후 stale 응답 차단·409 충돌 payload·Retry-After를 보존한다. DMS 접근/설정 실패 주입과 기존 업무 회귀 10/10(ACL·잠금·초안 저장·댓글·링크·설정 직접 진입/새로고침)을 확인했다. [공용 오류 검증 보고서](../../common/explanation/architecture/2026-09-30-error-recovery-verification.md)에서 실행 증거와 미검증 범위를 구분하며, 아래 2026-01-27 baseline을 현재 수치로 대체하지 않는다.

> 후속 로컬 검증: 저장 오류와 조회 오류를 분리해 편집기를 보존하고, 서버 공통 예외 필터에서 누락되던 실제 409 비교 정보를 복구했다. CodeMirror 초안 유지·수동 재저장·실제 충돌 비교·병합 저장을 검증했으며 저장 상태 계약 11개와 서버 필터 6개 검증을 추가했다.

> 작성일: 2026-01-27  
> 상태: ✅ 검증 완료 (작성 시점 기준)
>
> ⚠️ **STALE BASELINE**: 본 문서의 baseline (API 19개 / 컴포넌트 35개 / 훅 9개) 은 2026-01-27 작성 시점 측정값입니다. 이후 4개월간 코드가 진화 (DMS 통합, runtime path contract, control-plane decomposition 등) 했으므로 현 코드와 일치하지 않을 수 있습니다. 갱신 또는 `_archive/` 이동 검토 필요. 추적: backlog `VR-01` (P2, 진행중), `VR-02` (P2, 대기).

## 📋 검증 대상

### 공식 문서 (docs/dms/)

| 문서 | 상태 | 설명 |
|------|------|------|
| README.md | ✅ | PMS 양식 적용 완료 |
| explanation/architecture/tech-stack.md | ✅ | 기존 유지 |
| explanation/architecture/package-spec.md | ✅ | 기존 유지 |
| explanation/domain/service-overview.md | ✅ | 새로 작성 |
| explanation/design/design-system.md | ✅ | 새로 작성 |
| guides/hooks.md | ✅ | 실제 코드 기반 작성 |
| guides/components.md | ✅ | 실제 코드 기반 작성 |
| guides/api.md | ✅ | 실제 코드 기반 작성 |

---

## 🔍 검증 결과

### 1. Hooks 검증

| 훅 | 문서 라인 | 실제 라인 | 상태 |
|----|-----------|-----------|------|
| useFileSystem.ts | 272 | 272 | ✅ 일치 |
| useTreeData.ts | 259 | 259 | ✅ 일치 |
| useEditor.ts | 435 | 435 | ✅ 일치 |
| useResize.ts | 117 | 117 | ✅ 일치 |
| useAutoScroll.ts | 115 | 115 | ✅ 일치 |
| useMessage.ts | 95 | 95 | ✅ 일치 |
| useContextMenu.ts | 72 | 72 | ✅ 일치 |
| useNotification.ts | 52 | 52 | ✅ 일치 |
| useFileOperations.ts | 194 | 194 | ✅ 일치 |

**총 9개 훅 문서화 완료**

### 2. Components 검증

| 항목 | 문서 | 실제 | 상태 |
|------|------|------|------|
| 총 컴포넌트 수 | 35 | 35 | ✅ 일치 |
| TreeComponent.tsx | 464줄 | 464줄 | ✅ 일치 |
| WikiApp.tsx | 183줄 | 183줄 | ✅ 일치 |

### 3. API 검증

| 항목 | 문서 | 실제 | 상태 |
|------|------|------|------|
| 총 API 라우트 | 19 | 19 | ✅ 일치 |

**API 라우트 목록:**
- ask, collaborate, comments, file, files
- gemini, git, index, notifications, permissions
- plugins, search, tags, templates, text-search
- upload, users, versions, watch

### 4. 인터페이스 검증

| 훅 | 상태 | 비고 |
|----|------|------|
| UseFileSystemReturn | ✅ | 실제 코드와 일치 |
| UseTreeDataReturn | ✅ | 실제 코드와 일치 |
| UseEditorReturn | ✅ | 실제 코드와 일치 |

---

## 📊 통계 요약

| 항목 | 문서화 | 커버리지 |
|------|--------|----------|
| API 엔드포인트 | 19/19 | 100% |
| 컴포넌트 | 35/35 | 100% |
| 훅 | 9/9 | 100% |

**전체 검증 결과: ✅ PASS**

---

## 📝 다음 단계

- [ ] 문서 정합성 보정 (정본 경로/패키지 명세 불일치 수정)
- [ ] 문서별 Backlog/Changelog 섹션 도입
- [ ] 모노레포 통합 문서는 `docs/dms/`에만 유지 (중복 문서 금지)

---

## 🔄 내부 문서 vs 공식 문서 비교

### 기존 내부 문서 (docs/dms/_archive/)
| 문서 | 라인 | 문제점 |
|------|------|--------|
| hooks.md | 743 | 인터페이스 outdated, 라인수 불일치 |
| components.md | 531 | 20+ 컴포넌트 미문서화 |
| api.md | 356 | 16개 API 미문서화 |
| design-system.md | 661 | 일부 outdated |
| DEVELOPMENT_STANDARDS.md | 719 | 참조용으로 유지 가능 |

### 현행 정본 문서 (docs/dms/)
| 문서 | 상태 | 특징 |
|------|------|------|
| hooks.md | ✅ | 실제 코드 기반, 100% 커버리지 |
| components.md | ✅ | 35개 컴포넌트 모두 문서화 |
| api.md | ✅ | 19개 API 모두 문서화 |

**권장**: `_archive` 문서는 참조용으로 유지하고, 정본은 `docs/dms/`를 사용

---

## Backlog

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| VR-01 | 정본 경로 및 문서 참조 경로 정합성 점검 | P2 | 🔄 진행중 |
| VR-02 | 문서별 Backlog/Changelog 섹션 도입 상태 검증 | P2 | 🔲 대기 |

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-27 | 검증 리포트 최초 작성 |
| 2026-01-28 | 정본 경로 수정, 다음 단계 및 표준 섹션 추가 |
