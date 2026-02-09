# 페이지 레이아웃 설계

> 표준 페이지 템플릿별 레이아웃 상세 설계

**최종 업데이트:** 2026-02-02  
**버전:** 1.2

---

## 📋 목차

0. [메인 레이아웃 구조](#0-메인-레이아웃-구조)
1. [목록 페이지 (ListPageTemplate)](#1-목록-페이지-listpagetemplate)
2. [등록/수정 페이지 (FormPageTemplate)](#2-등록수정-페이지-formpagetemplate)

---

## 0. 메인 레이아웃 구조

### 전체 레이아웃 다이어그램

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              메인 헤더 (60px, #003876)                            │
│  [🔍 통합 검색... (준비 중)          ]              [+ 새 프로젝트] [🔔] [👤 ▼]  │
├─────────────────┬────────────────────────────────────────────────────────────────┤
│   사이드바 헤더  │                        탭바 (53px, gray-50)                    │
│  (60px, #003876)│    [📄 대시보드 ×] [📄 고객요청 ×] [📄 프로젝트 ×]             │
│  [S] SSOO   [≡] │                                                                │
├─────────────────┼────────────────────────────────────────────────────────────────┤
│                 │                                                                │
│   검색 영역     │                                                                │
│  [🔍 메뉴검색]  │                                                                │
├─────────────────┤                     컨텐츠 영역                                 │
│                 │                                                                │
│  ▼ 즐겨찾기     │                    (페이지 템플릿)                              │
│    - 대시보드   │                                                                │
│    - 고객요청   │                                                                │
├─────────────────┤                                                                │
│                 │                                                                │
│  ▼ 열린 탭     │                                                                │
│    - 프로젝트   │                                                                │
├─────────────────┤                                                                │
│                 │                                                                │
│  ▼ 메뉴        │                                                                │
│    📁 요청      │                                                                │
│      - 고객요청 │                                                                │
│    📁 프로젝트  │                                                                │
│                 │                                                                │
└─────────────────┴────────────────────────────────────────────────────────────────┘
```

### 레이아웃 크기 정의

| 영역 | 크기 | 색상 | 비고 |
|------|------|------|------|
| **메인 헤더** | 60px | `#003876` | 통합 검색 + 액션 버튼 |
| **사이드바 헤더** | 60px | `#003876` | 로고 + 접기 버튼 |
| **사이드바 (펼침)** | 340px | `#DEE7F1` | 검색, 즐겨찾기, 열린탭, 메뉴 |
| **사이드바 (접힘)** | 56px | `#DEE7F1` | 아이콘만 표시 |
| **탭바** | 53px | `gray-50` | MDI 탭 영역, 사이드바 검색과 수평 정렬 |
| **컨트롤 높이** | 36px | - | 버튼, 입력, 탭, 메뉴 항목 |

### 색상 체계

| 요소 | 색상 | HEX |
|------|------|-----|
| 헤더 배경 | Primary | `#003876` |
| 사이드바 배경 | Content Background | `#DEE7F1` |
| 사이드바 우측 보더 | Content Border | `#9FC1E7` |
| 내부 구분선 | Gray | `gray-200` |
| 선택 상태 | Content Border | `#9FC1E7` |
| Hover 배경 | Sitemap Background | `#F6FBFF` |

---

## 1. 페이지 구조 표준 (Page Structure Standard)

> 모든 페이지는 이 구조를 따릅니다. 개발자는 옵션을 선택하여 일관된 패턴으로 개발합니다.

### 1.1 전체 페이지 구조

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🏠 > 요청 > 고객요청 관리                                                    │ ← Breadcrumb
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ [+ 등록] [📥 엑셀] [🗑 삭제]     [▼ 접기/펼치기]                         │ │ ← ActionBar (좌측 정렬)
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ [프로젝트명    ] [상태 ▼] [고객사 ▼] [기간: 시작 ~ 종료]  [🔍] [↺]     │ │ ← FilterBar (옵션)
│ └─────────────────────────────────────────────────────────────────────────┘ │ ← PageHeader (접기/펼치기)
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                                                                         │ │
│ │                         PageContent (고정 크기)                          │ │
│ │                                                                         │ │
│ │   ┌───────────────────────────────────────────────────────────────┐    │ │
│ │   │                      DataGrid (그리드 1)                       │    │ │
│ │   │  ┌─────────────────────────────────────────────────────────┐  │    │ │
│ │   │  │                    DataTable                            │  │    │ │
│ │   │  │  □ │ 프로젝트명   │ 고객사 │ 단계  │ 등록일 │ ⋮        │  │    │ │
│ │   │  │  □ │ A 고객 요청  │ A사    │ 🟡    │ 01-19 │ ⋮        │  │    │ │
│ │   │  │  □ │ B 시스템 구축 │ B사    │ 🔵    │ 01-18 │ ⋮        │  │    │ │
│ │   │  └─────────────────────────────────────────────────────────┘  │    │ │
│ │   │  ┌─────────────────────────────────────────────────────────┐  │    │ │
│ │   │  │ [10▼]개  1-10/45              [<<] [<] 1/5 [>] [>>]     │  │    │ │
│ │   │  └─────────────────────────────────────────────────────────┘  │    │ │
│ │   └───────────────────────────────────────────────────────────────┘    │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 컴포넌트 계층 구조

```
Page
├── Breadcrumb                    # 경로 표시
├── PageHeader                    # 접기/펼치기 가능
│   ├── ActionBar                 # 액션 버튼 (좌측 정렬)
│   └── FilterBar (옵션)          # 검색 필터
└── PageContent                   # 고정 크기, 컨텐츠 영역
    └── DataGrid (1개 또는 N개)   # 그리드 단위
        ├── DataTable / Chart / Custom
        └── Pagination (DataTable인 경우)
```

### 1.3 PageHeader 상세

> 페이지 헤더는 **액션 버튼 + 검색 필터**로 구성되며, 접기/펼치기 가능

| 요소 | 설명 | 필수 |
|------|------|------|
| **ActionBar** | 등록, 삭제, 엑셀 다운로드 등 버튼 (좌측 정렬) | ✅ |
| **FilterBar** | 검색 조건 입력 필드 | ❌ (옵션) |
| **CollapseToggle** | 헤더 접기/펼치기 버튼 | ✅ |

- **컨테이너 높이/패딩**: ActionBar/FilterBar 영역은 `min-h-[52px] px-4 py-2` 기준 (컨트롤 36px 기준).

```tsx
// PageHeader 예시
<PageHeader
  actions={[
    { label: '등록', icon: <Plus />, variant: 'default', onClick: handleCreate },
    { label: '엑셀', icon: <Download />, variant: 'outline', onClick: handleExport },
    { label: '삭제', icon: <Trash />, variant: 'destructive', onClick: handleDelete, disabled: !hasSelection },
  ]}
  filters={[
    { key: 'name', type: 'text', placeholder: '프로젝트명' },
    { key: 'status', type: 'select', options: statusOptions },
    { key: 'period', type: 'dateRange' },
  ]}
  onSearch={handleSearch}
  onReset={handleReset}
  collapsible={true}
  defaultCollapsed={false}
/>
```

### 1.4 PageContent 상세

> 페이지 컨텐츠는 **표준 해상도에 맞는 고정 크기**이며, 내부에 그리드를 배치

| 속성 | 설명 |
|------|------|
| **고정 크기** | 표준 해상도 기준 (예: 1920x1080에서 컨텐츠 영역) |
| **그리드 배치** | 1개면 꽉 채움, 2개면 비율 또는 스크롤 |
| **배치 방향** | `vertical` (상하) 또는 `horizontal` (좌우) |

```tsx
// PageContent 예시 - 그리드 1개
<PageContent>
  <DataGrid>
    <DataTable columns={columns} data={data} />
    <Pagination {...paginationProps} />
  </DataGrid>
</PageContent>

// PageContent 예시 - 그리드 2개 (상하)
<PageContent layout="vertical" ratio={[60, 40]}>
  <DataGrid>
    <DataTable columns={columns} data={data} />
    <Pagination {...paginationProps} />
  </DataGrid>
  <DataGrid>
    <Chart type="bar" data={chartData} />
  </DataGrid>
</PageContent>

// PageContent 예시 - 그리드 2개 (좌우)
<PageContent layout="horizontal" ratio={[50, 50]}>
  <DataGrid scrollable>
    <DataTable columns={leftColumns} data={leftData} />
    <Pagination {...leftPaginationProps} />
  </DataGrid>
  <DataGrid scrollable>
    <DataTable columns={rightColumns} data={rightData} />
    <Pagination {...rightPaginationProps} />
  </DataGrid>
</PageContent>
```

### 1.5 DataGrid 상세

> DataTable + Pagination을 하나의 단위로 묶음

| 요소 | 설명 | 필수 |
|------|------|------|
| **DataTable** | 데이터 테이블 | ❌ (Table/Chart/Custom 중 선택) |
| **Chart** | 차트 | ❌ |
| **Custom** | 커스텀 컴포넌트 | ❌ |
| **Pagination** | 페이지네이션 | ❌ (DataTable인 경우 필수) |

- **Pagination 컨테이너**: `min-h-[52px] px-4 py-2` 기준 (컨트롤 36px 기준).

```tsx
// DataGrid Props
interface DataGridProps {
  children: React.ReactNode;
  scrollable?: boolean;      // 내부 스크롤 여부
  minHeight?: string;        // 최소 높이
  maxHeight?: string;        // 최대 높이
}
```

---

## 2. 레이아웃 변형 패턴 (Layout Variations)

### 2.1 단일 그리드 (기본)

> 가장 일반적인 목록 페이지

```
┌─────────────────────────────────────────┐
│ PageHeader (접기/펼치기)                 │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │           DataGrid (100%)           │ │
│ │  ┌───────────────────────────────┐  │ │
│ │  │         DataTable             │  │ │
│ │  └───────────────────────────────┘  │ │
│ │  ┌───────────────────────────────┐  │ │
│ │  │         Pagination            │  │ │
│ │  └───────────────────────────────┘  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 2.2 상하 2그리드 (Vertical Split)

> 마스터-디테일, 테이블+차트 등

```
┌─────────────────────────────────────────┐
│ PageHeader                              │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │      DataGrid 1 (60% or scroll)     │ │
│ │  DataTable + Pagination             │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │      DataGrid 2 (40% or scroll)     │ │
│ │  Chart / Detail / Table             │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 2.3 좌우 2그리드 (Horizontal Split)

> 비교 화면, 이동/복사 UI 등

```
┌─────────────────────────────────────────┐
│ PageHeader                              │
├─────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ │
│ │  DataGrid 1     │ │  DataGrid 2     │ │
│ │  (50% or scroll)│ │  (50% or scroll)│ │
│ │                 │ │                 │ │
│ │  Table + Pagi   │ │  Table + Pagi   │ │
│ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────┘
```

### 2.4 테이블 + 차트 (Dashboard Style)

```
┌─────────────────────────────────────────┐
│ PageHeader                              │
├─────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ │
│ │  DataGrid       │ │  DataGrid       │ │
│ │  (Table+Pagi)   │ │  (Chart)        │ │
│ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 3. 목록 페이지 (ListPageTemplate)

### 3.1 레이아웃 구조 (새 표준)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🏠 > 요청 > 고객요청 관리                                                    │ ← Breadcrumb
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ [+ 등록] [📥 엑셀] [🗑 삭제]                                 [▼ 접기]   │ │ ← ActionBar
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ [프로젝트명    ] [상태 ▼] [고객사 ▼] [기간: 시작~종료]    [🔍] [↺]    │ │ ← FilterBar
│ └─────────────────────────────────────────────────────────────────────────┘ │ ← PageHeader
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ □ │ 프로젝트명 ↕  │ 고객사   │ 단계     │ 등록일   │ ⋮            │ │ │
│ │ ├───┼───────────────┼──────────┼──────────┼──────────┼──────────────┤ │ │ ← DataTable
│ │ │ □ │ A 고객 요청    │ A사      │ 🟡 대기   │ 01-19   │ ⋮            │ │ │
│ │ │ □ │ B 시스템 구축  │ B사      │ 🔵 진행   │ 01-18   │ ⋮            │ │ │
│ │ │ □ │ C 유지보수     │ C사      │ 🟢 완료   │ 01-17   │ ⋮            │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │  [10▼]개  1-10 / 총 45개                   [<<] [<] 1/5 [>] [>>]   │ │ │ ← Pagination
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │ ← DataGrid (PageContent)
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 컴포넌트 구성 (새 표준)

| 영역 | 컴포넌트 | Props | 설명 |
|------|----------|-------|------|
| 경로 | Breadcrumb | items | 페이지 경로 표시 |
| 헤더 | PageHeader | actions, filters, collapsible | **접기/펼치기 가능** |
| ↳ 액션 | ActionBar | actions | 버튼 (좌측 정렬) |
| ↳ 필터 | FilterBar | filters, onSearch, onReset | 검색 조건 (옵션) |
| 컨텐츠 | PageContent | layout, ratio | **고정 크기 영역** |
| ↳ 그리드 | DataGrid | scrollable | DataTable + Pagination 묶음 |

### 3.3 테이블 컬럼 정의

#### 고객요청 목록 예시

| 컬럼 | accessorKey | 타입 | 너비 | 정렬 | 기능 |
|------|-------------|------|------|------|------|
| 선택 | - | checkbox | 40px | ❌ | 다중 선택 (enableRowSelection) |
| 프로젝트명 | projectName | text | flex | ✅ | 클릭 시 상세 이동, 정렬 가능 |
| 고객사 | customerId | text | 120px | ✅ | 고객사명 표시 |
| 단계 | stageCode | badge | 80px | ✅ | 대기/진행/완료 (색상 구분) |
| 등록일 | createdAt | date | 100px | ✅ | YYYY-MM-DD 형식 |
| 작업 | - | actions | 60px | ❌ | 수정/삭제 드롭다운 메뉴 |

**Badge 색상 규칙:**
- 🟡 대기 (waiting): `bg-yellow-100 text-yellow-800`
- 🔵 진행 (in_progress): `bg-blue-100 text-blue-800`
- 🟢 완료 (done): `bg-green-100 text-green-800`

### 3.4 검색 필터 정의

#### 고객요청 목록 필터

| 필드 | key | 타입 | 너비 | placeholder | options |
|------|-----|------|------|-------------|---------|
| 프로젝트명 | projectName | text | 200px | 프로젝트명 입력 | - |
| 상태 | stageCode | select | 150px | 전체 | 대기/진행/완료 |
| 고객사 | customerId | select | 200px | 전체 | 고객사 목록 (API) |

**Enter 키 동작:** 프로젝트명 입력 필드에서 Enter 시 자동 검색

### 3.5 코드 예시 (새 표준)

```tsx
<ListPageTemplate
  breadcrumb={['요청', '고객요청 관리']}
  header={{
    collapsible: true,
    defaultCollapsed: false,
    actions: [
      { label: '등록', icon: <Plus />, variant: 'default', onClick: handleCreate },
      { label: '엑셀', icon: <Download />, variant: 'outline', onClick: handleExport },
      { label: '삭제', icon: <Trash />, variant: 'destructive', onClick: handleDelete, disabled: !hasSelection },
    ],
    filters: [
      { key: 'projectName', type: 'text', placeholder: '프로젝트명' },
      { key: 'stageCode', type: 'select', placeholder: '상태', options: stageOptions },
      { key: 'customerId', type: 'select', placeholder: '고객사', options: customerOptions },
    ],
    onSearch: handleSearch,
    onReset: handleReset,
  }}
  content={{
    layout: 'single',  // 'single' | 'vertical' | 'horizontal'
  }}
>
  <DataGrid>
    <DataTable
      columns={columns}
      data={data}
      loading={isLoading}
      onRowClick={handleRowClick}
      selectable
      onSelectionChange={setSelectedRows}
    />
    <Pagination
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
    />
  </DataGrid>
</ListPageTemplate>
```

---

## 4. 등록/수정 페이지 (FormPageTemplate)

### 4.1 레이아웃 구조 (새 표준)

> 등록/수정 페이지도 PageHeader를 사용하되, 검색필터 대신 액션 버튼만 배치

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🏠 > 요청 > 고객요청 관리 > 등록                                             │ ← Breadcrumb
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ [← 목록] [💾 저장] [취소]                                                │ │ ← ActionBar
│ └─────────────────────────────────────────────────────────────────────────┘ │ ← PageHeader
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ▌기본 정보 ─────────────────────────────────────────────────────────── │ │
│ │                                                                         │ │
│ │  프로젝트명 *                                                           │ │
│ │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│ │  │                                                                 │   │ │
│ │  └─────────────────────────────────────────────────────────────────┘   │ │
│ │  프로젝트명은 2자 이상이어야 합니다 (힌트/에러)                          │ │
│ │                                                                         │ │
│ │  고객사                                                                 │ │
│ │  ┌──────────────────────────────┐                                      │ │
│ │  │ 선택                       ▼ │                                      │ │
│ │  └──────────────────────────────┘                                      │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ ▌상세 정보 ─────────────────────────────────────────────────────────── │ │
│ │                                                                         │ │
│ │  요청 내용                                                              │ │
│ │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│ │  │                                                                 │   │ │
│ │  │                                                                 │   │ │
│ │  └─────────────────────────────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │ ← PageContent (FormSections)
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 컴포넌트 구성

| 영역 | 컴포넌트 | Props | 설명 |
|------|----------|-------|------|
| 경로 | Breadcrumb | items | 페이지 경로 표시 |
| 헤더 | PageHeader | actions | 액션 버튼 (저장, 취소, 목록) |
| 컨텐츠 | PageContent | - | 폼 섹션 래퍼 |
| 폼 | FormSection[] | title, children | 섹션별 필드 그룹화 |
| 필드 | FormField | label, required, error, hint | 라벨 + 입력 + 에러/힌트 |

### 4.3 폼 섹션 정의

#### 고객요청 등록/수정 예시

| 섹션 | 필드명 | 컴포넌트 | 필수 | 유효성 검증 | 힌트 |
|------|--------|----------|------|-------------|------|
| **기본 정보** | 프로젝트명 | Input | ✅ | 2자 이상 | - |
|  | 고객사 | Select | ❌ | - | 향후 필수로 변경 |
| **상세 정보** | 요청 내용 | Textarea | ❌ | - | 고객 요청 상세 내용 입력 |

**유효성 검증 규칙 (Zod):**
```typescript
const createRequestSchema = z.object({
  projectName: z.string()
    .min(2, '프로젝트명은 2자 이상이어야 합니다')
    .max(100, '프로젝트명은 100자 이하여야 합니다'),
  customerId: z.string().optional(),
  description: z.string().optional()
});
```

### 4.4 액션 버튼 (새 표준)

> 액션 버튼은 PageHeader의 ActionBar에 좌측 정렬로 배치

| 버튼 | variant | 동작 |
|------|---------|------|
| ← 목록 | outline | 목록으로 돌아가기 |
| 저장 | default | 유효성 검증 → API 호출 → 목록 이동 |
| 취소 | secondary | 변경 취소 (변경 사항 경고) |
| 삭제 | destructive | 수정 페이지에만 표시, 확인 다이얼로그 |

**로딩 상태:**
- 저장 버튼 클릭 시 스피너 표시 + 버튼 비활성화
- 폼 전체 비활성화 (중복 제출 방지)

### 4.5 코드 예시 (새 표준)

```tsx
<FormPageTemplate
  breadcrumb={['요청', '고객요청 관리', '등록']}
  header={{
    actions: [
      { label: '목록', icon: <ArrowLeft />, variant: 'outline', onClick: handleGoBack },
      { label: '저장', icon: <Save />, variant: 'default', onClick: handleSubmit(onSubmit), loading: isSubmitting },
      { label: '취소', variant: 'secondary', onClick: handleCancel },
    ],
  }}
>
  <PageContent>
    <FormSection title="기본 정보">
      <FormField label="프로젝트명" required error={errors.projectName}>
        <Input {...register('projectName')} />
      </FormField>
      <FormField label="고객사">
        <Select {...register('customerId')}>
          <SelectTrigger>
            <SelectValue placeholder="선택" />
          </SelectTrigger>
          <SelectContent>
            {customers.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    </FormSection>
    
    <FormSection title="상세 정보">
      <FormField label="요청 내용" hint="고객 요청 상세 내용 입력">
        <Textarea {...register('description')} rows={5} />
      </FormField>
    </FormSection>
  </PageContent>
</FormPageTemplate>
```

---

## 5. 컴포넌트 Props 정의

> **Note**: `DetailPageTemplate`은 2026-01-30에 삭제되었습니다. 상세 페이지는 `FormPageTemplate`을 읽기 전용으로 사용합니다.

### 5.1 PageHeader

```typescript
interface PageHeaderProps {
  /** 접기/펼치기 가능 여부 */
  collapsible?: boolean;
  /** 기본 접힘 상태 */
  defaultCollapsed?: boolean;
  /** 액션 버튼 목록 */
  actions: ActionItem[];
  /** 검색 필터 (옵션) */
  filters?: FilterField[];
  /** 검색 실행 */
  onSearch?: (values: Record<string, any>) => void;
  /** 검색 초기화 */
  onReset?: () => void;
}

interface ActionItem {
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost';
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

interface FilterField {
  key: string;
  type: 'text' | 'select' | 'date' | 'dateRange';
  placeholder?: string;
  options?: { label: string; value: string }[];
  width?: string;
}
```

### 6.2 PageContent

```typescript
interface PageContentProps {
  /** 레이아웃 타입 */
  layout?: 'single' | 'vertical' | 'horizontal';
  /** 그리드 비율 (2개일 때) */
  ratio?: [number, number];
  /** 자식 컴포넌트 */
  children: React.ReactNode;
}
```

### 6.3 DataGrid

```typescript
interface DataGridProps {
  /** 내부 스크롤 여부 */
  scrollable?: boolean;
  /** 최소 높이 */
  minHeight?: string;
  /** 최대 높이 */
  maxHeight?: string;
  /** 자식 컴포넌트 (DataTable + Pagination) */
  children: React.ReactNode;
}
```

---

## 📝 페이지별 적용 현황

| 페이지 | 경로 | 템플릿 | 상태 | 비고 |
|--------|------|--------|------|------|
| 고객요청 목록 | /request | ListPageTemplate | 🔲 예정 | 새 표준 적용 |
| 고객요청 등록 | /request/create | FormPageTemplate | 🔲 예정 | 새 표준 적용 |
| 고객요청 상세 | /request/:id | FormPageTemplate (읽기전용) | 🔲 예정 | 탭 경로 기준 |

---

## 🎨 공통 스타일 가이드

### 간격 시스템
- 페이지 상단: `space-y-4`
- 섹션 내부: `space-y-4`
- 필드 간: `gap-4`
- 카드 패딩: `p-4`

### 색상 규칙
- Primary: `bg-[#003876]` (주요 액션)
- Secondary: `bg-[#235a98]` (보조 액션)
- Outline: `border-[#9FC1E7] bg-white` (덜 중요한 액션)
- Destructive: `bg-red-600` (삭제)

### 타이포그래피
- 섹션 제목: `text-base font-semibold`
- 필드 라벨: `text-sm font-medium text-gray-600`
- 설명: `text-sm text-muted-foreground`

---

## 🔄 업데이트 로그

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-19 | 1.0 | 초기 문서 작성 (목록/폼/상세 페이지) |
| 2026-01-19 | 2.0 | **새 표준 적용**: PageHeader(액션+필터, 접기/펼치기), PageContent(고정 크기), DataGrid(테이블+페이지네이션 묶음), 레이아웃 변형 패턴 추가 |

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

