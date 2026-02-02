# DMS 에이전트 가이드 (AGENTS)

> 최종 업데이트: 2026-02-02  
> 범위: DMS 프로젝트 (`apps/web/dms/`) 전용

---

## 이 문서의 목적

새로운 에이전트(AI 또는 개발자)가 DMS 작업을 시작할 때 **반드시 먼저 읽어야 하는 가이드**입니다.

이 문서는:
- DMS 프로젝트의 **핵심 원칙과 그 이유**를 설명합니다
- **코드 패턴 표준**과 왜 그 패턴을 따라야 하는지 설명합니다
- 작업 전 **확인해야 할 체크리스트**를 제공합니다

---

## ⚠️ AI 에이전트 작업 원칙

### 역할 분담
| 단계 | AI | 사람 |
|------|-----|------|
| **점검/분석** | ✅ 수행 | 결과 확인 |
| **브리핑/제안** | ✅ 수행 | 검토 |
| **삭제/변경 결정** | ✅ 판단 제시 | 🔒 **최종 승인** |
| **실행** | ⏸️ 승인 대기 | 🔒 **컨펌 후 지시** |

### 점검 기준 (러프하게 넘어가지 말 것)
1. **"수정 필요없음"으로 넘어가지 말 것** - 변경 소지가 있으면 반드시 명시
2. **모든 발견 사항에 증거 포함** - 파일 경로, 라인 번호, grep 결과
3. **영향 범위 명시** - 수정 시 영향받는 다른 파일 목록

---

## 🔴 DMS 핵심 원칙

### 1. DMS 독립성 (절대 원칙)

> **DMS는 독립 프로젝트입니다. 외부 의존성 없이 단독 실행 가능해야 합니다.**

| 규칙 | 이유 |
|------|------|
| **npm 사용** (`package-lock.json` 유지) | DMS는 별도 저장소로 분리 운영될 수 있음 |
| **외부 workspace 패키지 사용 금지** | 독립 clone 후 즉시 실행 가능해야 함 |
| **타입/유틸 자체 정의** | 외부 의존 없이 자체 완결 |

### 2. 코드 클렌징 원칙

> **바이브 코딩으로 생긴 통제 불가 코드를 정리하고, 설계 안에서 컴팩트한 구현에 집중**

| 원칙 | 이유 |
|------|------|
| **사용되는 코드만 유지** | 미사용 코드는 유지보수 부담, 혼란 유발 |
| **불필요한 추상화 제거** | 과도한 레이어는 복잡도만 증가 |
| **미래 기능용 선제작 금지** | 필요할 때 만드는 것이 더 효율적 |
| **일관된 패턴 유지** | 동일한 문제는 동일한 방식으로 해결 |

### 3. 문서-코드 동기화

> **문서에 없으면 코드도 없어야 함, 코드에 없으면 문서도 없어야 함**

| 규칙 | 이유 |
|------|------|
| **코드 변경 → 문서 업데이트 → 커밋** | 문서 부채 방지 |
| **Backlog/Changelog 섹션 유지** | 변경 이력 추적 |

---

## 📜 작업 표준 프로세스 (필수 준수)

### 1. 변경 작업 흐름

```
코드 변경 → 문서 업데이트 → 빌드 검증 → 커밋
```

| 단계 | 내용 |
|------|------|
| **1. 코드 변경** | 패턴 표준 준수, 영향 범위 파악 |
| **2. 문서 업데이트** | 관련 문서의 Backlog/Changelog 갱신 |
| **3. 빌드 검증** | `npm run build` 성공 확인 |
| **4. 커밋** | 변경 내용과 문서를 함께 커밋 |

### 2. 삭제/수정 작업 흐름

```
분석 → 브리핑 → 승인 대기 → 실행 → 검증 → 기록
```

| 단계 | 내용 |
|------|------|
| **1. 분석** | grep 검색으로 사용처 확인, 영향 범위 파악 |
| **2. 브리핑** | 대상, 사유, 영향 파일 목록 보고 |
| **3. 승인 대기** | 🔒 **사용자 컨펌 필수** |
| **4. 실행** | 승인 후 변경 수행 |
| **5. 검증** | 빌드/런타임 테스트 |
| **6. 기록** | Changelog에 변경 내역 기록 |

---

## 🏗️ 개발 표준 (필수 준수)

### 1. 레이어 아키텍처 & 의존성 방향

```
pages → templates → common → ui
  ↓
hooks → lib/api → stores
```

**의존성 규칙**:
- 상위 레이어는 하위 레이어만 참조
- 역방향 참조 금지 (ui → pages ❌)
- 순환 참조 금지

### 2. 폴더 구조 표준

```
src/
├── app/                    # Next.js App Router
│   ├── (main)/            # 메인 레이아웃 그룹
│   ├── api/               # API Routes
│   └── layout.tsx
├── components/
│   ├── ui/                # 기본 UI (Button, Input 등)
│   ├── common/            # 공통 컴포넌트 (Header, Sidebar 등)
│   ├── templates/         # 페이지 템플릿
│   └── pages/             # 페이지별 컴포넌트
├── hooks/                 # 커스텀 훅
├── lib/                   # 유틸리티, API 클라이언트
├── stores/                # Zustand 스토어
└── types/                 # 타입 정의
```

### 3. 컴포넌트 크기 가이드

| 유형 | 권장 라인 | 초과 시 조치 |
|------|----------|-------------|
| UI 컴포넌트 | ~50줄 | 분리 검토 |
| Common 컴포넌트 | ~150줄 | 책임 분리 |
| Template | ~200줄 | 하위 컴포넌트 추출 |
| Page | ~150줄 | 로직을 훅/스토어로 이동 |

### 4. 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| **컴포넌트** | PascalCase | `FileTree.tsx`, `MarkdownViewer.tsx` |
| **훅** | camelCase, use 접두사 | `useFileStore.ts`, `useMarkdown.ts` |
| **유틸** | camelCase | `formatDate.ts`, `cn.ts` |
| **타입** | PascalCase | `FileNode`, `TabItem` |
| **상수** | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE` |

### 5. Export 규칙

```typescript
// ✅ 명시적 re-export
export { Button } from './Button';
export { Input } from './Input';

// ❌ 와일드카드 export 금지
export * from './components';
```

**이유**: 와일드카드는 의도치 않은 export, 번들 크기 증가, 순환 참조 위험

---

## 🔧 서버 레이어 표준 (server/)

### 폴더 구조

```
server/
├── handlers/              # API Route 핸들러
│   ├── file.handler.ts
│   └── files.handler.ts
└── services/              # 비즈니스 로직
    └── fileSystem/
        └── FileSystemService.ts
```

### Handler 패턴

```typescript
// ✅ 표준: 단순 라우팅, 로직은 서비스로 위임
export async function GET(request: NextRequest) {
  const result = await fileSystemService.getFileTree();
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result.data);
}
```

### Service 패턴

```typescript
// ✅ 표준: BaseService 상속 없이 단순 구조
class FileSystemService {
  async getFileTree(): Promise<ServiceResult<FileNode[]>> {
    // 실제 로직만 구현
  }
}

export const fileSystemService = new FileSystemService();
```

**왜 이 패턴인가?**
- 불필요한 추상화 제거 → 코드 이해 용이
- 싱글톤 export → 인스턴스 관리 단순화
- 실제 사용 메서드만 → Dead Code 방지

---

## 📋 코드 패턴 표준

### 미들웨어 (`middleware.ts`)

```typescript
// ✅ 표준 패턴
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  const allowedPaths = ['/'];
  if (allowedPaths.some((path) => pathname === path)) {
    return NextResponse.next();
  }
  
  return NextResponse.redirect(new URL('/', request.url));
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*|favicon.ico).*)'],
};
```

**왜 이 패턴인가?**
- `export function` (named export) → 일관성
- `matcher` 설정으로 정적 파일/API 필터링 → 불필요한 미들웨어 호출 방지
- 함수 내부 필터링 최소화 → 코드 단순화

### 스토어 (Zustand)

```typescript
// ✅ 표준 패턴
interface TabStore extends TabStoreState, TabStoreActions {}

const useTabStore = create<TabStore>()(
  persist(
    (set, get) => ({
      // 상태
      tabs: [],
      activeTabId: null,
      
      // 액션
      openTab: (options) => { ... },
      closeTab: (id) => { ... },
    }),
    { name: 'tab-store', storage: createJSONStorage(() => localStorage) }
  )
);
```

**왜 이 패턴인가?**
- 타입 인터페이스 분리 (State/Actions) → 타입 안전성
- persist 미들웨어 → 상태 유지
- 타입에 정의된 필드만 사용 → 구현-타입 일치

### 타입 정의

```typescript
// ✅ 표준: 인터페이스와 구현 일치
export interface TabItem {
  id: string;
  title: string;
  closable: boolean;
  openedAt: Date;
}

// 구현 시 타입에 없는 필드 추가 금지
const createTab = (): TabItem => ({
  id: '...',
  title: '...',
  closable: true,
  openedAt: new Date(),
  // ❌ status: 'active' → 타입에 없음
});
```

---

## 🔍 Dead Code 삭제 기준

### 삭제 판단 기준
1. **grep 검색 결과 0건** → 어디서도 참조 안 됨
2. **import는 있으나 실제 호출 없음** → 사용 안 됨
3. **주석 처리된 코드 블록** → 필요하면 git에서 복원
4. **TODO/FIXME만 있고 구현 없는 스텁** → 미래 기능 선제작

### 삭제 전 검증
```bash
# 1. 빌드 성공 확인
npm run build

# 2. 타입 체크
npm run typecheck  # 또는 tsc --noEmit

# 3. 개발 서버 실행
npm run dev
```

### 삭제 프로세스
1. **분석**: grep 검색으로 사용처 확인
2. **브리핑**: 삭제 대상, 사유, 영향 범위 보고
3. **승인 대기**: 사용자 컨펌 후 실행
4. **검증**: 빌드/런타임 테스트
5. **기록**: Changelog에 삭제 내역 기록

---

## ✅ 작업 전 체크리스트

### 필수 확인
- [ ] `apps/web/dms/` 하위에서만 작업하는지 확인
- [ ] 이 문서(AGENTS.md)를 읽었는지 확인
- [ ] `package.json` 의존성 확인 (외부 workspace 패키지 없는지)
- [ ] 관련 문서 위치 파악

### 코드 변경 시
- [ ] 기존 패턴과 일치하는지 확인
- [ ] 타입 정의와 구현 일치하는지 확인
- [ ] 불필요한 코드 추가하지 않았는지 확인
- [ ] 빌드 테스트 (`npm run build`)

### 문서 변경 시
- [ ] Backlog/Changelog 섹션 업데이트
- [ ] 관련 문서 링크 유효성 확인

---

## 📁 DMS 문서 구조

### 정본 위치: `apps/web/dms/docs/development/`

| 폴더 | 내용 |
|------|------|
| `architecture/` | 기술 스택, 패키지 구조 |
| `domain/` | 서비스 개요, 핵심 기능 |
| `design/` | 디자인 시스템 |
| `guides/` | 개발 가이드 (Hooks, Components, API) |
| `planning/` | 로드맵, 백로그, 변경이력 |

### 핵심 참조 문서
| 문서 | 경로 |
|------|------|
| **문서 인덱스** | `docs/development/README.md` |
| **기술 스택** | `docs/development/architecture/tech-stack.md` |
| **패키지 구조** | `docs/development/architecture/package-spec.md` |
| **컴포넌트 가이드** | `docs/development/guides/components.md` |
| **훅 가이드** | `docs/development/guides/hooks.md` |
| **API 가이드** | `docs/development/guides/api.md` |

---

## 📊 현재 상태 (2026-02-02)

### 완료된 작업
| 작업 | 내용 |
|------|------|
| **구조 정리** | 폴더 구조 표준화 완료 |
| **Dead Code 정리** | 미사용 API/서비스/컴포넌트 삭제 (~2,000줄) |
| **패턴 표준화** | 미들웨어, 스토어, 서비스 패턴 통일 |
| **문서 구조** | 정본 위치 확정, 아카이브 분리 |

### 진행 중
| 항목 | 상태 |
|------|------|
| 문서별 Backlog/Changelog 적용 | 🔄 진행중 |
| 문서-코드 일치성 검증 | 🔄 진행중 |

---

## Backlog

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| AG-01 | DMS 문서별 Backlog/Changelog 섹션 확대 적용 | P1 | 🔄 진행중 |
| AG-02 | package-spec.md 실제 의존성과 일치 확인 | P1 | ⬜ 대기 |
| AG-03 | verification-report.md 참조 경로 수정 | P2 | ⬜ 대기 |

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-02 | **대규모 업데이트**: AI 작업 원칙, 코드 패턴 표준, Dead Code 기준 추가 |
| 2026-02-02 | 핵심 원칙에 "이유" 설명 추가 (학습 가이드화) |
| 2026-02-02 | 현재 상태 현행화 (Phase 8 완료 반영) |
| 2026-01-28 | AGENTS 최초 작성 |
