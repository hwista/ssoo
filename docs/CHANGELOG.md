# Changelog

## [Unreleased]

### Features

* **web-pms:** 프로젝트 상세 페이지 — 기본정보 + 상태 타임라인 + 단계별 탭(요청/제안/수행/전환) 조회·편집
* **server:** 프로젝트 단계별 상세 API — `PUT /api/projects/:id/{request,proposal,execution,transition}-detail` upsert 엔드포인트 4개, `findOne`에 전체 relation include, `statusCode` 필터 추가
* **types:** `ProjectRequestDetail`, `ProjectProposalDetail`, `ProjectExecutionDetail`, `ProjectTransitionDetail`, `ProjectStatus`, `ProjectDetail` 등 12개 공유 타입 추가
* **web-pms:** Proposal/Execution/Transition 목록 페이지 실데이터 전환 (Mock → `useProjectList` + `statusCode` 필터)
* **web-pms:** 목록 행 클릭 → 프로젝트 상세 탭 열기 (MDI keep-alive)
* **web-pms:** `useCurrentTab` 훅 — TabContext 기반 탭 파라미터 접근

* **web-dms:** 본문 링크 sidecar 싱크 — 마크다운 본문의 링크/이미지를 실시간 추출하여 sidecar 링크 섹션에 자동 반영
* **web-dms:** 이미지 삽입 다이얼로그 — URL 입력 + 로컬 파일 업로드 탭, 이미지 업로드는 문서 저장 시 지연 처리
* **web-dms:** 링크 삽입 다이얼로그 — URL 입력 + 내부 문서 파일트리 선택 (FilePickerTree 공통 컴포넌트)
* **web-dms:** 이미지 미리보기 모달 — sidecar 이미지 링크 클릭 시 모달 표시, 전체화면 lightbox (react-zoom-pan-pinch: 휠 줌/드래그 팬/더블클릭 리셋/컨트롤바)
* **web-dms:** 위키 내부 이미지 서빙 API (`/api/file/raw`)
* **web-dms:** Docker 배포 지원 — Dockerfile (multi-stage standalone), compose.yaml (pgvector + DMS 서비스)
* **web-dms:** 서버 시작 시 pgvector 확장 및 임베딩 테이블 자동 초기화 (instrumentation.ts)
* **web-dms:** 변경 하이라이팅 시스템 — 에디터 문자 수준 diff (fast-diff), DiffTextInput 공용 컴포넌트
* **web-dms:** 사이드카 소프트 삭제 + 되돌리기 (태그/URL/댓글)
* **web-dms:** AI 태그 추천 + 요약 생성 (WandButton)
* **web-dms:** Obsidian 스타일 새 문서 런처 페이지
* **web-dms:** AI 요약 원클릭 플로우
* **web-dms:** settings shell — `/settings` 탭 대신 전역 설정 모드, system/personal 설정 분리, 공용 JSON renderer/editor/diff 도입
* **web-dms:** settings surface 확장 — storage runtime 필드(`enabled`, `webBaseUrl`), upload/search/DocAssist 정책, viewer/sidebar 개인 기본값, M365 metadata-only 설정 추가

### Improvements

* **web-dms:** GitLab workspace publish flow — full-workspace `development` branch, `codex:workspace-sync-from-gitlab` / `codex:workspace-publish` 추가, 기존 `codex:dms-*` 는 호환 래퍼로 유지
* **web-dms:** sidecar 링크 섹션 아이콘 — Globe(외부)/FileText(내부 문서)/Image(이미지) 타입별 구분
* **web-dms:** 링크 본문 찾기 — sidecar에서 ↳ 버튼 클릭 시 뷰어/에디터 내 해당 링크로 스크롤 + 하이라이팅
* **web-dms:** 내부 문서 링크 클릭 시 새 탭으로 열기, 외부 링크는 브라우저로 열기
* **web-dms:** 이미지/링크/문서경로 설정 모달 크기 통일 (max-w-lg h-[480px])
* **web-dms:** bare path 링크 해석 개선 — `goals.md` 같은 상대 경로를 현재 파일 디렉토리 기준으로 해석
* **web-dms:** settings shell 헤더 정리 — 사이드바 브랜드 슬롯을 `뒤로가기 + 설정`으로 재구성하고, 상단 헤더 검색을 전역 설정 검색으로 전환하며 scope 뱃지를 제거
* **web-dms:** settings shell 단순화 — sidebar 브랜드 보조 문구 제거, 설정 검색을 sidebar 검색 슬롯으로 이동, UserMenu 설정 진입점을 단일 항목으로 정리
* **web-dms:** settings shell 3뎁스 네비게이션 — outer sidebar를 `시스템 설정`/`개인 설정` scope selector로 축소하고, `SettingsPage` 내부에 좌측 section menu + 우측 detail surface를 도입
* **web-dms:** settings navigation visual consistency — outer scope selector와 inner section menu를 기존 sidebar row/list 패턴으로 통일하고, navigation 내부 설명 문구를 제거
* **web-dms:** settings typography token alignment — settings UI를 재점검해 semantic typography token 구성을 유지하고, JSON raw editor를 `font-mono + text-code-block` 기준으로 정리
* **web-dms:** settings navigation row typography alignment — outer/inner settings rows를 실제 FileTree row 리듬(`font-sans`, `gap-1`, `px-2`) 기준으로 다시 맞춰 문서 목록과의 체감 차이를 축소
* **web-dms:** settings navigation section rhythm alignment — 2열 settings 구조는 유지하되, outer/inner navigation 모두 기존 sidebar의 `Section 헤더 + 목록` 위계를 더 직접적으로 재현하도록 조정
* **web-dms:** settings navigation sidebar parity refinement — flat settings rows를 `OpenTabs`/`Bookmarks`와 같은 `gap-2`, `px-3` rhythm으로 재정렬하고, inner navigation을 detail card와 시각적으로 분리해 page 내부 sidebar처럼 읽히도록 보정
* **web-dms:** settings navigation section reuse — outer/inner navigation header에서 실제 sidebar `Section` 컴포넌트를 재사용해 header 구조 drift를 제거
* **web-dms:** settings navigation flat list reuse — settings 메뉴에서는 `Section`/collapse를 제거하고, `OpenTabs`/`Bookmarks`와 동일한 `FlatList`/`FlatListItem` row primitive를 공유하도록 정리
* **web-dms:** settings navigation exact flat row render — `FlatListItem` 에서 실제 clickable element와 label span에 typography token을 직접 적용하고, `cn()`/`tailwind-merge` 가 custom `text-*` size token을 color class와 함께 제거하던 경로를 피해 settings/OpenTabs/Bookmarks가 동일 14px row render를 유지하도록 정리
* **web-dms:** settings flat row font inheritance fix — `FlatListItem` row container가 semantic typography token을 직접 들고, settings/OpenTabs/Bookmarks가 동일한 typography inheritance 경로를 공유하도록 보정
* **web-dms:** settings direct row button path — trailing action이 없는 outer/inner settings row를 direct button 경로로 렌더링해 두 rail의 DOM/class 경로를 다시 맞춤

### Improvements

* **web-dms:** 사이드카 폰트 정규화 (text-[10px]/text-[11px] 제거, 타이틀/콘텐츠 위계 정리)
* **web-dms:** 사이드바 폰트 정규화 (Changes/푸터 비표준 크기 제거)
* **web-dms:** 사이드카 문서정보 필드명 개선, 에디터 모드 통계 숨김
* **web-dms:** 요약 textarea 리사이즈 지원

### Bug Fixes

* **web-dms:** DiffTextInput 스크롤 동기화
* **web-dms:** 소프트 삭제 되돌리기 시 아이템 재추가
* **web-dms:** CollapsibleSection 중첩 button 하이드레이션 에러 수정

### Bug Fixes (prior)

* **database:** DBML 문서 출력 경로 수정 - 워크스페이스 외부가 아닌 `docs/` 하위로 정상 출력 ([export-dbml.js](packages/database/scripts/export-dbml.js), [render-dbml.js](packages/database/scripts/render-dbml.js))
* **database:** Prisma extension 공통 컬럼 준비 함수의 `any` 제거로 패턴 경고 해소 ([common-columns.extension.ts](packages/database/src/extensions/common-columns.extension.ts))

---

## 0.0.1 (2026-01-25)


### Bug Fixes

* 사이드바 스크롤 영역을 검색란 아래로 한정 ([ebd82f5](https://github.com/hwista/sooo/commit/ebd82f5ab7be9f5563ca6638721a9d8fe23a0ab9))
* 접힌 사이드바에서 관리자 메뉴 표시 ([6d0a8b9](https://github.com/hwista/sooo/commit/6d0a8b931250e3a0bb14a75af562cbcec87908d9))
* 즐겨찾기 API 404 에러 수정 ([405d713](https://github.com/hwista/sooo/commit/405d713e7a1deda1b2fc35b756b8f023c25960c6))
* 현재 열린 페이지에서 홈 탭 제외 ([bba91bc](https://github.com/hwista/sooo/commit/bba91bc04376df1d027b6aa3354f01e38bff7da8))
* add ls-red-hover for destructive button hover state ([961aba8](https://github.com/hwista/sooo/commit/961aba8049cb80a14c00b1591abafc50f8e2a0bb))
* apply ls-red-hover class to destructive button ([c1a97b1](https://github.com/hwista/sooo/commit/c1a97b189c9c9a1eedaaf937e0767ac7dcf1504d)), closes [#d90027](https://github.com/hwista/sooo/issues/d90027)
* **docs:** 백로그 중복 제거 - docs/BACKLOG.md로 통합 ([6dc1766](https://github.com/hwista/sooo/commit/6dc17667ab092db0acdc65d90ff92b92fcb95bcb))
* **menu:** add pms schema prefix to raw SQL queries ([d96b73d](https://github.com/hwista/sooo/commit/d96b73d8785c1f677cb4f698ad87474621ef28ff))
* **ui:** center loading state vertically on page ([56191f8](https://github.com/hwista/sooo/commit/56191f82efd334ba2dc9ec08e50bbebafe795715))
* **ui:** center page loading spinner in ContentArea ([a5b5694](https://github.com/hwista/sooo/commit/a5b5694eb3ffaab07ee97925f4cf27fa809b74fb))


### Code Refactoring

* **types:** sync type definitions with Prisma schema ([0ca75ec](https://github.com/hwista/sooo/commit/0ca75ecd2293901a9e3ff5c1d7432779322e7037))


### Features

* 사이드바 하단에 카피라이트 영역 추가 ([188c1f7](https://github.com/hwista/sooo/commit/188c1f7befffa40fe69d5530b592d3eb8dffb29f))
* 즐겨찾기 DB 연동 구현 ([8047c9c](https://github.com/hwista/sooo/commit/8047c9c9cef4783c8c863752b6736738aa9d5916))
* 초기 프로젝트 구성 완료 ([15f26f8](https://github.com/hwista/sooo/commit/15f26f83a001d80bbe82affe6827b9c42524e33f))
* 커스텀 스크롤바 디자인 시스템 추가 ([d43cb90](https://github.com/hwista/sooo/commit/d43cb90ba74026821749d405900dfcb259bdec81))
* add Home tab with dashboard placeholder and improve tab styling ([0b7b3bf](https://github.com/hwista/sooo/commit/0b7b3bf1164167eaa5229b6f783a0807eb7f8087)), closes [#9FC1E7](https://github.com/hwista/sooo/issues/9FC1E7) [#003876](https://github.com/hwista/sooo/issues/003876) [#7D8282](https://github.com/hwista/sooo/issues/7D8282)
* add quality gate and security improvements (IMMEDIATE tasks) ([3d811f3](https://github.com/hwista/sooo/commit/3d811f3b76fdd50664bc3a693738f7630c58e431))
* **docs:** add conventional-changelog for hybrid changelog management ([55d4085](https://github.com/hwista/sooo/commit/55d40858f482b9a55756529c6cd15fac3cf3142e))
* **docs:** add Redoc HTML generation for OpenAPI specs ([50e84d0](https://github.com/hwista/sooo/commit/50e84d0d7945e6ae4139ba767f6c47f79fb36d83))
* implement role-based access control (P1-FEATURE) ([a4fe62b](https://github.com/hwista/sooo/commit/a4fe62b1c7c2d046cc7029b3cdb09276cacdd5e7))
* **server:** add JwtAuthGuard to ProjectController ([79b3e6b](https://github.com/hwista/sooo/commit/79b3e6b30ee28b875a80b30dc31ffa6493dd706c))
* **server:** add rate limiting and strengthen password policy ([ca76541](https://github.com/hwista/sooo/commit/ca7654194ee6961e82ffe6fce0e50fe6e427bd36))


### BREAKING CHANGES

* **types:** Type literal values changed to match database schema


## 2026-03-24 - docs: finalize copilot instructions

- Updated .github/copilot-instructions.md and docs; ran verification scripts.
