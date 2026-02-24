# DMS 변경 이력

> 최종 업데이트: 2026-02-24

---

## 2026-02-24

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

- `SettingsPage`를 `DocPageTemplate` 기반으로 재구성하고, 설정 페이지는 `sidecarMode=\"hidden\"`으로 사이드카/토글을 비활성화
- `DocPageTemplate`에 `sidecarMode ('default' | 'custom' | 'hidden')`를 추가해 페이지별 사이드카 렌더링 정책을 명시적으로 제어
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

- 문서 방향(세로/가로) 기준 폭 상수 정의 및 DocPageTemplate 기본 적용
- 마크다운/AI 페이지를 동일한 문서형 컨테이너 패턴으로 정렬
- AI 페이지 공통 셸 컴포넌트 도입
- DocPageTemplate 초기 레이아웃 측정 전 트랜지션 억제
- MarkdownViewerPage 뷰어 툴바의 임베디드 스타일을 이전 패딩 기준으로 복원
- 뷰어 툴바 컨테이너 배경/보더 투명 처리
- 뷰어 모드에서 DocPageTemplate 표면을 투명 처리하고 본문 박스만 유지
- 에디터 툴바 표면을 뷰어와 동일하게 투명 처리
- 마크다운 뷰어 페이지 파일명을 규칙에 맞게 변경 (ViewerPage)
- 에디터 모드에서도 DocPageTemplate 표면을 투명 처리하고 본문 박스만 유지
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

- 문서형 콘텐츠 폭(975px) 규칙과 DocPageTemplate 적용 패턴 추가

## 2026-01-29 (계속)

### 종합 검증 및 분석

#### PMS-DMS 비교 분석 완료
- 분석 문서 작성: `docs/dms/explanation/architecture/pms-dms-comparison-analysis.md`
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
- HOME_TAB path: `/`
- 문서 탭 경로: `/doc/{filePath}`

#### Middleware 추가
- PMS 패턴 적용: 알 수 없는 경로 → `/` 리다이렉트
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
- `ContentArea`, `DocPageTemplate`, `Header` 로딩 UI 통일
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
