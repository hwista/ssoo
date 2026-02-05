# Phase 4 실행 계획: Context 통합 및 최종 정리

**작성일**: 2025-10-29  
**예상 소요 시간**: 9-13시간  
**완료 상태**: ⏳ 계획 단계

---

## 🎯 Phase 4 목표

Phase 3에서 연기된 Context 중복 제거 및 프로젝트 최종 정리:
1. **Context 중복 제거**: expandedFolders/selectedFile 통합
2. **통합 테스트**: 전체 기능 검증
3. **문서화 완료**: 개발 문서 업데이트

> **참고**: Split View UI 및 useAutoScroll은 현재 미리보기 모달이 정상 동작하므로 Phase 4에서 제외

---

## 📊 Phase 3.5에서 넘어온 이슈

### 1. Context 중복 관리 (🔴 Critical)

**문제점**:
```typescript
// WikiContext.tsx - 중복 1
const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
const [selectedFile, setSelectedFile] = useState<string | null>(null);

// useTreeData.ts - 중복 2
const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
  options.initialExpanded || new Set()
);
const [selectedFile, setSelectedFile] = useState<string | null>(
  options.initialSelected || null
);
```

**현재 해결책**: 동기화 패턴 (안정적이지만 기술 부채)

**Phase 4 목표**: TreeDataContext를 단일 소스로 승격

---

### 2. useAutoScroll 미통합 (제외됨)

**Phase 4 결정**: 
- 현재 미리보기 모달이 정상 동작 중
- Split View 없이는 useAutoScroll 불필요
- 훅 구현은 완료되었으나 통합하지 않음

---

## 🚀 실행 계획

### 🎯 Step 1: Context 통합 (3-4시간, 🔴 High Priority)

#### 1.1 TreeDataContext 활성화
**파일**: `contexts/TreeDataContext.tsx` (이미 생성됨, 60라인)

**작업**:
```typescript
// 1. TreeDataContext Provider를 WikiApp에 적용
// app/wiki/WikiApp.tsx
import { TreeDataProvider } from '@/contexts/TreeDataContext';

export default function WikiApp() {
  return (
    <WikiProvider>
      <TreeDataProvider> {/* 추가 */}
        <div className="wiki-container">
          {/* 기존 코드 */}
        </div>
      </TreeDataProvider>
    </WikiProvider>
  );
}
```

#### 1.2 WikiContext 중복 제거
**파일**: `contexts/WikiContext.tsx`

**작업**:
```typescript
// 제거할 상태
- const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
- const [selectedFile, setSelectedFile] = useState<string | null>(null);

// 제거할 함수
- handleFileSelect
- toggleFolder
- expandAll
- collapseAll
```

#### 1.3 WikiSidebar 업데이트
**파일**: `components/WikiSidebar.tsx`

**작업**:
```typescript
// Before
import { useWiki } from '@/contexts/WikiContext';
const { expandedFolders, setExpandedFolders, selectedFile, setSelectedFile } = useWiki();

// After
import { useTreeDataContext } from '@/contexts/TreeDataContext';
const { 
  expandedFolders, 
  toggleFolder, 
  selectedFile, 
  selectFile 
} = useTreeDataContext();
```

#### 1.4 통합 테스트
**체크리스트**:
- [ ] 파일 트리 렌더링 정상
- [ ] 검색 기능 동작
- [ ] 폴더 확장/축소 동작
- [ ] 파일 선택 동작
- [ ] 새로 고침 시 상태 유지

**예상 이슈**:
- WikiContext 의존성 있는 다른 컴포넌트 영향
- 상태 초기화 타이밍 문제

---

### 🧪 Step 2: 통합 테스트 (2-3시간, 🔴 High Priority)

#### 2.1 기능 테스트 체크리스트

**파일 시스템**:
- [ ] 파일 생성 (파일/폴더)
- [ ] 파일 삭제
- [ ] 파일 이름 변경
- [ ] 파일 이동 (드래그앤드롭)
- [ ] 파일 검색
- [ ] 파일 선택

**에디터**:
- [ ] 내용 입력
- [ ] 자동 저장 (30초)
- [ ] 수동 저장
- [ ] Undo/Redo
- [ ] 미리보기 모달 표시 (현재 방식 유지)

**UI/UX**:
- [ ] 사이드바 리사이즈
- [ ] 모달 표시 (생성/삭제/메시지)
- [ ] 알림 시스템
- [ ] 컨텍스트 메뉴
- [ ] 키보드 단축키

#### 2.2 성능 프로파일링

**도구**:
- React DevTools Profiler
- Chrome Performance Tab
- Lighthouse Audit

**메트릭**:
- 초기 로딩 시간: < 2초
- 파일 선택 응답: < 100ms
- 검색 응답: < 200ms
- 리사이즈 끊김 없음 (60fps)

#### 2.3 크로스 브라우저 테스트

**브라우저**:
- [ ] Chrome (최신)
- [ ] Firefox (최신)
- [ ] Safari (최신)
- [ ] Edge (최신)

**해상도**:
- [ ] 모바일 (375px)
- [ ] 태블릿 (768px)
- [ ] 데스크톱 (1920px)

---

### 📚 Step 3: 문서화 완료 (1-2시간, 🟡 Medium Priority)

#### 3.1 API 문서 업데이트
**파일**: `docs/development/api.md`

**추가 내용**:
- Custom Hooks 섹션 링크
- Context API 사용법
- 에러 처리 패턴

#### 3.2 컴포넌트 가이드 업데이트
**파일**: `docs/development/components.md`

**추가 내용**:
- TreeDataContext 사용법
- Context 통합 예제
- 성능 최적화 패턴

#### 3.3 아키텍처 다이어그램 작성
**새 파일**: `docs/development/architecture.md`

**내용**:
```
프로젝트 구조
├── 컴포넌트 계층
├── 상태 관리 흐름
├── 데이터 흐름
└── 최적화 전략
```

#### 3.4 마이그레이션 가이드
**새 파일**: `docs/development/migration-guide.md`

**내용**:
- v0 → v1 변경 사항
- Breaking Changes
- 업그레이드 방법

---

## ⚠️ 리스크 관리

### 높은 리스크 작업

| 작업 | 리스크 레벨 | 완화 방안 |
|------|-------------|-----------|
| Context 통합 | 🔴 High | 단계별 적용, 롤백 지점 확보 |

### 롤백 계획

```bash
# Git 태그 생성
git tag phase3-stable

# 문제 발생 시 롤백
git revert <commit-hash>

# 또는 전체 롤백
git reset --hard phase3-stable
```

---

## 📈 성공 지표

### 완료 조건

- [x] Phase 3 완료 (98%)
- [ ] Context 통합 완료 (0%)
- [ ] 통합 테스트 통과 (0%)
- [ ] 문서화 완료 (0%)
- [ ] 빌드 0 에러 유지 (현재 ✅)

### 품질 메트릭

**코드 품질**:
- 타입 커버리지: > 95%
- 컴포넌트 평균 라인: < 200줄
- 단일 책임 원칙 준수: 100%

**성능**:
- Lighthouse 점수: > 90
- 초기 로딩: < 2초
- TTI (Time to Interactive): < 3초

---

## 🔄 단계별 체크리스트

### Step 1: Context 통합 (3-4시간)
- [ ] TreeDataContext Provider 적용
- [ ] WikiContext 중복 제거
- [ ] WikiSidebar 업데이트
- [ ] 통합 테스트
- [ ] Git 커밋 (feat: integrate TreeDataContext)

### Step 2: 통합 테스트 (2-3시간)
- [ ] 기능 테스트
- [ ] 성능 프로파일링
- [ ] 크로스 브라우저 테스트
- [ ] 버그 수정
- [ ] Git 커밋 (test: comprehensive integration testing)

### Step 3: 문서화 (1-2시간)
- [ ] API 문서 업데이트
- [ ] 컴포넌트 가이드 업데이트
- [ ] 아키텍처 다이어그램
- [ ] 마이그레이션 가이드
- [ ] Git 커밋 (docs: complete phase 4 documentation)

---

## 📊 예상 타임라인

```
Day 1 (3-4시간):
└── Context 통합 (3-4시간)

Day 2 (2-3시간):
├── 통합 테스트 (2시간)
└── 문서화 시작 (1시간)

Day 3 (1시간):
└── 문서화 완료 (1시간)
```

**총 예상 시간**: 6-8시간

---

## 🎉 Phase 4 완료 후 상태

### 아키텍처 개선
- ✅ 단일 소스 Context 패턴
- ✅ 완전한 컴포넌트 분리
- ✅ 재사용 가능한 훅 시스템
- ✅ 안정적인 미리보기 모달

### 코드 메트릭
- 타입 안전성: 100%
- 코드 중복: < 5%
- 컴포넌트 평균 크기: < 200줄
- 훅 추출: 5개 (1,151라인)

### 개발자 경험
- 명확한 문서화
- 일관된 패턴
- 쉬운 확장성
- 빠른 온보딩

---

## 🔗 관련 문서

- [Phase 3 완료 보고서](../phase3/phase3-overall-summary.md)
- [Phase 3.5 완료 보고서](../phase3/phase3.5-completion-report.md)
- [리팩토링 v1 개요](../../README.md)
- [리팩토링 목표](../../goals.md)

---

**📅 작성일**: 2025-10-29  
**👤 작성자**: GitHub Copilot  
**🚀 다음 단계**: Context 통합부터 시작
