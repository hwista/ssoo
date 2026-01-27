export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  target: FileNode | null;
  type: 'file' | 'folder' | 'empty';
  id: string;
  isRendering?: boolean;
}

export interface ContextMenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
  separator?: boolean;
}

export type FileType = 'md' | 'txt' | 'json' | 'js' | 'ts' | 'css';

export interface CreateDialogState {
  type: 'file' | 'folder';
  parentPath?: string;
}

// 이름 변경 상태 타입
export interface RenamingState {
  path: string;
  newName: string;
}

// 모달 상태 타입
export interface CreateModalState {
  isOpen: boolean;
  mode: 'file' | 'folder';
  initialPath: string;
}

// 파일 생성 파라미터 타입
export interface CreateFileParams {
  name: string;
  extension: string;
  path: string;
  type: 'file' | 'folder';
}

// 파일 메타데이터 타입
export interface FileMetadata {
  createdAt: Date | null;
  modifiedAt: Date | null;
  size: number | null;
}

// Wiki Context에서 사용할 상태 인터페이스
export interface WikiState {
  // 파일 시스템 상태
  files: FileNode[];
  content: string;
  isEditing: boolean;
  fileMetadata: FileMetadata;
  
  // UI 상태
  sidebarWidth: number;
  newlyCreatedItems: Set<string>;
  updatedItems: Set<string>;
  
  // 모달 및 메뉴 상태
  renamingItem: RenamingState | null;
  createModal: CreateModalState;
  contextMenu: ContextMenuState | null;
  
  // 로딩 및 에러 상태
  isLoading: boolean;
  error: string | null;
}

// Wiki Context 액션 인터페이스
export interface WikiActions {
  // 파일 시스템 액션
  loadFileTree: () => Promise<void>;
  refreshFileTree: () => Promise<void>;
  loadFile: (path: string) => Promise<void>;
  saveFile: (path: string, content: string) => Promise<void>;
  saveFileKeepEditing: (path: string, content: string) => Promise<void>;
  refreshFileMetadata: (path: string) => Promise<void>;
  createFile: (params: CreateFileParams) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  
  // 상태 업데이트 액션
  setContent: (content: string) => void;
  setIsEditing: (editing: boolean) => void;
  setSidebarWidth: (width: number) => void;
  
  // 항목 상태 관리
  addNewlyCreatedItem: (path: string) => void;
  removeNewlyCreatedItem: (path: string) => void;
  addUpdatedItem: (path: string) => void;
  removeUpdatedItem: (path: string) => void;
  
  // 모달 및 메뉴 액션
  setRenamingItem: (item: RenamingState | null) => void;
  setCreateModal: (modal: CreateModalState) => void;
  setContextMenu: (menu: ContextMenuState | null) => void;
  
  // 에러 처리
  setError: (error: string | null) => void;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
}

// Wiki Context 전체 타입
export interface WikiContextType extends WikiState, WikiActions {}

// Context Provider Props 타입
export interface WikiProviderProps {
  children: React.ReactNode;
}