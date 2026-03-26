# Phase 3: 로직 추출 및 최적화 계획

**계획 수립일**: 2024년 12월 17일  
**예상 기간**: 1-2일  
**목표**: 컴포넌트 로직 분리 및 성능 최적화  
**선행 조건**: Phase 2 (핵심 컴포넌트 분할) 완료

## 🎯 Phase 3 전체 목표

### 핵심 비전
Phase 2에서 분할된 컴포넌트들의 **로직을 추출하여 재사용 가능한 훅으로 만들고**, 전체적인 **성능을 최적화**

### 주요 목표
1. **� 커스텀 훅 추출** - 비즈니스 로직의 재사용성 향상
2. **⚡ 성능 최적화** - React 최적화 기법 적용  
3. **🔍 타입 시스템 강화** - 더 세분화된 타입 정의
4. **✅ 테스트 및 검증** - 리팩토링 결과 검증

## 📋 Phase 3 세부 단계

### Phase 3.1: 커스텀 훅 추출 (0.5-1일)
**목표**: 컴포넌트에서 비즈니스 로직을 분리하여 재사용 가능한 훅으로 추출

#### 3.1.1 파일 시스템 관련 훅
- **useFileSystem**: 파일 CRUD 로직
  ```tsx
  // 기능: 파일 생성, 읽기, 수정, 삭제
  // 사용처: WikiSidebar, WikiEditor, FileTree
  const {
    createFile,
    readFile, 
    updateFile,
    deleteFile,
    files,
    loading,
    error
  } = useFileSystem();
  ```

- **useTreeData**: 트리 데이터 관리
  ```tsx
  // 기능: 트리 구조 관리, 확장/축소, 검색
  // 사용처: TreeComponent, WikiSidebar
  const {
    treeData,
    expandNode,
    collapseNode,
    searchTree,
    filteredData
  } = useTreeData(files);
  ```

#### 3.1.2 에디터 관련 훅
- **useEditor**: 에디터 상태 관리
  ```tsx
  // 기능: 에디터 내용, 커서 위치, 선택 영역 관리
  // 사용처: WikiEditor, EditorToolbar
  const {
    content,
    setContent,
    cursorPosition,
    selection,
    undo,
    redo,
    canUndo,
    canRedo
  } = useEditor(initialContent);
  ```

#### 3.1.3 UI 인터랙션 훅
- **useResize**: 리사이즈 로직
  ```tsx
  // 기능: 패널 크기 조정, 드래그 핸들링
  // 사용처: WikiLayout, SplitPanel
  const {
    size,
    isResizing,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp
  } = useResize(initialSize, minSize, maxSize);
  ```

- **useAutoScroll**: 자동 스크롤
  ```tsx
  // 기능: 스크롤 동기화, 자동 스크롤
  // 사용처: WikiEditor, WikiViewer
  const {
    scrollPosition,
    scrollTo,
    scrollToLine,
    syncScroll
  } = useAutoScroll();
  ```

### Phase 3.2: 성능 최적화 (0.5일)
**목표**: React 최적화 기법을 적용하여 렌더링 성능 향상

#### 3.2.1 메모이제이션 적용
- **React.memo**: 불필요한 리렌더링 방지
  ```tsx
  // 적용 대상: TreeNode, FileItem, EditorLine
  const TreeNode = React.memo(({ node, onExpand, onSelect }) => {
    // 컴포넌트 로직
  });
  ```

- **useMemo**: 비용이 큰 계산 최적화
  ```tsx
  // 적용 대상: 트리 필터링, 검색 결과, 파일 목록
  const filteredFiles = useMemo(() => {
    return files.filter(file => file.name.includes(searchTerm));
  }, [files, searchTerm]);
  ```

- **useCallback**: 함수 참조 안정화
  ```tsx
  // 적용 대상: 이벤트 핸들러, API 호출 함수
  const handleFileSelect = useCallback((filePath: string) => {
    setSelectedFile(filePath);
  }, []);
  ```

#### 3.2.2 가상화 스크롤
- **대용량 파일 목록 최적화**
  ```tsx
  // react-window 또는 자체 구현 가상화
  const VirtualizedFileList = ({ files }) => {
    // 화면에 보이는 항목만 렌더링
  };
  ```

#### 3.2.3 지연 로딩 (Lazy Loading)
- **컴포넌트 분할 로딩**
  ```tsx
  const WikiEditor = lazy(() => import('./WikiEditor'));
  const WikiViewer = lazy(() => import('./WikiViewer'));
  ```

### Phase 3.3: 타입 시스템 강화 (0.5일)
**목표**: 더 세분화된 타입 정의로 타입 안전성 향상

#### 3.3.1 API 전용 타입
- **types/api.ts**: API 요청/응답 타입
  ```tsx
  interface FileApiRequest {
    path: string;
    content?: string;
    metadata?: FileMetadata;
  }
  
  interface FileApiResponse {
    success: boolean;
    data?: FileData;
    error?: ApiError;
  }
  ```

#### 3.3.2 UI 컴포넌트 타입
- **types/ui.ts**: UI 컴포넌트 전용 타입
  ```tsx
  interface ButtonProps {
    variant: 'primary' | 'secondary' | 'danger';
    size: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
  }
  ```

#### 3.3.3 훅 타입 정의
- **types/hooks.ts**: 커스텀 훅 타입
  ```tsx
  interface UseFileSystemReturn {
    files: FileNode[];
    loading: boolean;
    error: string | null;
    createFile: (path: string, content: string) => Promise<void>;
    // ...
  }
  ```

### Phase 3.4: 테스트 및 검증 (0.5일)
**목표**: 리팩토링 결과 검증 및 성능 측정

#### 3.4.1 기능 테스트
- ✅ 모든 기존 기능 정상 동작 확인
- ✅ 새로운 훅들의 올바른 동작 검증
- ✅ 에러 처리 로직 검증

#### 3.4.2 성능 측정
- ⚡ 렌더링 시간 비교 (before/after)
- ⚡ 메모리 사용량 측정
- ⚡ 번들 크기 비교

#### 3.4.3 타입 검증
- 🔍 TypeScript 컴파일 오류 0개
- 🔍 타입 커버리지 95% 이상

## 🏗️ 리팩토링 아키텍처 발전

### Phase 3 이후 예상 구조
```
markdown-wiki/
├── app/                          # Next.js 앱
├── components/                   # Phase 2에서 분할된 컴포넌트들
│   ├── WikiApp.tsx              # 메인 앱 컴포넌트
│   ├── WikiSidebar.tsx          # 사이드바 컴포넌트
│   ├── WikiEditor.tsx           # 에디터 컴포넌트
│   └── ...                      # 기타 분할된 컴포넌트들
├── hooks/                        # 🆕 Phase 3에서 추출된 커스텀 훅들
│   ├── useFileSystem.ts         # 파일 시스템 로직
│   ├── useTreeData.ts           # 트리 데이터 관리
│   ├── useEditor.ts             # 에디터 상태 관리
│   ├── useResize.ts             # 리사이즈 로직
│   └── useAutoScroll.ts         # 스크롤 동기화
├── services/                     # Phase 2.1.5에서 구축된 서비스들
├── utils/                        # Phase 2.1.5에서 구축된 유틸리티들
├── types/                        # Phase 2.1.5 + Phase 3에서 강화된 타입들
│   ├── components.ts            # 컴포넌트 타입 (Phase 2.1.5)
│   ├── api.ts                   # 🆕 API 전용 타입
│   ├── ui.ts                    # 🆕 UI 컴포넌트 타입
│   └── hooks.ts                 # 🆕 훅 타입 정의
└── contexts/                     # Phase 2에서 구축된 Context들
```

### 기술 스택 최적화
- **React 18**: Concurrent Features 활용
- **커스텀 훅**: 비즈니스 로직 재사용
- **메모이제이션**: React.memo, useMemo, useCallback 적용
- **가상화**: 대용량 리스트 성능 최적화
- **지연 로딩**: 코드 분할 및 성능 향상

## 📊 예상 성능 개선 목표

### 렌더링 성능
- **초기 렌더링**: 20% 단축
- **리렌더링 횟수**: 50% 감소
- **메모리 사용량**: 30% 최적화

### 개발자 경험
- **코드 재사용성**: 80% 향상
- **타입 안전성**: 95% 이상
- **디버깅 효율성**: 40% 개선

## 🔄 단계별 마일스톤

### Milestone 3.1: 커스텀 훅 추출 완료
- [ ] useFileSystem 구현 및 테스트
- [ ] useTreeData 구현 및 테스트  
- [ ] useEditor 구현 및 테스트
- [ ] useResize, useAutoScroll 구현
- [ ] 기존 컴포넌트에 훅 적용

### Milestone 3.2: 성능 최적화 완료
- [ ] React.memo 적용 (TreeNode, FileItem 등)
- [ ] useMemo/useCallback 최적화
- [ ] 가상화 스크롤 구현
- [ ] 지연 로딩 적용
- [ ] 성능 벤치마크 측정

### Milestone 3.3: 타입 시스템 강화 완료
- [ ] API 전용 타입 정의 (types/api.ts)
- [ ] UI 컴포넌트 타입 정의 (types/ui.ts)
- [ ] 훅 타입 정의 (types/hooks.ts)
- [ ] 타입 커버리지 95% 달성

### Milestone 3.4: 테스트 및 검증 완료
- [ ] 모든 기능 정상 동작 확인
- [ ] 성능 개선 효과 측정
- [ ] TypeScript 컴파일 오류 0개
- [ ] 리팩토링 문서 업데이트

## 🎯 Phase 3 성공 지표

### 기능적 지표
- ✅ 모든 기존 기능 유지
- ✅ 새로운 훅들의 안정적 동작
- ✅ 에러 없는 빌드 및 실행

### 성능 지표
- ✅ 초기 로딩 시간 20% 단축
- ✅ 리렌더링 횟수 50% 감소
- ✅ 메모리 사용량 30% 최적화

### 코드 품질 지표
- ✅ 코드 재사용성 80% 향상
- ✅ 타입 커버리지 95% 이상
- ✅ 컴포넌트당 평균 라인 수 < 150줄

## 🚀 Phase 3 시작 준비사항

### 선행 요구사항 ✅
- [x] Phase 2.1.5 완료 (타입 시스템, 서비스 레이어)
- [ ] Phase 2 완료 (핵심 컴포넌트 분할) - **다음 필수 단계**

### Phase 3 시작 조건
Phase 3는 **Phase 2 완료 후** 시작해야 합니다:
1. **WikiPage 컴포넌트 분할** 완료
2. **상태 관리 Context 패턴** 적용 완료
3. **TreeComponent 리팩토링** 완료

### 즉시 준비 가능한 작업 (Phase 2 병행)
1. **훅 설계 및 인터페이스 정의**
2. **성능 최적화 전략 수립**
3. **타입 구조 설계**
4. **테스트 계획 수립**

---

**Phase 3 올바른 계획 수립 완료! �**

리팩토링 목표에 맞는 **로직 추출 및 최적화** 단계로 올바르게 수정되었습니다.