# DMS 변경 이력

> 최종 업데이트: 2026-03-23

---

## 2026-03-23

### DMS 표준화 감사 백로그 마감

- 표준화 실행 백로그 14건을 전수 점검하고 전체 상태를 `✅ 완료` 또는 `✅ 수용 종결`로 확정
- `docs/dms/guides/verification.md` 를 추가해 전역 게이트와 DMS 고유 게이트 해석 기준을 문서화
- `docs/dms/guides/qa-scenarios.md` 를 추가해 표준화 리팩토링 회귀 확인 시나리오를 정리
- `DMS-STD-20`, `DMS-STD-22` 는 현재 구조를 수용하는 방식으로 종결 처리
- `pnpm run codex:preflight` 에서 DMS 외부 원인 실패가 발생할 경우 `레포 전역 이슈 (DMS 범위 외)` 로 분리 해석하는 원칙을 명시

### DMS 3차 마감 정리

- `editor/editorHistory.ts` → `editor/history.ts` rename (디렉토리명 접두사 네이밍 규칙 위반 해소)
- 행수 초과 5건 (9~20행) accepted deviation으로 확정

### DMS 3차 표준화 리팩토링 진행

- `useDocumentPageReferences.ts` 를 조립 hook으로 축소하고 `useDocumentPageReferenceSelection`, `useDocumentPageReferenceRestore`, `useDocumentPagePendingAttachments` 3개 하위 hook으로 references 흐름을 분리
- `DocumentPage.tsx` 에서 AI summary 자동 실행, 저장/삭제/취소, navigation, launcher 흐름을 page-local hook으로 이동하고 `DocumentPageFrame`, `DocumentPageEditorShell`, `DocumentPageSidecarSlot`, `EditorToolbarStrip` support 컴포넌트로 JSX 조립을 분리
- `useDocumentPageComposeActions.ts` 의 compose 완료 후 추천 처리 책임을 hook 내부로 이동해 `DocumentPage` wiring을 추가 경량화
- 최종 기준으로 `DocumentPage.tsx` 는 417행, `useDocumentPageReferences.ts` 는 84행까지 축소
### DMS 2차 표준화 리팩토링 진행

- `DocumentPage.tsx` 를 page-local hook 조합 구조로 재편하고 `useDocumentPageMode`, `useDocumentPageSidecar`, `useDocumentPageAI`, `useDocumentPageReferences`, `useDocumentPageDiff` 를 추가
- `useDocumentPageComposeActions.ts` 의 순수 compose 로직을 `documentPageUtils.ts` 로 이동해 hook을 stream orchestration 중심으로 경량화
- `ContentInfoSections.tsx` 를 `TagsSection.tsx`, `SummarySection.tsx`, `SourceLinksSection.tsx` 로 물리 분리하고, `useEditorState` history 로직과 `CommentsSection` thread 로직, `SettingsPage` 템플릿 관리 흐름도 별도 모듈로 추출
- editor toolbar export를 `Toolbar` 로 정리하고 `/api/ask`, `/api/create` 의 pre-stream JSON 응답을 envelope 규약으로 마감

### DMS 1차 표준화 리팩토링 진행

- Quick Wins 범위에서 build warning 4건, `errorUtils` dead code, 파일 MIME/type 유틸 중복을 정리
- `server/shared/result.ts` 에 `AppResult<T>`, `ok`, `fail`, `toNextResponse` 를 추가하고 file/chat/settings/git/ingest/storage/doc-assist 관련 route-handler-service 흐름에 공통 적용
- non-stream JSON API 를 `{ success, data?, error?, status, code? }` envelope 기준으로 통일하고 `src/lib/api/core.ts` 를 envelope 우선 해석 구조로 정렬
- `/api/doc-assist` 는 JSON branch 와 사전 실패 응답만 envelope 로 통일하고, SSE 본문 형식은 예외 정책으로 유지
- `.github/.codex dms.instructions`, `docs/dms/guides/api|components|hooks`, `apps/web/dms/README.md`, `apps/web/dms/CLAUDE.md`, `verification-report.md` 를 현재 구현 기준으로 현행화

---

### DMS 전면 표준화 감사 문서화

- `apps/web/dms/**`, `docs/dms/**`, DMS instruction 정본을 함께 기준으로 삼는 전면 표준화 감사를 수행하고 결과를 `docs/dms/planning/standardization-audit-2026-03.md` 에 기록
- 감사 결과를 실제 리팩토링 트랙으로 분해한 `docs/dms/planning/standardization-remediation-backlog-2026-03.md` 추가
- `docs/dms/README.md`, `docs/dms/planning/README.md`, `docs/dms/planning/backlog.md` 에 감사/실행 백로그 문서를 정본 흐름으로 연결
- DMS 품질 이슈와 레포 전역 게이트 실패를 분리해서 다룰 수 있도록 preflight 실패 원인을 감사 문서에 명시

---

## 2026-03-19

### Diff 모드 회귀 수정

- diff 모드에서 에디터를 제거하지 않고 숨긴 상태로 유지하도록 조정해, `이전보기` 진입 후 편집으로 돌아와도 저장 전 본문 draft가 그대로 남도록 수정
- AI 작성 후 태그/요약 추천 입력을 실제 적용 후 최종 본문 기준으로 통일해, 기존문서에서 완드 버튼과 같은 기준의 추천이 다시 표시되도록 복구
- 기존문서 AI 작성 시 문서명/파일경로 추천이 재실행되지 않도록 현재 분기를 재검증하고, 기존 `수정됨` 배지 및 sidecar의 soft delete/restore 동작은 유지
- 편집 모드 AI 작성 후 태그/요약/제목/경로 후처리가 request lifecycle 종료 전에 모두 완료되도록 순서를 고쳐, 기존문서/새문서/AI 요약 진입의 메타데이터 자동 추천 회귀를 복구
- diff 모드 진입 시 본문/메타데이터의 현재 draft snapshot을 고정해 SplitDiffViewer가 최신 수정본을 안정적으로 표시하고, active 상태에서는 dirty 플래그와 무관하게 이전보기 토글로 편집 모드 복귀가 가능하도록 수정
- doc-assist compose와 AI 요약 진입에서 본문 반영 시점을 태그/요약 자동 추천 완료와 맞춰, 에디터 spinner가 내려갈 때 본문과 사이드카 추천 결과가 함께 나타나도록 통합
- compose 후 자동 추천이 진행되는 동안 태그/요약 섹션의 완드 버튼도 동일한 spinner 상태로 표시해, 사이드카가 현재 AI 후처리 중임을 연속적으로 드러내도록 수정
- AI 작성 요청이 시작되는 즉시 태그/요약 섹션의 완드 버튼도 spinner 상태로 전환하도록 로딩 조건을 `isComposing || 자동추천중`으로 합성해, 본문 응답 대기 구간에도 사이드카가 함께 작업 중임을 보여주도록 보강
- inline compose에서 최종 본문을 계산하는 단계가 실제 삽입까지 수행하던 회귀를 수정해, 태그/요약 자동 추천과 케이스별 후처리가 모두 끝난 뒤에만 본문이 한 번 반영되도록 바로잡음
- 새문서에서는 AI 추천 전까지 정보 섹션의 문서명/문서 경로를 비워두고, 파일명 행은 제거했으며, AI 제목/경로 추천이 성공한 경우에만 저장 예정 preview를 표시하도록 fallback 노출을 차단
- 새문서 AI 작성 후 제목/경로 추천이 실패하면 정보를 숨기지 않고 정보 섹션에 추천 실패 상태를 명시적으로 보여주도록 바꿔, 기능 성공/실패를 사용자가 구분할 수 있게 조정
- `recommendTitleAndPath()` 응답 해석을 공통 helper로 통일해, 새문서 sidecar와 저장 경로 모달이 제목/문서 경로 추천 성공·실패를 동일한 기준으로 표시하도록 정렬
- `recommendTitleAndPath()` 성공 응답인데도 제목이 비어 들어오는 경우를 막기 위해, 서버 fallback 제목 규칙과 같은 본문 첫 유효 줄 기반 보정을 클라이언트 공통 helper에도 추가해 새문서 sidecar와 저장 경로 모달 모두 문서명 무표시 상태를 피하도록 보강
- 정보 섹션에 헤더 완드/로딩 상태와 제목·경로 제안 카드(적용/취소)를 추가하고, 저장 경로 모달의 AI 추천 UI는 제거해 제목/경로 추천 UX를 sidecar로 이동
- 정보 섹션의 문서명/문서 경로도 값 비교 기반 변경 하이라이트를 지원하도록 확장해, 새문서 적용값과 모달 직접 수정값 모두 붉은 변경 표시로 일관되게 렌더링

## 2026-03-16

### 변경 하이라이팅 시스템 (에디터 + 사이드카)

- **문자 수준 diff 하이라이팅** (`fast-diff` 라이브러리 도입)
  - 에디터: CodeMirror 확장으로 `originalContentFacet` + `changedLinesField` StateField 구현
  - 전체 문서 비교 (`fast-diff(original, current)`) — 줄 삽입/삭제 시에도 정확한 diff 표시
  - 추가 문자: `bg-destructive/10` 배경 하이라이트
  - 삭제 문자: `DeletedTextWidget` 인라인 위젯 (취소선 + 회색 + 배경)
- **DiffTextInput 공용 컴포넌트** (`components/common/DiffTextInput.tsx`)
  - textarea + fast-diff 오버레이 패턴 (투명 텍스트 + 뒤에 diff 렌더링)
  - 스크롤 동기화 (onScroll 핸들러로 scrollTop/scrollLeft 싱크)
  - `resizable` prop 지원 (세로 리사이즈)
  - 요약 섹션에서 사용 중, 향후 다른 textarea에서도 재사용 가능

### 소프트 삭제 + 되돌리기 (사이드카)

- **태그/URL/댓글 소프트 삭제**: 삭제 시 즉시 제거하지 않고 취소선 + 붉은 텍스트 + Undo2 아이콘 표시
  - `pendingDeletes` Set으로 삭제 상태 추적
  - 되돌리기 시 `onChange([...items, restoredItem])`으로 부모에 재추가
  - `ChipListSection`: `deletedChipIds`, `onChipRestore` props
  - `ActivityListSection`: `deletedItemIds`, `onItemRestore` props
  - `CommentsSection`: `onRestore` 콜백 + 로컬 `deletedComments` 캐시
- **신규/변경 항목 하이라이트**: `border-destructive/30 bg-destructive/5` 배경으로 표시

### AI 태그 추천 + 요약 생성 (사이드카)

- **WandButton**: 섹션 타이틀 오른쪽에 스파클 아이콘 버튼
  - 태그: AI 추출 → 점선 테두리 + Plus 아이콘으로 추천 표시, 사용자가 클릭하여 개별 추가
  - 요약: AI 생성 → 기존 요약 아래에 추천 표시, 추가/변경/취소 버튼으로 제어
- **API**: `docAssistApi.compose()` 사용, 태그는 JSON 파싱, 요약은 텍스트 직접 사용

### 사이드카 폰트 정규화

- 섹션 타이틀: `text-sm`(14px) + `font-medium` — 위계 최상위
- 콘텐츠: `text-xs`(12px) — 타이틀보다 작게
- 메타/보조: `text-xs`(12px) — 기존 `text-[10px]`/`text-[11px]` 비표준 크기 제거
- 요약 textarea: 세로 리사이즈 가능 (`resize-y`)

### 사이드카 문서정보 개선

- 수정일 → 최종 수정, 수정 시간 → 최종 수정 시간, 생성일 → 작성일, 생성 시간 → 작성 시간
- 에디터 모드에서 줄수/문자수/단어수 숨김 (저장 후 계산 방식)
- 새 문서 작성자 'Unknown' 기본 표시

### 사이드바 정규화

- Changes 상태 텍스트 `text-[10px]` → `text-xs` 정규화
- 푸터 `text-[10px]` → `text-xs` 정규화

### 새 문서 런처 페이지 (Obsidian 스타일)

- **NewDocumentLauncher** 신규 생성 (`components/pages/markdown/_components/NewDocumentLauncher.tsx`)
  - Header "새 도큐먼트" 클릭 시 새 탭에 Obsidian 스타일 런처 페이지 렌더링
  - 4가지 액션 링크: AI 요약, 위키 문서, 템플릿 문서, 닫기
- **진입점 경로 분기**: `/wiki/new` (런처), `/wiki/new-wiki`, `/wiki/new-template`, `/wiki/new-ai-summary`
- **new-doc.store.ts** 신규 생성: AI 요약 파일 데이터 전달용 transient Zustand 스토어
- **AI 요약 원클릭 플로우**: 파일 선택 → `docAssistApi.compose()` 자동 실행 → 에디터에 결과 바인딩
  - 로딩 스피너 표시 (AI 응답 대기 중)
  - 생성 직후 unsaved 상태로 표시
- **템플릿 토글 이동**: 새 문서 생성 모드에서 제거, 기존 문서 편집 모드에서만 표시
- **Header 단순화**: 드롭다운 메뉴 제거 → 단일 버튼으로 런처 탭 오픈
- **ContentArea 라우팅**: `/wiki/new*` prefix 매칭으로 모든 새 문서 경로 지원

## 2026-03-13

### 문서 저장 경로 설정 시스템 (SaveLocationDialog)

- **SaveLocationDialog 모달** 신규 생성 (`components/common/save-location/`)
  - OS 파일 선택기 형태: 문서명 입력 + 폴더 트리 + 자동 파일명 표시
  - `FolderPickerTree`: 디렉토리 전용 트리 선택 컴포넌트 (자체 expand/collapse 상태)
  - Radix Dialog 기반, 문서명/경로/파일명 실시간 미리보기
- **파일명 자동 채번**: nanoid 8자 기반 유니크 파일명 생성 (`lib/utils/generateFilename.ts`)
- **FileTree 문서명 표시**: `FileNode.title` 필드 추가, 서버에서 `.sidecar.json` title 반환, 사이드바에서 문서명 우선 표시
- **DocumentInfoSection 리팩토링**: 인라인 title 편집 제거 → 연필 버튼 클릭 시 SaveLocationDialog 모달 오픈
- **DocumentSidecar 통합**: `isEditingTitle`/`titleDraft` 상태 제거, SaveLocationDialog 연동 (title 변경 + 파일 이동)
- **Save Flow 리팩토링**: 새 문서 저장 시 SaveLocationDialog가 열려 사용자 확인 후 저장
- **TemplateSaveControls 정리**: 인라인 createPath input/경로 추천 버튼 제거 (모달로 이동)

### Sidecar 섹션 공통 컴포넌트 통합

- `SourceLinksSection` 편집 모드를 `ActivityListSection` 기반으로 통합 (기존 `EditableSourceLinks` 커스텀 UI 제거)
  - 편집 시 각 링크에 `actions`(삭제 아이콘) 추가, 하단에 URL 입력 필드를 `children`으로 배치
- `TagsSection` 편집 모드를 `ChipListSection` 기반으로 통합 (기존 `EditableTags` 커스텀 UI 제거)
  - 편집 시 `onChipRemove` 콜백으로 칩 삭제, 하단에 태그 입력 필드를 `children`으로 배치
- `ActivityListSection`에 `children` prop 추가 (리스트 하단 추가 콘텐츠 렌더링)
- `ChipListSection`에 `onChipRemove`, `children` prop 추가 (칩 삭제 버튼 + 하단 추가 콘텐츠)
- Dead Code 삭제: `EditableSourceLinks`, `EditableTags` (EditableFields.tsx)
- 결과: DocumentSidecar의 모든 섹션이 뷰어/에디터 양쪽에서 동일한 공통 컴포넌트를 사용

---

## 2026-03-12

### AskPage → ChatPage 리네이밍 + "AI 대화" 레이블 통일

- `AskPage` → `ChatPage`로 리네이밍 (파일명, 심볼, 경로)
- "Ask"는 일회성 질문을 암시하나 실제로는 세션 기반 대화 인터페이스
- UI 레이블을 "AI 어시스턴트"에서 **"AI 대화"**로 통일
- 내부 탭 경로 `/ai/ask` → `/ai/chat`으로 변경
- variant `'ask'` → `'chat'`으로 변경 (AiSidecar)
- 코드 15개 파일, 문서 4개 파일 일괄 변경

### ViewerPage → DocumentPage 리네이밍

- `ViewerPage` → `DocumentPage`로 리네이밍 (파일명, 인터페이스, 함수명, 훅)
- "Viewer" 접두사가 읽기 전용을 암시하나 실제로는 3가지 모드(viewer/editor/create) 처리
- 코드 7개 파일, 문서 7개 파일 일괄 변경

### DocPageTemplate → PageTemplate 리네이밍

- `DocPageTemplate` → `PageTemplate`으로 리네이밍 (파일명, 인터페이스, 함수명)
- "Doc" 접두사가 문서 전용을 암시하나 실제로는 범용 페이지 셸로 사용 (4곳 중 3곳이 비문서 페이지)
- 코드 9개 파일, 문서 7개 파일 일괄 변경

### 저장소 경로 보안 강화 + DMS 네이밍 정규화

- `server/services/storage/StorageAdapterService.ts`에 공통 containment 해석을 추가해 local open/upload 경로가 모두 `path.resolve` + `path.relative` 기반으로 base path 이탈을 차단하도록 정리
- `server/handlers/storage.handler.ts`, `/api/storage/open`에서 local file download 로직을 handler facade로 이동하고, 허용되지 않은 경로는 `403`, 존재하지 않는 파일은 `404`로 분기
- markdown document sidecar 하위 5개 컴포넌트 파일을 PascalCase로 정규화하고 연관 re-export/import 경로를 갱신
- editor core store와 AI search store 파일명을 각각 `editor-core.store.ts`, `ai-search.store.ts`로 정리하고 상태관리 문서를 현재 구현과 일치하도록 갱신
- `.github/scripts/check-patterns.js`가 `components/pages/**` 엔트리의 `{Feature}Page.tsx` 정본을 오탐하지 않도록 page entry 예외를 반영

---

## 2026-03-10

### 골든 이그잼플 운영 기준선 추가

- `docs/dms/guides/golden-example.md`를 추가해 레이어 판정, 파일 배치, 대표 예시 파일, 자동 검증 기준을 정본으로 고정
- `docs/dms/planning/prd-template.md`를 추가해 작업 요청 입력 형식을 표준화
- `apps/web/dms/scripts/validate-golden-example.mjs`를 추가하고 `pnpm -C apps/web/dms run check:golden-example`로 페이지 엔트리 네이밍, default export 금지, `common/index.ts` 배럴 제한, `common/page` 금지를 자동 검증
- `.codex/.github dms.instructions` 와 `dms-guard`를 새 기준에 맞춰 동기화

### `src/hooks/**` 안정화 정리

- `useEditor.ts`의 undo/redo history를 reducer 기반 단일 상태로 통합해 최대 history 크기 초과 시 인덱스 범위 오류가 나지 않도록 수정
- `useEditor.ts`의 미사용 `timestamp`와 외부 미사용 유틸 반환을 제거하고, 커서 복원은 `setTimeout(0)` 대신 layout effect 기반으로 정리
- `useOpenDocumentTab.ts`의 탭 ID를 `encodeURIComponent(path)` 기반으로 바꿔 경로 치환 충돌(`a/b.md` vs `a-b.md`)을 방지
- `useOpenTabWithConfirm.ts`의 Zustand 구독을 selector 기반으로 정리해 불필요한 전체 store 구독을 제거

### `src/lib/**` 경계 정리

- 미사용 루트 barrel(`src/lib/index.ts`)과 미사용 assistant formatter(`assistantTextFormat`)를 제거하고, dead export를 정리
- 마크다운 렌더링 유틸을 `src/lib/utils/markdown.ts`로 이동하면서 전역 `marked` 설정/카운터 상태를 제거해 순수 함수 형태로 정리
- assistant 전용 도우미를 `src/lib/assistant/`로 분리하고, 공용 상수는 `src/lib/constants/` 하위(`common`, `file`, `path`)로 재배치
- 서버 전용 경로 정규화 유틸을 `server/utils/pathUtils.ts`로 분리해 `Node path` 의존성이 클라이언트 `src/lib`에 남지 않도록 정리
- `errorUtils` 기본 로그 prefix를 `[DMS]`로 수정

### 설정 페이지 명명 정리 + stores 경계 보정

- 설정 페이지 엔트리를 `src/components/pages/settings/SettingsPage.tsx`로 정규화하고, import/라우팅 문서를 새 기준에 맞춰 정리
- `file.store.ts`가 `@/server/services`를 직접 참조하던 레이어 위반을 제거하고, 파일 트리 조회를 `filesApi.getFileTree()` 기반으로 통일
- `layout.store.ts`의 모듈 스코프 resize 리스너를 제거하고, viewport 동기화는 `useLayoutViewportSync()` 훅에서 React lifecycle로 처리

### `src/types/**` 공용 계약 정리

- `src/types`를 클라이언트-서버 공용 계약 중심으로 재정리하고, 파일 트리/문서 메타데이터/북마크 타입을 역할별 파일로 분리
- `layout.ts`, `sidebar.ts`에서 런타임 상수를 제거하고 레이아웃 상수는 `src/lib/constants/layout.ts`, 사이드바 표시 상수는 `components/layout/sidebar/constants.ts`로 이동
- `server/handlers/file.handler.ts`, `server/handlers/files.handler.ts`의 중복 타입 선언을 공용 계약으로 통합하고, 템플릿 저장소 내부 타입은 `server/services/template/types.ts`로 분리

### 템플릿 전용 저장 + 마크다운/사이드카 정본 전환

- 문서 편집 헤더에 `템플릿으로 저장` 토글을 추가하고, 활성화 시 위키 문서 대신 템플릿만 저장하도록 분기
- 템플릿 저장 메타데이터는 우측 사이드카에서 입력하고, 저장 시 해당 메타와 현재 마크다운 본문을 함께 사용
- 템플릿 저장소 정본을 `data/templates/**/*.md` + `.sidecar.json` 구조로 전환하고, 기존 `templates.json`은 레거시 마이그레이션 입력으로만 사용
- `/api/templates` 응답은 기존처럼 `content`를 제공하되, 내부 저장은 파일/사이드카 기반으로 읽어오도록 변경

### DMS 구조 리팩터링 1차 적용

- 홈 페이지 엔트리를 `DashboardPage.tsx` 로 표준화하고 단일 정본으로 정리
- 설정 페이지 구조를 정리하고, 네비게이션/설정 필드 목록/템플릿 섹션을 하위 컴포넌트로 분리
- `src/lib/utils/apiClient.ts`를 `src/lib/api/` 도메인별 모듈로 분리하고 기존 사용처 import를 새 경로로 전환
- `server/handlers/ai.handler.ts`를 facade로 축소하고 검색/질답/요약 로직을 `server/services/ai/` 하위 서비스로 분리

### 인라인 AI 작성 컨텍스트 강제화 + 문서 템플릿 단일 선택

- 에디터 인라인 AI 작성에서 요약 파일 첨부를 단순 참고가 아니라 필수 근거 컨텍스트로 승격
- 요약 파일이 첨부되면 현재 문서/선택 영역은 편집 맥락으로만 전달하고, 생성 내용은 첨부 컨텍스트 범위 안에서 작성하도록 프롬프트를 강화
- 문서 템플릿은 단일 선택만 허용하고, 선택 시 결과를 반드시 해당 템플릿 형식에 맞춰 생성하도록 프롬프트를 강화
- 이미 문서 템플릿이 선택된 상태에서 다른 템플릿을 고르면 교체 확인 다이얼로그를 통해 교체/유지 의도를 묻도록 변경
- 인라인 작성 `+` 메뉴에서 폴더 템플릿 노출과 선택을 제거하고, 문서 경로 추천은 활성 경로 또는 지시문 기반 기본 경로만 사용하도록 단순화
- 요약 첨부 연관성 경고 문구를 “품질 저하 가능성” 중심으로 정리
### AI 환경변수 템플릿 정리 + doc-assist 오류 상태 보정

- `apps/web/dms/.env.example`에서 실제 값/중복 키를 제거하고 `.env.local` 기준 템플릿으로 정리
- Azure OpenAI 예시 변수(`endpoint`, `deployment`, `embedding`, `api version`)를 가이드와 동일한 placeholder 형식으로 통일
- `/api/doc-assist`가 내부 AI/provider 오류를 모두 400으로 내리던 문제를 수정해, 입력 오류만 400으로 처리하고 나머지는 500으로 구분
- `/api/doc-assist`의 LLM 프롬프트 크기를 줄이고(현재 문서/템플릿/요약 첨부 상한 적용) 실패 시 입력 크기 기반 서버 로그를 남기도록 보강
- Azure provider를 deployment-based URL + `chat`/`embeddingModel` 호출로 정렬해 `API version not supported` 오류 가능성을 줄임
- 헤더 `새 도큐먼트` 액션을 드롭다운 없이 즉시 `/wiki/new`로 진입하는 직접 버튼으로 단순화
- AI 검색 페이지에서 초기 검색/재검색 대기 중에는 빈 결과 문구 대신 로딩 스피너를 우선 표시하도록 상태 분리
- AI 채팅 응답을 실제 Markdown 렌더링으로 전환하고, 답변은 자유형을 유지하되 요약/목록/근거 문서 섹션을 더 일관되게 유도하도록 프롬프트를 정리
- 문서 편집기에서 AI 작성 대기 중 삽입 위치 하이라이트에 로딩 스피너를 함께 표시하도록 보강
- 문서 편집기 슬래시 커맨드 패널이 툴바와 동일한 명령/아이콘 정의를 재사용하도록 정렬

---

## 2026-02-25

### 인라인 작성 적용 모드 정교화 + API 응답 포맷 정렬

- `/api/doc-assist` compose 응답에 `applyMode`(`replace-document|replace-selection|append`) 추가
- 지시어 기반 적용 분기 보강:
  - 선택 텍스트가 있으면 선택 치환
  - `추가/append/덧붙` 계열은 하단 추가
  - `전체 삭제/문서 비우기` 계열은 문서 전체 치환(빈 본문)
- Viewer 인라인 작성 상태를 전역 Assistant 상태와 분리:
  - 인라인 템플릿/요약첨부/연관성 경고를 페이지 로컬 상태로 관리
- `/api/doc-assist`, `/api/templates` 라우트 응답을 `success/data` 래핑 없이 데이터 본문 직렬화로 정렬
- 템플릿 저장소 시드 파일 추가:
  - `apps/web/dms/data/templates/templates.json`

---

## 2026-02-24

### AI 작성 구조 통합 + 템플릿/첨부/경로 추천 1차 반영

- `/ai/create` 페이지 제거, 새 문서/수정 화면 하단 인라인 AI 작성으로 통합
- 상단 `새 도큐먼트` 메뉴를 단일 진입(`문서 작성`)으로 정리
- Assistant `+` 메뉴 확장:
  - 문서 첨부
  - 문서 템플릿/폴더 템플릿 선택
  - 요약용 파일 멀티 첨부
- 인라인 작성 API 추가:
  - `/api/doc-assist` (`compose`, `recommendPath`)
- 템플릿 API 추가:
  - `/api/templates` (전역/개인 템플릿 CRUD)
- 생성 경로 UX 1차 반영:
  - 생성 모드에서 저장 경로 직접 입력
  - AI 경로 추천 버튼 제공
- 첨부 파일 연관성 경고 1차 반영:
  - 지시문 대비 연관성이 낮은 파일에 soft warning 표시

---

### 저장소/수집/딥리서치 1차 구현 반영

- 설정 스키마 확장:
  - `storage.defaultProvider`, `storage.local.*`, `storage.sharepoint.*`, `storage.nas.*`
  - `ingest.queuePath`, `ingest.autoPublish`, `ingest.maxConcurrentJobs`
- 서버 구현:
  - 저장소 어댑터 서비스 추가 (`Local/SharePoint/NAS`)
  - 수집 큐 서비스 추가 (`draft → pending_confirm → published`)
- API 추가:
  - `/api/storage/upload`, `/api/storage/open`
  - `/api/ingest/submit`, `/api/ingest/jobs`, `/api/ingest/jobs/:id/confirm`
- UI 반영:
  - Sidecar 첨부 카드에 `Open / URI 복사 / Resync` 액션 추가
  - Settings 페이지에 Storage/Ingest 설정 섹션 추가
- AI 모드 반영:
  - `/api/search`에 `contextMode(wiki|deep)`, `activeDocPath` 파라미터 반영
  - `/api/ask`에 JSON 모드(`stream=false`) 응답 추가 및 `citations/confidence` 확장

---

### 저장소/수집/세컨드브레인 운영 아키텍처 확정

- 저장소 어댑터 3종(Local/SharePoint/NAS) 동시 지원 방향 확정
- 기본 저장소 SharePoint + 문서/첨부별 오버라이드 허용 정책 확정
- 정본/첨부 수정 정책 확정:
  - DMS 내부 직접 편집 대신 원본 열기 후 사용자 직접 수정(권한 기반)
  - DMS는 열기/경로복사/재동기화 허브 기능 제공
- 자동 수집 플로우 확정:
  - DMS 수집공간, 네트워크 경로, Teams 챗봇 유입을 비동기 수집으로 통합
  - 요청자 컨펌 후에만 위키 게시
- AI 모드 분리 확정:
  - 기본 챗봇/검색은 위키 중심
  - 딥리서치는 세컨드브레인 UI 진입 시만 활성
  - 딥리서치 응답은 출처/신뢰도 필수
- 통합 아키텍처 정본 문서 추가:
  - `docs/dms/planning/storage-and-second-brain-architecture.md`

---

### 설정 페이지 표준 정렬 리디자인

- `SettingsPage`를 `PageTemplate` 기반으로 재구성하고, 설정 페이지는 `sidecarMode=\"hidden\"`으로 사이드카/토글을 비활성화
- `PageTemplate`에 `sidecarMode ('default' | 'custom' | 'hidden')`를 추가해 페이지별 사이드카 렌더링 정책을 명시적으로 제어
- 설정 항목 라벨을 사용자 친화형으로 정리하고, 기술 키(`git.*`)는 보조 표기로 분리
- 설정 입력 검증 강화:
  - 작성자 이름 필수
  - 작성자 이메일 필수 + 형식 검증
  - 상대 경로 입력 시 안내 배너 제공
- 저장 UX 개선:
  - 변경 항목 요약 표시
  - 경로 변경 시 파일 복사 옵션 배너 유지/정렬
  - 성공/오류 상태 배너를 DMS 테마로 통일
- 설정 페이지의 하드코딩 `blue-*` 스타일을 제거하고 `ssoo-*` 디자인 토큰 기반으로 정렬

---

## 2026-02-23

### DMS 문서 정본 단일화 + 위키 런타임 경로 분리

- DMS 문서 정본을 `docs/dms/`로 단일화
- 기존 `apps/web/dms/docs/` 문서 트리를 `docs/dms/`로 이관하고 레거시 문서는 `docs/dms/_archive/`로 이동
- 런타임 위키 자산을 `apps/web/dms/data/wiki/`로 분리
- 설정 기본 경로를 `data/wiki`로 변경 (`ConfigService`, Settings 설명 문구)
- 문서/규칙 참조 경로를 `docs/dms` 기준으로 전면 갱신

---

### AI 채팅 공통 컴포넌트화 + 세션 API 보강

- 플로팅 챗봇 패널과 `AI 질문` 페이지의 중복 UI를 공통 컴포넌트로 통합
  - `AssistantMessageList`, `AssistantComposer`, `AssistantSessionHistoryList` 신규 도입
  - 응답 텍스트 정리 로직(`assistantTextFormat`) 공통화
  - 포커스 이벤트 상수(`ASSISTANT_FOCUS_INPUT_EVENT`) 공용화
- 채팅 세션 저장 API(`/api/chat-sessions`) 입력 검증 강화
  - `clientId`, `sessionId` 형식 검증 추가
  - `title` 길이 제한, `messages` 개수/바이트 제한 추가
  - 세션 정렬 안정성 개선(`updatedAt` + `id` 타이브레이커)
- 사이드카 채팅 기록 목록 렌더링도 공통 세션 리스트 컴포넌트로 통합

---

### 전역 플로팅 AI 어시스턴트 도입

- 헤더의 질문 입력/질문-검색 전환 드롭다운 제거
- 우측 하단 플로팅 버튼 + 오버레이 챗 패널 전역 배치
- 챗 입력 의도 라우팅 추가: 질문은 `/api/ask`, 검색 요청은 `/api/search`
- 검색 결과 카드에서 파일 클릭 시 문서 탭(`/doc/...`) 직접 오픈
- 홈 대시보드의 `AI 질문` 카드 제거, `AI 검색` 카드만 유지
- 탭 라우팅에서 `/ai/ask` 매핑 제거 및 관련 레이아웃 타입 정리

---

### Azure OpenAI Entra 토큰 자동 갱신 적용

- `server/services/ai/provider.ts`에 Entra ID 토큰 자동 발급/갱신 로직 추가
- Managed Identity 우선, Service Principal(`AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET`) 폴백 체인 구성
- Entra 토큰 실패 시 `AZURE_OPENAI_API_KEY` 경로로 호환 폴백 유지
- `/api/ask`, `/api/create` 경로에서 비동기 모델 초기화 방식 반영
- `.env.example`에 Entra/Managed Identity/OpenAI API version 변수 추가
- API 가이드에 `React -> Next API -> Azure OpenAI` 보안 구조 문서화

---

## 2026-02-10

### 문서형 레이아웃 표준화

- 문서 방향(세로/가로) 기준 폭 상수 정의 및 PageTemplate 기본 적용
- 마크다운/AI 페이지를 동일한 문서형 컨테이너 패턴으로 정렬
- AI 페이지 공통 셸 컴포넌트 도입
- PageTemplate 초기 레이아웃 측정 전 트랜지션 억제
- DocumentPage 뷰어 툴바의 임베디드 스타일을 이전 패딩 기준으로 복원
- 뷰어 툴바 컨테이너 배경/보더 투명 처리
- 뷰어 모드에서 PageTemplate 표면을 투명 처리하고 본문 박스만 유지
- 에디터 툴바 표면을 뷰어와 동일하게 투명 처리
- 마크다운 뷰어 페이지 파일명을 규칙에 맞게 변경 (DocumentPage)
- 에디터 모드에서도 PageTemplate 표면을 투명 처리하고 본문 박스만 유지
- ESLint flat config에서 Next preset 로딩 방식 수정

### 사이드카 편집 기능 개선

- 사이드카 섹션 접기/펼치기(CollapsibleSection) 적용
- 뷰어 모드에서 댓글 입력 지원 (Enter 전송)
- 빈 섹션 플레이스홀더 표시
- 작성자 기본값을 'Unknown'으로 변경

### 헤더 UserMenu 추가

- PMS 스타일 UserMenu 드롭다운 적용 (인증 미구현, 더미 데이터)
- 드롭다운 너비를 액션 영역에 맞춤 (ResizeObserver)

### 헤더/사이드바 드롭다운 보정

- 새 도큐먼트 모달을 버튼 하단 드롭다운 패널로 변경 (AI 작성/ UI 작성)
- 새 도큐먼트 드롭다운 폭을 버튼 너비와 동기화
- 헤더 AI 검색/사이드바 문서 타입 트리거에 텍스트 표시
- 헤더/사이드바 드롭다운 간격을 사용자 메뉴와 동일하게 통일

## 2026-02-09

### AI 질문/검색 구조 정리

- 상단 AI 진입점을 질문/검색 모드로 분리
- 질문/검색/AI 작성 페이지 추가 및 탭 라우팅 확장
- `/api/ask`, `/api/search` 기본 핸들러 추가
- AI 질문/검색/작성 페이지를 문서형 콘텐츠 폭(975px) 규칙으로 정렬

### 문서 메타데이터/사이드카 확장

- 마크다운과 동일 이름의 JSON 메타데이터 파일 자동 생성
- 사이드카에 첨부 파일 링크 표시 지원

### 디자인 문서 업데이트

- 문서형 콘텐츠 폭(975px) 규칙과 PageTemplate 적용 패턴 추가

## 2026-01-29 (계속)

### 종합 검증 및 분석

#### PMS-DMS 비교 분석 완료
- 분석 문서 작성: `docs/dms/_archive/architecture/pms-dms-comparison-analysis.md`
- 4가지 관점에서 종합 분석:
  1. 패키지 차이 분석
  2. 소스 디렉토리 구조 차이
  3. 앱 초기화 흐름 차이
  4. 코드 패턴/네이밍 룰 차이

#### 즉시 조치 항목 수정
| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| package.json name | `markdown-wiki` | `web-dms` |
| dev 포트 | 기본(3000) | 3001 |
| lint 스크립트 | 없음 | `"lint": "next lint"` |
| Root Layout lang | `en` | `ko` |

#### 주요 발견 사항
- ✅ 최상위 디렉토리 구조 100% 일치
- ✅ Store 네이밍 컨벤션 통일 완료
- ✅ pageComponents 패턴 동일 구조
- ⚠️ 루트 컴포넌트 16개 파일 정리 필요 (DMS-REF-01 백로그 추가)

---

### Phase 5 완료: 라우트 정리 ✅

#### 루트 진입점 변경
- `/wiki` → `/` 메인 진입점 변경
- 브라우저 공개 URL: `/`
- HOME_TAB internal path: `/home`
- 문서 탭 경로: `/doc/{filePath}`

#### Middleware 추가
- 루트 고정 정책 적용: 내부 탭 경로 직접 접근 → `/` 리다이렉트
- 정적 파일 제외: `_next`, 확장자 있는 파일, `favicon.ico`

#### 최종 라우트 구조
```
src/app/
├── layout.tsx         # Root (Toaster)
└── (main)/
    ├── layout.tsx     # AppLayout
    └── page.tsx       # 루트 페이지 (/)
```

---

### Phase 4 완료: API 레이어 정리 ✅

- apiClient.ts 확장 (userApi, searchApi, uploadApi, aiApi)
- 직접 fetch 호출 제거 (7개 파일)
- AppLayout children prop 제거

---

### Phase 3 완료: PMS 패턴 동기화 ✅

- pageComponents 패턴 적용
- WikiHomePage, WikiViewerPage, AISearchPage 생성
- SidebarFileTree 단순화

---

## 2026-01-29

### Phase 3 시작: PMS 패턴 동기화 분석

#### 분석 완료
- PMS vs DMS 초기화 흐름 전체 비교 분석
- 핵심 차이점 식별:
  - ContentArea: PMS는 `pageComponents` 동적 로딩, DMS는 조건부 분기
  - 데이터 로딩: PMS는 페이지가 자체 로드, DMS는 loadFile() 호출 누락
- 필요한 페이지 컴포넌트 목록 정의

#### 문서 작성
- `docs/dms/explanation/architecture/app-initialization-flow.md` - Phase 3 상세 계획
- `docs/pms/explanation/architecture/app-initialization-flow.md` (모노레포 루트) - PMS 앱 초기화 흐름

#### 결정사항
- **Option A 채택**: PMS 패턴과 동기화 (일관성 및 통합 준비)
- 페이지 컴포넌트 생성 후 ContentArea 리팩토링 진행

#### 필요한 페이지 컴포넌트
| 컴포넌트 | 경로 | 우선순위 |
|----------|------|----------|
| `WikiHomePage` | `/wiki` | ⭐⭐⭐ |
| `WikiViewerPage` | `/wiki/:path` | ⭐⭐⭐ |
| `AISearchPage` | `/ai-search` | ⭐⭐ |

---

## 2026-01-28 (계속)

### 문서 - 정합성 보정 착수

- `docs/dms/AGENTS.md` 신규 작성 (인수인계 기준)
- `docs/dms/planning/verification-report.md` 정본 경로 및 표준 섹션 반영
- `docs/dms/explanation/architecture/package-spec.md` 의존성 목록 정합성 정리

### UI - 로딩 스피너 공통화

- `StateDisplay` 기준 Loader2 스피너 도입
- `ContentArea`, `PageTemplate`, `Header` 로딩 UI 통일
- AI 검색 버튼 로딩 스피너를 공통 컴포넌트로 교체
- 가이드 문서에 로딩 스피너 표준 추가

### 스타일 - Phase 2-H: PMS 디자인 시스템 통합 완료 ✅

**목표**: DMS 사이드바/레이아웃 스타일을 PMS 표준에 100% 맞춤

#### 커밋 이력

| 커밋 | 내용 |
|------|------|
| `7c21b48` | 사이드바 스타일 통일 (Search, OpenTabs, FileTree) |
| `ac9853e` | 타이포그래피 표준 적용 (heading, body, icon 유틸리티) |
| `4072ef4` | TreeComponent 아이콘 Lucide로 변경 |
| `45ae1fd` | 사이드바 구조 PMS 표준 적용 (8가지 항목) |
| `97cd55f` | SidebarFileTree PMS 스타일 재작성 |
| `a5f08ab` | PMS/DMS 사이드바 스타일 최종 통일 |

#### 주요 변경 사항

**1. 사이드바 구조 개편**

| 영역 | 변경 전 | 변경 후 |
|------|---------|---------|
| 로고 | DMS 아이콘 | W 아이콘 + "Wiki" 텍스트 (PMS 스타일) |
| 헤더 우측 | 문서 타입 드롭다운 (넓음) | 아이콘+쉐브론 컴팩트 드롭다운 |
| 검색란 | 단독 | 검색 + 새로고침 버튼 |
| 섹션 1 | 열린 문서 | **책갈피** (신규 추가) |
| 섹션 2 | 파일 탐색기 | 현재 열린 페이지 |
| 섹션 3 | - | 전체 파일 |
| 푸터 | 없음 | 카피라이트 (DMS v1.0.0 © 2026 LS Electric) |

**2. 신규 컴포넌트**

| 컴포넌트 | 경로 | 설명 |
|----------|------|------|
| `SidebarSection` | `layout/sidebar/SidebarSection.tsx` | 재사용 섹션 래퍼 (PMS 동일) |
| `SidebarBookmarks` | `layout/sidebar/SidebarBookmarks.tsx` | 책갈피 목록 (PMS 즐겨찾기 동일) |
| `ScrollArea` | `components/ui/scroll-area.tsx` | 커스텀 스크롤바 (PMS 복사) |

**3. Store 확장**

| Store | 추가 항목 |
|-------|----------|
| `tab-store` | `BookmarkItem` 타입, `addBookmark`, `removeBookmark`, `isBookmarked` |
| `layout-store` | `expandedFolders: Set<string>`, `toggleFolder`, `expandFolder`, `collapseFolder` |

**4. SidebarFileTree 재작성**

- ❌ 기존: `TreeComponent` 임포트 사용
- ✅ 신규: `FileTreeNode` 직접 구현 (PMS `MenuTreeNode` 스타일)
- 노드 스타일: `paddingLeft: 8 + level * 16`, `h-control-h`, 보더 없음

**5. PMS/DMS 스타일 통일 (양방향 수정)**

| 항목 | 통일된 값 | 수정 방향 |
|------|----------|:---------:|
| 헤더 높이 | `h-header-h` | DMS → PMS |
| 검색/섹션 보더 | `border-gray-200` | PMS → DMS |
| 스크롤 영역 | `<ScrollArea variant="sidebar">` | PMS → DMS |
| 검색 닫기 버튼 | `<X className="w-3.5 h-3.5">` | DMS → PMS |

#### 최종 일치율

| 구분 | 수정 전 | 수정 후 |
|:----:|:-------:|:-------:|
| 스타일 일치 | ~70% | **95%** |
| 의도적 차이 | 25% | 5% |
| 불일치 | 5% | **0%** |

---

### 리팩터링 - Phase 2-G: 컴포넌트 재분류 계획 수립 (진행 중)

**목표**: PMS 레이아웃 구조를 DMS에 적용하여 일관성 확보

#### ✅ Step 1-4: 레이아웃 컴포넌트 생성 완료

**생성된 컴포넌트:**
| 컴포넌트 | 경로 | 설명 |
|----------|------|------|
| `AppLayout` | `layout/AppLayout.tsx` | PMS 스타일 메인 레이아웃 |
| `Header` | `layout/Header.tsx` | AI 검색 드롭다운 + 새 도큐먼트 |
| `MainSidebar` | `layout/MainSidebar.tsx` | 문서 타입 전환 + 파일 검색 |
| `TabBar` | `layout/TabBar.tsx` | 문서 탭 관리 |
| `ContentArea` | `layout/ContentArea.tsx` | 탭별 콘텐츠 렌더링 |
| `SidebarSearch` | `layout/sidebar/SidebarSearch.tsx` | 파일 검색 |
| `SidebarOpenTabs` | `layout/sidebar/SidebarOpenTabs.tsx` | 열린 문서 목록 |
| `SidebarFileTree` | `layout/sidebar/SidebarFileTree.tsx` | 파일 트리 (TreeComponent 활용) |

**생성된 Store:**
| Store | 경로 | 설명 |
|-------|------|------|
| `tab-store` | `stores/tab-store.ts` | 탭 상태 관리 (persist) |
| `layout-store` | `stores/layout-store.ts` | 레이아웃 상태 (문서 타입, AI 검색 타입) |

**생성된 Type:**
| Type | 경로 | 내용 |
|------|------|------|
| `layout.ts` | `types/layout.ts` | TabItem, DocumentType, AISearchType 등 |

#### ✅ Step 6: 페이지 연결

- `(main)/layout.tsx` 생성 - AppLayout 적용
- `(main)/wiki/page.tsx` 수정 - WikiApp → WikiEditor 직접 렌더링

#### 레이아웃 구조 통일 (PMS와 동일)
```
┌───────────────────────────────────────────────────┐
│                    Header                          │
│  [AI검색(드롭다운)] [새 도큐먼트] [알림] [프로필]      │
├──────────┬────────────────────────────────────────┤
│          │              TabBar                     │
│ Sidebar  ├────────────────────────────────────────┤
│          │                                         │
│  ▼ 전환  │           ContentArea                   │
│  검색    │         (WikiEditor/Viewer)             │
│  탭목록  │                                         │
│  트리    │                                         │
└──────────┴────────────────────────────────────────┘
```

#### 주요 변경 계획
| 영역 | PMS | DMS 변경 |
|------|-----|----------|
| **헤더** | 통합검색(준비 중), 새 프로젝트 | **AI검색**(Gemini/RAG 드롭다운), 새 도큐먼트 |
| **사이드바 접기** | 접기/펼치기 버튼 | **문서 타입 전환** 드롭다운 (위키/시스템/블로그) |
| **검색** | 메뉴 검색 | **파일 검색** |
| **즐겨찾기** | 있음 | **제외** |
| **탭** | 페이지 탭 | **문서 탭** (신규) |
| **콘텐츠** | 동적 페이지 | WikiEditor/Viewer |

#### 컴포넌트 이동/생성 목록
- `WikiApp.tsx` → 삭제 (AppLayout으로 대체)
- `WikiSidebar.tsx` → 삭제 (MainSidebar로 대체)
- `TreeComponent.tsx` → `sidebar/SidebarFileTree.tsx`
- 신규: `AppLayout`, `Header`, `MainSidebar`, `TabBar`, `ContentArea`

---

## 2026-01-28

### 리팩터링 - Phase 2-F: Fluent UI 제거 완료 ✅

**목표**: DMS에서 Fluent UI 완전 제거 및 Tailwind CSS + Radix UI + Lucide 아이콘으로 통일

#### 제거된 패키지 (96개)
```bash
npm uninstall @fluentui/react @fluentui/react-components @fluentui/react-icons
```

#### 신규 추가 UI 컴포넌트 (8개)
| 컴포넌트 | 경로 | 설명 |
|----------|------|------|
| `Button` | `components/ui/button.tsx` | CVA 기반 (shadcn/ui 스타일) |
| `Card` | `components/ui/card.tsx` | Card, CardHeader, CardTitle, CardDescription, CardFooter |
| `Input` | `components/ui/input.tsx` | 네이티브 input 래퍼 |
| `Dialog` | `components/ui/dialog.tsx` | Radix Dialog + DialogSurface, DialogBody alias |
| `Dropdown` | `components/ui/dropdown.tsx` | Radix Dropdown + Fluent 호환 API |
| `Tooltip` | `components/ui/tooltip.tsx` | Radix Tooltip + SimpleTooltip |
| `Progress` | `components/ui/progress.tsx` | Radix Progress (ProgressBar alias) |
| `Spinner` | `components/ui/spinner.tsx` | SVG 스피너 |
| `Divider` | `components/ui/divider.tsx` | 구분선 (Separator alias) |
| `Menu` | `components/ui/menu.tsx` | Radix Context Menu |

#### 변환된 컴포넌트 (13개)
| 컴포넌트 | 주요 변경 |
|----------|----------|
| `EditorToolbar.tsx` | 18개 Fluent 아이콘 → Lucide |
| `WikiEditor.tsx` | Card, Button, Dialog, Tooltip → 로컬 UI |
| `WikiSidebar.tsx` | makeStyles/shorthands 제거, Menu → 네이티브 버튼 |
| `WikiApp.tsx` | Folder24Regular 등 → Lucide |
| `TextSearch.tsx` | Search24Regular 등 → Lucide |
| `ThemeToggle.tsx` | WeatherSunny/Moon → Sun/Moon |
| `CreateFileModal.tsx` | Card, Button, Input, Dropdown → 로컬 UI |
| `AIChat.tsx` | Input, Button, Card, Spinner → 로컬 UI |
| `FileUpload.tsx` | Card, ProgressBar, Spinner → 로컬 UI |
| `GeminiChat.tsx` | Card, Input, Button → 로컬 UI |
| `LinkModal.tsx` | variant="primary" → variant="default" |
| `SearchPanel.tsx` | Input, Button, Card, Spinner → 로컬 UI |
| `TreeComponent.tsx` | Button props 수정 (size="sm", variant="ghost") |

#### Radix UI 패키지 추가 (6개)
- `@radix-ui/react-tooltip`
- `@radix-ui/react-dialog`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-progress`
- `@radix-ui/react-context-menu`
- `@radix-ui/react-slot`

#### Button 컴포넌트 API 변경
| 기존 (Fluent UI) | 신규 (shadcn/ui 스타일) |
|------------------|-------------------------|
| `appearance="primary"` | `variant="default"` |
| `appearance="outline"` | `variant="outline"` |
| `appearance="subtle"` | `variant="ghost"` |
| `size="small"` | `size="sm"` |

#### layout.tsx 변경
- `FluentProvider` 제거
- `webLightTheme` import 제거

---

## 2026-01-27

### 문서

- **문서 구조 개편**: PMS 양식에 맞춰 문서 체계 재구성
  - `development/` 하위에 architecture/, domain/, design/, guides/, planning/ 생성
  - 기존 문서 재배치 및 신규 문서 작성
- **정합성 검증 완료**: 실제 코드와 문서 100% 일치 확인
  - Hooks: 9개 (라인 수 검증)
  - Components: 35개
  - API: 19개

### 이동된 문서

| 기존 위치 | 새 위치 |
|----------|---------|
| `apps/web/dms/docs/explanation/architecture/tech-stack.md` | `docs/dms/explanation/architecture/tech-stack.md` |
| `apps/web/dms/docs/explanation/architecture/package-spec.md` | `docs/dms/explanation/architecture/package-spec.md` |

---

## 2026-01-21

### 문서

- DMS 문서 구조 정리 계획 초안 작성
- 위키 통합 계획 문서 추가
- TypeDoc/Storybook 역할 정리

---

## 변경 유형 범례

| 태그 | 설명 |
|------|------|
| 기능 | 새로운 기능 추가 |
| 수정 | 버그 수정 |
| 리팩터링 | 코드 구조 개선 |
| 문서 | 문서화 작업 |
| 설정 | 설정 파일 변경 |
| 스타일 | UI/UX 개선 |

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-24 | Codex 품질 게이트 엄격 모드 적용에 맞춰 문서 메타 섹션 보강 |
