# DMS 변경 이력

> 최종 업데이트: 2026-01-28

---

## 2026-01-28 (계속)

### 리팩터링 - Phase 2-G: 컴포넌트 재분류 계획 수립 (진행 중)

**목표**: PMS 레이아웃 구조를 DMS에 적용하여 일관성 확보

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
