# DMS 변경 이력

> 최종 업데이트: 2026-01-28

---

## 2026-01-28 (계속)

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
| `docs/dms/architecture/tech-stack.md` | `development/architecture/` |
| `docs/dms/architecture/package-spec.md` | `development/architecture/` |

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
