# 🧩 Component Guide

Markdown Wiki System의 모든 컴포넌트에 대한 상세한 가이드입니다.

## 📋 목차

1. [컴포넌트 아키텍처](#-컴포넌트-아키텍처)
2. [UI 컴포넌트](#-ui-컴포넌트)
3. [기능 컴포넌트](#-기능-컴포넌트)
4. [컨텍스트 및 훅](#-컨텍스트-및-훅)
5. [사용 예제](#-사용-예제)

---

## 🏗️ 컴포넌트 아키텍처

### 컴포넌트 계층 구조

```
WikiPage (메인 페이지)
├── TreeComponent (파일 트리)
│   └── TreeNode (개별 파일/폴더)
├── ContentArea (에디터 영역)
│   ├── FileHeader (파일 정보 헤더)
│   ├── MarkdownEditor (편집 모드)
│   └── MarkdownViewer (읽기 모드)
├── CreateFileModal (파일 생성 모달)
├── MessageModal (메시지 모달)
└── NotificationContainer (알림 시스템)
    └── Notification (개별 알림)
```

### 데이터 흐름

```
App State
├── TreeData (파일 구조)
├── SelectedFile (현재 선택된 파일)
├── FileContent (파일 내용)
├── NewlyCreatedItems (새 항목)
├── UpdatedItems (수정된 항목)
└── NotificationState (알림 상태)
```

---

## 🎨 UI 컴포넌트

### Button 컴포넌트

**위치**: `components/ui/button.tsx`

```typescript
interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}
```

**사용 예제**:
```tsx
<Button variant="primary" onClick={handleClick}>
  저장
</Button>

<Button variant="destructive" size="sm">
  삭제
</Button>
```

**스타일 변형**:
- `primary`: 주요 액션 (파란색)
- `secondary`: 보조 액션 (회색)
- `destructive`: 위험한 액션 (빨간색)
- `outline`: 테두리만 있는 버튼

### Card 컴포넌트

**위치**: `components/ui/card.tsx`

```typescript
interface CardProps {
  className?: string;
  children: React.ReactNode;
}
```

**사용 예제**:
```tsx
<Card className="p-6">
  <h2>제목</h2>
  <p>내용</p>
</Card>
```

### Input 컴포넌트

**위치**: `components/ui/input.tsx`

```typescript
interface InputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}
```

---

## 🛠️ 기능 컴포넌트

### TreeComponent

**위치**: `components/TreeComponent.tsx`

파일 시스템을 트리 형태로 표시하는 핵심 컴포넌트입니다.

#### Props
```typescript
interface TreeComponentProps {
  // 데이터
  treeData: FileNode[];
  selectedFile: string | null;
  
  // 이벤트 핸들러
  onFileSelect: (path: string) => void;
  onCreateFile?: (path: string) => void;
  onCreateFolder?: (path: string) => void;
  onRename?: (oldPath: string, newName: string) => void;
  
  // 검색 기능
  showSearch?: boolean;
  searchPlaceholder?: string;
  
  // 확장/접기
  showExpandCollapseButtons?: boolean;
  defaultExpanded?: boolean;
  expandedFolders?: Set<string>;
  onExpandedFoldersChange?: (folders: Set<string>) => void;
  
  // 컨텍스트 메뉴
  enableContextMenu?: boolean;
  onContextMenu?: (event: React.MouseEvent, node: FileNode | null) => void;
  
  // 표시 옵션
  showOnlyFolders?: boolean;
  showFileIcons?: boolean;
  
  // 시각적 피드백
  newlyCreatedItems?: Set<string>;
  updatedItems?: Set<string>;
  
  // 인라인 편집
  renamingItem?: { path: string; newName: string } | null;
  onCancelRename?: () => void;
  onRenamingNameChange?: (newName: string) => void;
  
  // 스타일링
  className?: string;
  height?: string;
}
```

#### 주요 기능
1. **계층적 파일 표시**: 폴더/파일을 트리 구조로 표시
2. **검색**: 실시간 파일명 검색
3. **컨텍스트 메뉴**: 우클릭으로 파일 관리 기능 접근
4. **시각적 피드백**: NEW/UPDATE 뱃지 표시
5. **인라인 편집**: 파일명 즉시 수정
6. **키보드 지원**: Enter/Esc 키 지원

#### 사용 예제
```tsx
<TreeComponent
  treeData={fileTree}
  selectedFile={currentFile}
  onFileSelect={setCurrentFile}
  showSearch={true}
  enableContextMenu={true}
  newlyCreatedItems={newItems}
  updatedItems={modifiedItems}
  onRename={handleRename}
/>
```

### CreateFileModal

**위치**: `components/CreateFileModal.tsx`

파일/폴더 생성을 위한 모달 컴포넌트입니다.

#### Props
```typescript
interface CreateFileModalProps {
  isOpen: boolean;
  mode: 'file' | 'folder';
  initialPath: string;
  treeData: FileNode[];
  onConfirm: (params: CreateParams) => void;
  onClose: () => void;
}

interface CreateParams {
  name: string;
  extension: string;
  path: string;
  type: 'file' | 'folder';
}
```

#### 주요 기능
1. **파일/폴더 모드**: 생성할 항목 타입 선택
2. **경로 선택**: 드롭다운으로 생성 위치 선택
3. **중복 검사**: 같은 이름의 파일 존재 여부 확인
4. **확장자 지원**: .md, .txt 등 확장자 선택

### MessageModal

**위치**: `components/MessageModal.tsx`

사용자에게 메시지를 표시하는 범용 모달 컴포넌트입니다.

#### Props
```typescript
interface MessageModalProps {
  isOpen: boolean;
  type: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  details?: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  onClose: () => void;
}
```

#### 사용 예제
```tsx
<MessageModal
  isOpen={showModal}
  type="warning"
  title="파일 삭제"
  message="정말로 이 파일을 삭제하시겠습니까?"
  confirmText="삭제"
  cancelText="취소"
  showCancel={true}
  onConfirm={handleDelete}
  onCancel={handleCancel}
  onClose={closeModal}
/>
```

### Notification

**위치**: `components/Notification.tsx`

개별 알림을 표시하는 컴포넌트입니다.

#### Props
```typescript
interface NotificationProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
  index?: number;
  onClose: (id: string) => void;
}
```

#### 주요 기능
1. **타입별 스타일**: 성공, 오류, 정보, 경고별 색상
2. **자동 닫기**: 설정된 시간 후 자동 해제
3. **애니메이션**: 우상단에서 슬라이드 인/아웃
4. **순차 배치**: 여러 알림 시 순서대로 배치

### NotificationContainer

**위치**: `components/NotificationContainer.tsx`

모든 알림을 관리하는 컨테이너 컴포넌트입니다.

#### 주요 기능
1. **상태 관리**: Context에서 알림 목록 가져오기
2. **위치 관리**: 우상단 고정 위치에 알림 배치
3. **순서 관리**: 새 알림이 위에 표시되도록 정렬

---

## 🔄 컨텍스트 및 훅

### NotificationContext

**위치**: `contexts/NotificationContext.tsx`

전역 알림 상태를 관리하는 Context입니다.

#### 제공하는 값
```typescript
interface NotificationContextValue {
  notifications: NotificationData[];
  addNotification: (notification: Omit<NotificationData, 'id'>) => string;
  removeNotification: (id: string) => void;
  showSuccess: (title: string, message?: string, duration?: number) => string;
  showError: (title: string, message?: string, duration?: number) => string;
  showInfo: (title: string, message?: string, duration?: number) => string;
  showWarning: (title: string, message?: string, duration?: number) => string;
}
```

#### 사용 예제
```tsx
const { addNotification } = useNotification();

const handleSuccess = () => {
  addNotification({
    type: 'success',
    title: '저장 완료',
    message: '파일이 성공적으로 저장되었습니다.',
    duration: 3000
  });
};
```

### useMessage 훅

**위치**: `hooks/useMessage.ts`

메시지 모달 상태를 관리하는 커스텀 훅입니다.

#### 반환값
```typescript
interface UseMessageReturn {
  messageState: MessageState;
  showMessage: (params: ShowMessageParams) => void;
  hideMessage: () => void;
  showError: (title: string, message: string, details?: string) => void;
}
```

#### 사용 예제
```tsx
const { showMessage, hideMessage, showError } = useMessage();

const handleDelete = () => {
  showMessage({
    type: 'warning',
    title: '파일 삭제',
    message: '정말로 삭제하시겠습니까?',
    showCancel: true,
    onConfirm: () => {
      // 삭제 로직
      hideMessage();
    }
  });
};
```

---

## 💡 사용 예제

### 완전한 파일 관리 시스템 구성

```tsx
function WikiPage() {
  // 상태 관리
  const [treeData, setTreeData] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [newlyCreatedItems, setNewlyCreatedItems] = useState(new Set<string>());
  const [updatedItems, setUpdatedItems] = useState(new Set<string>());
  
  // 훅 사용
  const { addNotification } = useNotification();
  const { showMessage } = useMessage();
  
  // 파일 선택 핸들러
  const handleFileSelect = (path: string) => {
    setSelectedFile(path);
    loadFileContent(path);
  };
  
  // 파일 이름 변경 핸들러
  const handleRename = async (oldPath: string, newName: string) => {
    try {
      await renameFile(oldPath, newName);
      
      // 수정된 항목으로 표시
      setUpdatedItems(prev => new Set(prev).add(newPath));
      
      // 성공 알림
      addNotification({
        type: 'success',
        title: '이름 변경 완료',
        message: `파일 이름이 "${newName}"로 변경되었습니다.`
      });
      
    } catch (error) {
      // 오류 알림
      addNotification({
        type: 'error',
        title: '이름 변경 실패',
        message: error.message
      });
    }
  };
  
  return (
    <div className="flex h-screen">
      {/* 파일 트리 */}
      <TreeComponent
        treeData={treeData}
        selectedFile={selectedFile}
        onFileSelect={handleFileSelect}
        onRename={handleRename}
        newlyCreatedItems={newlyCreatedItems}
        updatedItems={updatedItems}
        enableContextMenu={true}
        showSearch={true}
      />
      
      {/* 컨텐츠 영역 */}
      <ContentArea
        selectedFile={selectedFile}
        onSave={handleSave}
        onDelete={handleDelete}
      />
      
      {/* 알림 시스템 */}
      <NotificationContainer />
    </div>
  );
}
```

### 커스텀 컴포넌트 확장

```tsx
// TreeComponent을 확장한 커스텀 컴포넌트
function CustomTreeComponent(props: TreeComponentProps) {
  const handleCustomAction = (node: FileNode) => {
    // 커스텀 로직
  };
  
  return (
    <div className="custom-tree-wrapper">
      <div className="custom-toolbar">
        {/* 커스텀 도구 모음 */}
      </div>
      
      <TreeComponent
        {...props}
        className="custom-tree"
        onContextMenu={(e, node) => {
          // 커스텀 컨텍스트 메뉴 로직
          props.onContextMenu?.(e, node);
        }}
      />
    </div>
  );
}
```

---

## 🎨 스타일링 가이드

### CSS 클래스 네이밍 규칙

1. **컴포넌트 기반**: `.tree-component`, `.notification-container`
2. **상태 기반**: `.is-selected`, `.is-expanded`, `.is-loading`
3. **변형 기반**: `.button--primary`, `.card--elevated`

### Tailwind 클래스 조합 패턴

```typescript
// 기본 스타일 + 상태 + 반응형
const buttonClasses = `
  px-4 py-2 rounded-md font-medium transition-colors
  hover:bg-opacity-90 focus:ring-2 focus:ring-offset-2
  sm:px-6 md:text-lg
  ${variant === 'primary' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}
  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
`;
```

---

## 🔧 개발자 도구

### 컴포넌트 디버깅

```typescript
// 개발 모드에서만 실행되는 디버그 정보
if (process.env.NODE_ENV === 'development') {
  console.log('TreeComponent 렌더링:', {
    treeData: treeData.length,
    selectedFile,
    newlyCreatedItems: newlyCreatedItems.size,
    updatedItems: updatedItems.size
  });
}
```

### Props 타입 검증

```typescript
// PropTypes를 사용한 런타임 검증 (개발 모드)
import PropTypes from 'prop-types';

TreeComponent.propTypes = {
  treeData: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedFile: PropTypes.string,
  onFileSelect: PropTypes.func.isRequired,
  // ... 기타 props
};
```

---

**더 자세한 정보는 [개발 표준 가이드](../DEVELOPMENT_STANDARDS.md)를 참조하세요.**