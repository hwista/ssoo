# 🛠️ Development Standards Guide

Markdown Wiki System의 개발 표준 및 가이드라인입니다. 일관성 있는 코드 품질과 유지보수성을 보장하기 위한 규칙들을 정의합니다.

## 📋 목차

1. [프로젝트 구조 규칙](#-프로젝트-구조-규칙)
2. [코딩 표준](#-코딩-표준)
3. [컴포넌트 설계 원칙](#-컴포넌트-설계-원칙)
4. [스타일링 가이드](#-스타일링-가이드)
5. [상태 관리 패턴](#-상태-관리-패턴)
6. [API 설계 원칙](#-api-설계-원칙)
7. [타입 정의 규칙](#-타입-정의-규칙)
8. [에러 처리 패턴](#-에러-처리-패턴)
9. [테스트 전략](#-테스트-전략)
10. [성능 최적화 가이드](#-성능-최적화-가이드)

---

## 🏗️ 프로젝트 구조 규칙

### 폴더 구조 표준

```
markdown-wiki/
├── app/                      # Next.js App Router 전용
│   ├── api/                  # API 라우트만 포함
│   ├── [page]/              # 페이지 컴포넌트
│   ├── layout.tsx            # 레이아웃 컴포넌트
│   └── globals.css           # 전역 스타일
├── components/               # 재사용 가능한 컴포넌트
│   ├── ui/                   # 기본 UI 컴포넌트 (shadcn/ui 스타일)
│   └── [FeatureName].tsx     # 기능별 컴포넌트
├── contexts/                 # React Context 정의
├── hooks/                    # 커스텀 훅
├── types/                    # 타입 정의 (향후 확장)
├── utils/                    # 유틸리티 함수 (향후 확장)
├── docs/                     # 문서 루트 폴더
│   ├── wiki/                 # 위키 시스템 문서 저장소 (파일 관리 대상)
│   └── development/          # 개발 관련 문서 (API, 컴포넌트 가이드 등)
└── public/                   # 정적 자산
```

### 파일 명명 규칙

1. **컴포넌트**: PascalCase (`TreeComponent.tsx`)
2. **훅**: camelCase + use 접두사 (`useMessage.ts`)
3. **API 라우트**: kebab-case (`file/route.ts`)
4. **타입/인터페이스**: PascalCase (`FileNode`, `NotificationProps`)
5. **상수**: UPPER_SNAKE_CASE (`DEFAULT_SIDEBAR_WIDTH`)

---

## 💻 코딩 표준

### TypeScript 규칙

1. **엄격한 타입 체크**
   ```typescript
   // ✅ 좋은 예
   interface FileNode {
     name: string;
     type: 'file' | 'directory';
     path: string;
     children?: FileNode[];
   }
   
   // ❌ 피할 예
   const data: any = {};
   ```

2. **옵셔널 체이닝 사용**
   ```typescript
   // ✅ 좋은 예
   const fileName = selectedFile?.split('/').pop();
   
   // ❌ 피할 예
   const fileName = selectedFile && selectedFile.split('/').pop();
   ```

3. **타입 가드 활용**
   ```typescript
   // ✅ 좋은 예
   if (node.type === 'directory' && node.children) {
     // TypeScript가 children의 존재를 보장
   }
   ```

### 함수 설계 원칙

1. **단일 책임 원칙**
   ```typescript
   // ✅ 좋은 예 - 하나의 기능만 수행
   const normalizeFilePath = (path: string): string => {
     return path.replace(/\\/g, '/');
   };
   
   // ❌ 피할 예 - 여러 책임을 가짐
   const processFile = (path: string) => {
     // 경로 정규화 + 파일 읽기 + 상태 업데이트
   };
   ```

2. **순수 함수 지향**
   ```typescript
   // ✅ 좋은 예
   const calculateFileSize = (content: string): number => {
     return new Blob([content]).size;
   };
   ```

3. **비동기 함수 명명**
   ```typescript
   // ✅ 좋은 예
   const fetchFileContent = async (path: string) => { /* */ };
   const saveFileContent = async (path: string, content: string) => { /* */ };
   ```

---

## 🧩 컴포넌트 설계 원칙

### 컴포넌트 구조 템플릿

```typescript
'use client'; // 클라이언트 컴포넌트인 경우

import React, { useState, useEffect } from 'react';

// 타입 정의
interface ComponentNameProps {
  // 필수 props
  requiredProp: string;
  // 옵셔널 props
  optionalProp?: boolean;
  // 이벤트 핸들러
  onEvent?: (param: string) => void;
  // 스타일링
  className?: string;
}

// 컴포넌트 정의
const ComponentName: React.FC<ComponentNameProps> = ({
  requiredProp,
  optionalProp = false,
  onEvent,
  className = ""
}) => {
  // 1. 상태 선언
  const [localState, setLocalState] = useState<string>('');
  
  // 2. 부수 효과
  useEffect(() => {
    // 초기화 로직
  }, []);
  
  // 3. 이벤트 핸들러
  const handleClick = () => {
    onEvent?.(localState);
  };
  
  // 4. 렌더링
  return (
    <div className={`base-classes ${className}`}>
      {/* JSX 내용 */}
    </div>
  );
};

export default ComponentName;
```

### Props 설계 규칙

1. **명확한 네이밍**
   ```typescript
   // ✅ 좋은 예
   interface TreeComponentProps {
     treeData: FileNode[];
     selectedFile: string | null;
     onFileSelect: (path: string) => void;
     showSearch?: boolean;
   }
   
   // ❌ 피할 예
   interface Props {
     data: any;
     selected: string;
     onClick: Function;
   }
   ```

2. **이벤트 핸들러 네이밍**
   ```typescript
   // 패턴: on + 동작 + 대상
   onFileSelect: (path: string) => void;
   onRename: (oldPath: string, newName: string) => void;
   onCreateFile: (path: string) => void;
   ```

---

## 🎨 스타일링 가이드

### Tailwind CSS 사용 규칙

1. **일관된 디자인 토큰**
   ```typescript
   // 색상 팔레트
   const COLORS = {
     success: 'green-500',
     warning: 'yellow-500', 
     error: 'red-500',
     info: 'blue-500',
     neutral: 'gray-500'
   } as const;
   
   // 간격 표준
   const SPACING = {
     container: 'p-6',
     section: 'mb-4',
     button: 'gap-2'
   } as const;
   ```

2. **반응형 클래스 순서**
   ```typescript
   // 순서: 기본 → 상태 → 반응형
   className="
     px-4 py-2 bg-blue-500 text-white rounded-md
     hover:bg-blue-600 focus:ring-2 focus:ring-blue-300
     sm:px-6 md:py-3 lg:text-lg
   "
   ```

3. **컴포넌트별 스타일 통일**
   ```typescript
   // 버튼 기본 스타일
   const BUTTON_BASE = "px-4 py-2 rounded-md font-medium transition-colors";
   const BUTTON_VARIANTS = {
     primary: "bg-blue-500 hover:bg-blue-600 text-white",
     secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800",
     danger: "bg-red-500 hover:bg-red-600 text-white"
   };
   ```

### 상태별 스타일링 규칙

1. **파일 상태 표시**
   ```typescript
   const getFileStateStyles = (state: 'new' | 'updated' | 'normal') => {
     switch (state) {
       case 'new':
         return 'text-green-600 font-bold text-base';
       case 'updated':
         return 'text-blue-600 font-bold text-base';
       default:
         return 'text-sm';
     }
   };
   ```

2. **뱃지 스타일 표준**
   ```typescript
   const BADGE_STYLES = {
     new: 'bg-red-500 text-white',
     update: 'bg-yellow-500 text-white',
     base: 'px-1.5 py-0.5 text-xs font-bold rounded-sm select-none'
   };
   ```

---

## 🔄 상태 관리 패턴

### Context API 사용 규칙

1. **Context 구조 템플릿**
   ```typescript
   // 1. 타입 정의
   interface ContextValue {
     data: DataType;
     actions: {
       actionName: (param: string) => void;
     };
   }
   
   // 2. Context 생성
   const Context = createContext<ContextValue | undefined>(undefined);
   
   // 3. Provider 컴포넌트
   export const Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
     const [state, setState] = useState<DataType>(initialState);
     
     const actions = useMemo(() => ({
       actionName: (param: string) => {
         // 액션 로직
       }
     }), []);
     
     const value = useMemo(() => ({
       data: state,
       actions
     }), [state, actions]);
     
     return <Context.Provider value={value}>{children}</Context.Provider>;
   };
   
   // 4. 커스텀 훅
   export const useContext = () => {
     const context = useContext(Context);
     if (!context) {
       throw new Error('useContext must be used within Provider');
     }
     return context;
   };
   ```

2. **로컬 상태 vs Context 선택 기준**
   - **로컬 상태**: 단일 컴포넌트 내에서만 사용
   - **Context**: 여러 컴포넌트 간 공유 필요

### 상태 업데이트 패턴

1. **불변성 유지**
   ```typescript
   // ✅ 좋은 예
   setItems(prev => [...prev, newItem]);
   setItems(prev => prev.filter(item => item.id !== targetId));
   
   // ❌ 피할 예
   items.push(newItem);
   setItems(items);
   ```

2. **Set 자료구조 활용**
   ```typescript
   // 새로운 항목 추가
   setNewlyCreatedItems(prev => new Set(prev).add(path));
   
   // 항목 제거
   setUpdatedItems(prev => {
     const newSet = new Set(prev);
     newSet.delete(path);
     return newSet;
   });
   ```

---

## 🌐 API 설계 원칙

### RESTful API 패턴

1. **엔드포인트 설계**
   ```typescript
   // 파일 관련 작업 - /api/file
   POST /api/file { action: 'read', path: string }
   POST /api/file { action: 'write', path: string, content: string }
   POST /api/file { action: 'delete', path: string }
   POST /api/file { action: 'rename', path: string, newPath: string }
   
   // 파일 목록 - /api/files
   GET /api/files
   
   // 실시간 감시 - /api/watch
   GET /api/watch (SSE)
   ```

2. **응답 형식 통일**
   ```typescript
   // 성공 응답
   interface SuccessResponse<T = any> {
     success: true;
     data: T;
     message?: string;
   }
   
   // 오류 응답
   interface ErrorResponse {
     success: false;
     error: string;
     details?: string;
   }
   ```

3. **에러 처리 패턴**
   ```typescript
   export async function POST(request: Request) {
     try {
       const body = await request.json();
       
       // 입력 검증
       if (!body.action || !body.path) {
         return NextResponse.json(
           { success: false, error: 'Missing required fields' },
           { status: 400 }
         );
       }
       
       // 비즈니스 로직
       const result = await processRequest(body);
       
       return NextResponse.json({
         success: true,
         data: result
       });
       
     } catch (error) {
       console.error('API Error:', error);
       return NextResponse.json(
         { 
           success: false, 
           error: error instanceof Error ? error.message : 'Unknown error' 
         },
         { status: 500 }
       );
     }
   }
   ```

---

## 📝 타입 정의 규칙

### 인터페이스 vs 타입 사용 기준

1. **인터페이스 사용**
   ```typescript
   // 객체 형태의 구조
   interface FileNode {
     name: string;
     type: 'file' | 'directory';
     path: string;
     children?: FileNode[];
   }
   
   // 확장 가능한 Props
   interface BaseProps {
     className?: string;
   }
   
   interface ButtonProps extends BaseProps {
     onClick: () => void;
     variant?: 'primary' | 'secondary';
   }
   ```

2. **타입 별칭 사용**
   ```typescript
   // 유니온 타입
   type NotificationType = 'success' | 'error' | 'info' | 'warning';
   
   // 함수 타입
   type EventHandler<T = void> = (param: T) => void;
   
   // 유틸리티 타입
   type PartialFileNode = Partial<FileNode>;
   type RequiredProps = Required<Pick<Props, 'name' | 'path'>>;
   ```

### 제네릭 사용 패턴

```typescript
// API 응답 타입
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// 컴포넌트 Props
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
}
```

---

## 🚨 에러 처리 패턴

### 클라이언트 에러 처리

1. **Try-Catch 패턴**
   ```typescript
   const handleFileOperation = async () => {
     try {
       setLoading(true);
       const result = await fileApi.read(path);
       setContent(result.data);
       
       // 성공 알림
       addNotification({
         type: 'success',
         title: '파일 로드 완료',
         message: `${path} 파일을 불러왔습니다.`
       });
       
     } catch (error) {
       console.error('파일 로드 실패:', error);
       
       // 에러 알림
       addNotification({
         type: 'error',
         title: '파일 로드 실패',
         message: error instanceof Error ? error.message : '알 수 없는 오류'
       });
       
     } finally {
       setLoading(false);
     }
   };
   ```

2. **에러 바운더리 패턴** (향후 확장)
   ```typescript
   class ErrorBoundary extends React.Component {
     constructor(props) {
       super(props);
       this.state = { hasError: false };
     }
     
     static getDerivedStateFromError(error) {
       return { hasError: true };
     }
     
     componentDidCatch(error, errorInfo) {
       console.error('에러 바운더리 캐치:', error, errorInfo);
     }
     
     render() {
       if (this.state.hasError) {
         return <ErrorFallback />;
       }
       
       return this.props.children;
     }
   }
   ```

### 검증 패턴

```typescript
// 입력 검증 함수
const validateFilePath = (path: string): string[] => {
  const errors: string[] = [];
  
  if (!path.trim()) {
    errors.push('파일 경로는 필수입니다.');
  }
  
  if (path.includes('..')) {
    errors.push('상위 디렉토리 접근은 허용되지 않습니다.');
  }
  
  if (!/^[a-zA-Z0-9._/-]+$/.test(path)) {
    errors.push('파일 경로에 특수문자가 포함되어 있습니다.');
  }
  
  return errors;
};
```

---

## 🧪 테스트 전략

### 테스트 우선순위

1. **핵심 비즈니스 로직** (예정)
   - 파일 CRUD 작업
   - 트리 구조 탐색
   - 상태 관리 로직

2. **API 엔드포인트** (예정)
   - 파일 시스템 작업
   - 에러 처리
   - 입력 검증

3. **컴포넌트 상호작용** (예정)
   - 사용자 이벤트
   - 상태 변경
   - Props 전달

### 테스트 작성 가이드 (향후 확장)

```typescript
// 예시: 파일 경로 검증 테스트
describe('validateFilePath', () => {
  it('유효한 경로는 빈 배열을 반환한다', () => {
    expect(validateFilePath('docs/readme.md')).toEqual([]);
  });
  
  it('빈 경로는 에러를 반환한다', () => {
    expect(validateFilePath('')).toContain('파일 경로는 필수입니다.');
  });
  
  it('상위 디렉토리 접근은 에러를 반환한다', () => {
    expect(validateFilePath('../secret.txt')).toContain('상위 디렉토리 접근은 허용되지 않습니다.');
  });
});
```

---

## ⚡ 성능 최적화 가이드

### React 최적화 패턴

1. **메모이제이션 활용**
   ```typescript
   // useMemo로 계산 비용이 큰 값 캐싱
   const sortedFiles = useMemo(() => {
     return files.sort((a, b) => a.name.localeCompare(b.name));
   }, [files]);
   
   // useCallback으로 함수 참조 안정화
   const handleFileSelect = useCallback((path: string) => {
     setSelectedFile(path);
   }, []);
   ```

2. **조건부 렌더링 최적화**
   ```typescript
   // ✅ 좋은 예 - 조기 반환
   if (!treeData.length) {
     return <EmptyState />;
   }
   
   // ✅ 좋은 예 - 논리 AND 연산자
   {isLoading && <LoadingSpinner />}
   {error && <ErrorMessage error={error} />}
   ```

3. **리스트 렌더링 최적화**
   ```typescript
   // key prop으로 React 재조정 최적화
   {files.map(file => (
     <FileItem 
       key={file.path} // 고유하고 안정적인 키 사용
       file={file}
       onSelect={handleSelect}
     />
   ))}
   ```

### 번들 크기 최적화

1. **동적 임포트 활용** (향후 적용)
   ```typescript
   // 큰 컴포넌트는 지연 로딩
   const HeavyComponent = lazy(() => import('./HeavyComponent'));
   
   // 조건부 로딩
   const loadFeature = async () => {
     const { feature } = await import('./feature');
     return feature();
   };
   ```

2. **트리 쉐이킹 고려**
   ```typescript
   // ✅ 좋은 예 - 필요한 것만 임포트
   import { useState, useEffect } from 'react';
   
   // ❌ 피할 예 - 전체 라이브러리 임포트
   import * as React from 'react';
   ```

---

## 🔍 코드 리뷰 체크리스트

### 필수 검토 항목

- [ ] **타입 안전성**: 모든 변수와 함수에 적절한 타입 지정
- [ ] **에러 처리**: try-catch 블록과 사용자 피드백 제공
- [ ] **성능**: 불필요한 리렌더링 방지 (useMemo, useCallback)
- [ ] **접근성**: ARIA 속성과 키보드 네비게이션 지원
- [ ] **보안**: 사용자 입력 검증과 XSS 방지
- [ ] **일관성**: 기존 코드 스타일과 패턴 준수

### 스타일 검토 항목

- [ ] **네이밍**: 의도가 명확한 변수/함수명 사용
- [ ] **구조**: 컴포넌트 구조 템플릿 준수
- [ ] **주석**: 복잡한 로직에 적절한 설명 추가
- [ ] **테스트**: 핵심 기능에 대한 테스트 작성 (향후)

---

## 📚 참고 자료

### 공식 문서
- [Next.js 16.0 문서](https://nextjs.org/docs)
- [React 18 문서](https://react.dev/)
- [TypeScript 문서](https://www.typescriptlang.org/docs/)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)

### 프로젝트 내부 문서
- [API 명세](./docs/api.md) - 예정
- [컴포넌트 가이드](./docs/components.md) - 예정
- [배포 가이드](./docs/deployment.md) - 예정

---

## 📝 변경 이력

### v1.0.0 (2025-10-28)
- 초기 개발 표준 수립
- 프로젝트 구조 및 코딩 규칙 정의
- 컴포넌트 설계 원칙 수립
- 스타일링 가이드 작성

---

**이 문서는 프로젝트의 발전과 함께 지속적으로 업데이트됩니다.**