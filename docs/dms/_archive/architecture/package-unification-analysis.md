# PMS-DMS 패키지 공용화 분석

> **문서 목적**: 장기적 관점에서 PMS와 DMS의 공통 모듈을 모노레포 패키지로 통합하기 위한 분석  
> **작성일**: 2026-01-29  
> **최종 업데이트**: 2026-02-02  
> **상태**: 📋 분석 완료 (DMS Phase 7 리팩터링 반영)  
> **관련 문서**: [PMS-DMS 비교 분석](./pms-dms-comparison-analysis.md) | [통합 리팩터링 계획](./package-integration-plan.md)

---

## 1. 개요

### 1.1 목표
- PMS와 DMS의 공통 컴포넌트/유틸리티를 `packages/` 하위로 추출
- 코드 중복 제거 및 일관성 유지
- 유지보수 효율성 향상

### 1.2 현재 구조
```
sooo/
├── apps/
│   ├── web/pms/          # 프로젝트 관리 시스템
│   └── web/dms/          # 문서 관리 시스템
└── packages/
    ├── database/         # Prisma 스키마 (공용)
    └── types/            # 공용 타입 (현재 미사용)
```

---

## 2. 상세 비교 분석

### 2.1 앱 초기화 흐름

| 영역 | PMS | DMS | 공용화 가능성 |
|------|-----|-----|--------------|
| **인증** | `useAuthStore` + JWT 토큰 | `useUserStore` (로컬 사용자) | ⚠️ 별도 유지 |
| **레이아웃 진입** | 인증 체크 → 로그인 폼 → `AppLayout` | 디바이스 감지 → `AppLayout` | ⚠️ 패턴 유사 |
| **데이터 로드** | `useMenuStore.refreshMenu()` | `useTreeStore.refreshFileTree()` | ⚠️ 인터페이스 통일 가능 |

### 2.2 Store 구조

| Store | PMS | DMS | 차이점 |
|-------|-----|-----|--------|
| **Tab Store** | `menuCode`, `menuId`, `params` 기반 | `id`, `path` 기반 | 🔴 탭 식별 방식 다름 |
| **Layout Store** | `deviceType`, `isMobileMenuOpen` | `deviceType`, `documentType`, `expandedFolders` | 🟡 DMS가 더 많은 상태 |
| **Sidebar Store** | 별도 존재 | 별도 존재 (`sidebar.store.ts`) | ✅ 동일 패턴 |
| **Auth Store** | JWT 기반 인증 | 없음 (로컨/내부용) | 🔴 복잡도 다름 |

#### Tab 타입 비교

```typescript
// PMS TabItem
interface TabItem {
  id: string;
  menuCode: string;      // ✅ PMS 전용
  menuId: string;        // ✅ PMS 전용
  title: string;
  icon?: string;
  path?: string;
  closable: boolean;
  status: TabStatus;     // ✅ PMS 전용
  params?: Record<string, string>;  // ✅ PMS 전용
  data?: unknown;        // ✅ PMS 전용
  openedAt: Date;
  lastActiveAt: Date;
}

// DMS TabItem
interface TabItem {
  id: string;
  title: string;
  path: string;          // ✅ 필수 (PMS는 optional)
  icon?: string;
  closable: boolean;
  openedAt: Date;
  lastActiveAt: Date;
}
```

### 2.3 Layout 컴포넌트 (✅ Phase 3 이후)

| 컴포넌트 | PMS | DMS | 공용화 |
|----------|-----|-----|--------|
| **AppLayout** | `children` prop 사용 | `children` prop 사용 | ✅ 패턴 동일 |
| **ContentArea** | `pageComponents` + `children` fallback | `pageComponents` + Suspense | ✅ 패턴 동일 |
| **MainSidebar** | 펼침/접힘 + 플로팅 | 항상 펼침 | 🟡 의도적 차이 |
| **Header** | 유사 | 유사 | ✅ 공용화 가능 |
| **TabBar** | 유사 | 유사 | ✅ 공용화 가능 |

### 2.4 사이드바 구조

```
PMS MainSidebar/
├── MainSidebar.tsx       # 메인 컨테이너
├── CollapsedSidebar.tsx  # 접힌 상태 (아이콘만)
├── ExpandedSidebar.tsx   # 펼친 상태
├── FloatingPanel.tsx     # hover 플로팅
└── SidebarSection.tsx    # 공통 섹션

DMS sidebar/
├── Sidebar.tsx           # 메인 컨테이너 (Sidebar로 export)
├── Search.tsx            # 검색
├── Bookmarks.tsx         # 책갈피 ✅
├── OpenTabs.tsx          # 열린 탭 ✅
├── FileTree.tsx          # 파일 트리
├── Section.tsx           # 공통 섹션 ✅
└── constants.ts          # 상수
```

### 2.5 API 레이어 (✅ Phase 4 이후)

| 영역 | PMS | DMS | 비고 |
|------|-----|-----|------|
| **HTTP 클라이언트** | `axios` + interceptor | `fetch` 기반 (`lib/api/`) | 🟡 Phase 7 검토 |
| **인증 처리** | 자동 토큰 갱신 | 없음 (의도적) | ✅ 별도 유지 |
| **API 구조** | `lib/api/` 도메인별 분리 | `lib/api/` 도메인별 분리 | ✅ 개선 완료 |
| **서버 통신** | 외부 백엔드 (NestJS) | Next.js API Routes + Server Action | ✅ 의도적 차이 |

---

## 3. 공용화 우선순위

### 3.1 즉시 가능 (⭐⭐⭐)

| 모듈 | 현재 위치 | 추출 대상 |
|------|----------|----------|
| **UI 컴포넌트** | `apps/web/*/src/components/ui/` | `packages/ui/` |
| **레이아웃 상수** | 각 앱 `types/layout.ts` | `packages/layout-core/` |
| **유틸리티 함수** | 각 앱 `lib/utils/` | `packages/utils/` |

### 3.2 단기 (⭐⭐)

| 모듈 | 작업 내용 |
|------|----------|
| **TabBar** | 제네릭 타입으로 추상화 |
| **Header** | 슬롯 패턴으로 확장 가능하게 |
| **SidebarSection** | 공통 섹션 컴포넌트 |

### 3.3 장기 (⭐)

| 모듈 | 작업 내용 |
|------|----------|
| **Tab Store Factory** | 제네릭 스토어 팩토리 함수 |
| **Layout Store Factory** | 확장 가능한 레이아웃 스토어 |

### 3.4 별도 유지 권장 (🔴)

| 모듈 | 이유 |
|------|------|
| **Auth Store** | 도메인 특화, 복잡도 차이 |
| **Menu/Tree Store** | 데이터 구조 근본적 차이 |
| **API 레이어** | 서버 통신 방식 다름 |

---

## 4. 권장 패키지 구조

```
packages/
├── ui/                    # ✅ 1차 공용화
│   ├── button/
│   ├── input/
│   ├── card/
│   ├── scroll-area/
│   ├── dropdown/
│   └── index.ts
│
├── layout-core/           # ⭐⭐ 2차 공용화
│   ├── constants.ts       # LAYOUT_SIZES, BREAKPOINTS
│   ├── types.ts           # DeviceType, 공통 타입
│   ├── TabBar/            # 제네릭 탭바
│   ├── Header/            # 기본 헤더 (슬롯 패턴)
│   └── SidebarSection/    # 공통 섹션
│
├── store-utils/           # ⭐ 3차 공용화
│   ├── createTabStore.ts
│   └── createLayoutStore.ts
│
├── database/              # 기존 유지
└── types/                 # 기존 유지 (공용 타입 추가)
```

---

## 5. 구현 로드맵

> **전제 조건**: DMS Phase 6~7 완료 후 진행 권장

### Phase A: UI 패키지 추출 (우선순위 높음)
- [ ] `packages/ui/` 생성
- [ ] 공통 UI 컴포넌트 이동 (shadcn/ui 기반)
- [ ] 각 앱에서 import 경로 변경
- [ ] 스토리북 설정 (선택)

### Phase B: 레이아웃 코어 추출
- [ ] `packages/layout-core/` 생성
- [ ] 상수, 타입 이동 (`LAYOUT_SIZES`, `DeviceType` 등)
- [ ] TabBar, Header 추상화 (제네릭 + 슬롯 패턴)
- [ ] 각 앱에서 확장 사용

### Phase C: 스토어 유틸리티
- [ ] 제네릭 스토어 팩토리 설계 (`createTabStore`, `createLayoutStore`)
- [ ] 구현 및 테스트
- [ ] 각 앱 마이그레이션

---

## 6. 주의사항

### 6.1 공용화 시 고려사항
1. **버전 관리**: 패키지 변경 시 앱 호환성 확인
2. **의존성**: 순환 참조 방지
3. **빌드**: 모노레포 빌드 순서 설정
4. **테스트**: 공용 패키지 단위 테스트

### 6.2 피해야 할 것
- 과도한 추상화로 인한 복잡성 증가
- 앱 특화 로직의 무리한 공용화
- 성급한 마이그레이션

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-01-29 | 초안 작성 - PMS/DMS 비교 분석 완료 |
| 2026-01-29 | DMS Phase 5 완료 반영 - Layout/API 비교 업데이트 |

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |
