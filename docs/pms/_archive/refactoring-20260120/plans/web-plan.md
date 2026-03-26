# Web 리팩터링 계획서

> 대상: `apps/web-pms/`  
> 우선순위: P2-P3  
> 예상 소요: 45분

---

## 🎯 목표

1. 레거시 컴포넌트를 새 표준으로 마이그레이션
2. Export 정리 및 일관성 확보
3. 로컬 타입을 공유 패키지로 이동

---

## 📋 작업 목록

### WEB-01: 레거시 PageHeader 마이그레이션 (P2)

**현재 상태:**
```
components/common/
├── PageHeader.tsx         # 레거시 (LegacyPageHeader로 export)
└── page/
    └── PageHeader.tsx     # 새 표준
```

**마이그레이션 계획:**

1. 레거시 PageHeader 사용처 확인
2. 새 표준 PageHeader로 교체
3. 레거시 파일에 `@deprecated` 추가
4. 점진적 제거 (사용처 0개 되면)

**사용처 확인 방법:**
```bash
# 레거시 PageHeader import 검색
grep -r "LegacyPageHeader\|from.*PageHeader" apps/web-pms/src/
```

**교체 예시:**
```tsx
// Before (레거시)
import { LegacyPageHeader } from '@/components/common';

<LegacyPageHeader
  title="프로젝트 목록"
  breadcrumb={['프로젝트', '목록']}
  actions={[{ label: '등록', onClick: handleCreate }]}
/>

// After (새 표준)
import { PageHeader } from '@/components/common';

<PageHeader
  collapsible
  actions={[
    { label: '등록', icon: <Plus />, onClick: handleCreate },
  ]}
  filters={[
    { key: 'name', type: 'text', placeholder: '프로젝트명' },
  ]}
  onSearch={handleSearch}
/>
```

---

### WEB-02: 레거시 ListPageTemplate 마이그레이션 (P2)

**현재 상태:**
```
components/templates/
├── ListPageTemplate.tsx      # 레거시
└── ListPageTemplateV2.tsx    # 새 표준
```

**Index 현재 상태:**
```typescript
// 새 표준 템플릿 (V2)
export { ListPageTemplate as ListPageTemplateV2 } from './ListPageTemplateV2';

// 기존 템플릿 (레거시)
export { ListPageTemplate } from './ListPageTemplate';
```

**마이그레이션 계획:**

1. ListPageTemplate 사용처 확인
2. ListPageTemplateV2로 교체
3. 교체 완료 후 naming 정리:
   - `ListPageTemplateV2` → `ListPageTemplate`
   - 레거시 `ListPageTemplate` 제거

**교체 예시:**
```tsx
// Before (레거시)
import { ListPageTemplate } from '@/components/templates';

<ListPageTemplate
  header={{
    title: '프로젝트 목록',
    breadcrumb: ['프로젝트', '관리'],
    actions: [{ label: '등록', onClick: handleCreate }],
  }}
  filterFields={filterFields}
  filterValues={filters}
  onFilterChange={handleFilterChange}
  onSearch={handleSearch}
  columns={columns}
  data={data}
  loading={isLoading}
/>

// After (새 표준)
import { ListPageTemplateV2 } from '@/components/templates';

<ListPageTemplateV2
  breadcrumb={['프로젝트', '관리']}
  header={{
    collapsible: true,
    actions: [
      { label: '등록', icon: <Plus />, onClick: handleCreate },
    ],
    filters: filterFields,
    onSearch: handleSearch,
    onReset: handleReset,
  }}
  table={{
    columns,
    data,
    loading: isLoading,
    onRowClick: handleRowClick,
  }}
  pagination={{
    page,
    pageSize,
    total,
    onPageChange: setPage,
    onPageSizeChange: setPageSize,
  }}
/>
```

---

### WEB-03: components/index.ts 정리 (P3)

**현재 상태:**
```typescript
// apps/web-pms/src/components/index.ts

// UI 컴포넌트 - shadcn/ui 기반
export * from './ui';

// 레이아웃 컴포넌트
export * from './layout';

// common 컴포넌트
// export * from './common';  // ← 주석 처리됨

// 템플릿 (추후 활성화)
// export * from './templates'; // ← 주석 처리됨
```

**분석:**
- `common`과 `templates`가 왜 주석 처리되었는지 확인 필요
- 아마도 직접 import 경로 사용 중

**확인 사항:**
```bash
# 실제 import 패턴 확인
grep -r "from '@/components/common'" apps/web-pms/src/
grep -r "from '@/components/templates'" apps/web-pms/src/
grep -r "from '@/components'" apps/web-pms/src/
```

**결정:**
- 직접 경로 import 유지 (트리 쉐이킹 유리)
- 주석은 제거하고 명확한 설명 추가

**수정 내용:**
```typescript
// apps/web-pms/src/components/index.ts

/**
 * 컴포넌트 계층 구조
 * 
 * Level 1 (ui/): shadcn/ui 원자 컴포넌트
 * Level 2 (common/): 재사용 복합 컴포넌트 → 직접 import
 * Level 3 (templates/): 페이지 템플릿 → 직접 import
 * Level 4 (layout/): 레이아웃 컴포넌트
 * 
 * common/과 templates/는 직접 경로로 import하세요:
 * import { DataTable } from '@/components/common';
 * import { ListPageTemplate } from '@/components/templates';
 */

// UI 컴포넌트 - 모든 곳에서 자주 사용
export * from './ui';

// 레이아웃 컴포넌트 - 앱 전역 레이아웃
export * from './layout';
```

---

### WEB-04: 로컬 타입 @ssoo/types로 이동 (P3)

**현재 상태:**
```
apps/web-pms/src/types/
├── index.ts
├── auth.ts
├── menu.ts
├── project.ts
└── common.ts
```

**분석 필요:**
1. `apps/web-pms/src/types/`에 정의된 타입들 확인
2. `@ssoo/types`와 중복 여부 확인
3. 프론트엔드 전용인지, 공유 가능한지 판단

**기준:**
| 타입 종류 | 위치 |
|----------|------|
| API DTO, 엔티티 | `@ssoo/types` |
| 컴포넌트 Props | 컴포넌트 파일 내 |
| 페이지 로컬 상태 | 페이지 파일 내 |
| UI 전용 타입 | `apps/web-pms/src/types/` |

**실행 계획:**
1. 각 타입 파일 분석
2. 공유 가능한 타입 → `@ssoo/types`로 이동
3. UI 전용 타입 → `apps/web-pms/src/types/` 유지
4. 중복 타입 → 제거 및 import 변경

---

## 📝 실행 절차

### Step 1: 준비

```bash
cd apps/web-pms
pnpm exec tsc --noEmit

git add .
git commit -m "chore: checkpoint before web refactoring"
```

### Step 2: 사용처 분석

```bash
# 레거시 컴포넌트 사용처 확인
grep -rn "LegacyPageHeader" apps/web-pms/src/
grep -rn "ListPageTemplate[^V]" apps/web-pms/src/

# Import 패턴 확인
grep -rn "from '@/components'" apps/web-pms/src/ | head -20
```

### Step 3: WEB-01 실행 (점진적)

1. 사용처 목록 작성
2. 각 페이지별 마이그레이션
3. 페이지당 커밋
4. 전체 완료 후 레거시 `@deprecated` 추가

### Step 4: WEB-02 실행 (점진적)

1. 사용처 목록 작성
2. 각 페이지별 마이그레이션
3. 페이지당 커밋
4. 전체 완료 후:
   - `ListPageTemplateV2` → `ListPageTemplate` 이름 변경
   - 레거시 파일 제거

### Step 5: WEB-03 실행

1. `components/index.ts` 주석 정리
2. 명확한 가이드 주석 추가
3. 커밋

### Step 6: WEB-04 실행

1. `apps/web-pms/src/types/` 분석
2. 공유 타입 이동 계획 수립
3. 타입 이동 및 import 수정
4. 커밋

---

## ⚠️ 주의사항

### WEB-01, WEB-02 (컴포넌트 마이그레이션)

- **한 번에 하나의 페이지만 수정**
- Props 구조가 다르므로 주의 깊게 변환
- 마이그레이션 후 UI 동작 확인 필수
- 스타일 차이 발생 시 조정

### WEB-03 (Index 정리)

- 기존 import 경로 깨지지 않도록 주의
- 빌드 테스트 필수

### WEB-04 (타입 이동)

- 순환 의존성 발생하지 않도록 주의
- `@ssoo/types` 변경 시 `pnpm run build` 전체 확인

---

## 📊 마이그레이션 추적 표

### PageHeader 마이그레이션

| 파일 | 상태 | 비고 |
|------|------|------|
| (사용처 분석 후 작성) | | |

### ListPageTemplate 마이그레이션

| 파일 | 상태 | 비고 |
|------|------|------|
| (사용처 분석 후 작성) | | |

---

## ✅ 완료 조건

### WEB-01
- [ ] 레거시 PageHeader 사용처 0개
- [x] 레거시 파일 `@deprecated` 추가 ✅ (2026-01-20)
- [x] 타입 체크 통과
- [x] 빌드 통과

> **상태**: FormPageTemplate, DetailPageTemplate 내부에서만 사용 중 → 추후 개발 시 개선 예정

### WEB-02
- [x] 레거시 ListPageTemplate 사용처 0개 ✅ (이미 완료 상태)
- [x] 레거시 파일 `@deprecated` 추가 ✅ (2026-01-20)
- [ ] V2를 ListPageTemplate으로 이름 변경 (추후)
- [ ] 레거시 파일 제거 (추후)
- [x] 타입 체크 통과
- [x] 빌드 통과

> **상태**: 실제 페이지에서는 ListPageTemplateV2 사용 중, 레거시는 참조용으로 유지

### WEB-03
- [x] components/index.ts 정리 ✅ (2026-01-20)
- [x] 가이드 주석 추가 ✅
- [x] 빌드 통과 ✅

> **상태**: ✅ 완료

### WEB-04
- [x] 타입 분석 완료 ✅ (2026-01-20)
- [x] 공유 타입 이동 완료 (해당 없음 - UI 전용 타입만 존재)
- [x] 중복 타입 제거 (해당 없음)
- [x] 전체 빌드 통과 ✅

> **상태**: ✅ 완료 - `apps/web-pms/src/types/`는 프론트엔드 전용 UI 타입(menu, tab, sidebar, layout)만 존재하여 `@ssoo/types`와 중복 없음
