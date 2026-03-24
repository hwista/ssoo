# DMS 커스텀 훅 가이드

> 최종 업데이트: 2026-03-23

이 문서는 `src/hooks/**` 의 앱 범용 훅 기준을 설명합니다.

## 현재 범용 훅

| 훅 | 파일 | 용도 |
|----|------|------|
| `useOpenTabWithConfirm` | `src/hooks/useOpenTabWithConfirm.ts` | 탭 초과 시 확인 다이얼로그 |
| `useOpenDocumentTab` | `src/hooks/useOpenDocumentTab.ts` | 문서 탭 열기 |
| `useLayoutViewportSync` | `src/hooks/useLayoutViewportSync.ts` | viewport와 layout store 동기화 |
| `useBodyLinks` | `src/hooks/useBodyLinks.ts` | 본문 링크 이벤트 위임 |
| `useFloatingButtonDrag` | `src/hooks/useFloatingButtonDrag.ts` | 플로팅 버튼 드래그 상호작용 |
| `useRequestLifecycle` | `src/hooks/useRequestLifecycle.ts` | 비동기 요청 상태/취소 관리 |
| `useContentClickHandler` | `src/hooks/useContentClickHandler.ts` | 본문 클릭 처리 |

## 경계 기준

- `src/hooks/**` 는 앱 범용 훅만 둡니다.
- markdown editor/page 전용 훅은 `components/pages/markdown/**` 의 page-local support 로 둡니다.
- 예:
  - `useDocumentPageComposeActions`
  - `useDocumentPageMode`
  - `useDocumentPageSidecar`
  - `useDocumentPageAI`
  - `useDocumentPageReferences`
  - `useDocumentPageReferenceSelection`
  - `useDocumentPageReferenceRestore`
  - `useDocumentPagePendingAttachments`
  - `useDocumentPageDiff`
  - `useDocumentPageNavigation`
  - `useDocumentPageActions`
  - `useAiSummaryAutoExec`
  - `useDocumentPageLauncher`
  - `useEditorState`
  - `useEditorInteractions`
- 위 훅들은 범용 훅이 아니라 markdown page 런타임 일부입니다.

## 기본 가이드

Do:

- 컴포넌트 최상위에서만 호출
- 의존성 배열을 정확히 유지
- 외부 store selector를 우선 사용

Don't:

- 조건문 안에서 호출
- 반복문 안에서 호출
- page-local 훅을 범용 훅처럼 `src/hooks` 로 끌어올리기

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-03-23 | `useDocumentPageReferences`를 조립 hook + 3개 하위 hook으로 재구성하고 `DocumentPage` 추가 분해용 page-local hook(`Navigation/Actions/AiSummaryAutoExec/Launcher`)을 반영 |
| 2026-03-23 | `DocumentPage` 2차 분해 기준으로 page-local hook 5종(`Mode/Sidecar/AI/References/Diff`)과 compose action 경량화를 반영 |
| 2026-03-23 | 앱 범용 훅 목록과 page-local 훅 경계 기준으로 현행화 |
| 2026-03-11 | `useOpenDocumentTab` 설명 추가 |
