/**
 * 파일 시스템 관련 타입 정의
 * 파일/폴더 구조, 메타정보, 파일 작업 등
 */

// 📄 기본 파일 노드 (기존 3곳 중복 → 1곳 통합)
export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  // 확장 속성 (향후 추가 가능)
  size?: number;
  lastModified?: Date;
  permissions?: FilePermissions;
}

// 📂 파일 타입 확장 (기존 타입과 호환성 유지)
export type FileType = 'md' | 'txt' | 'json' | 'js' | 'ts' | 'css' | 'tsx' | 'html' | 'xml';

// 🔐 파일 권한 (미래 확장용)
export interface FilePermissions {
  readable: boolean;
  writable: boolean;
  executable: boolean;
}

// 📊 파일 메타정보
export interface FileMetadata {
  path: string;
  name: string;
  type: FileType;
  size: number;
  lastModified: Date;
  isDirectory: boolean;
}

// 🔄 파일 이벤트 (실시간 감시용)
export interface FileEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir' | 'connected';
  path?: string;
  metadata?: FileMetadata;
  timestamp: number;
}

// 🗂️ API 전용 파일 엔트리 (기존 API 내부 타입 통합)
export interface FileEntry {
  type: 'file';
  name: string;
  path: string;
  metadata?: FileMetadata;
}

export interface DirectoryEntry {
  type: 'directory';
  name: string;
  path: string;
  children: (FileEntry | DirectoryEntry)[];
}

// 📁 파일 트리 관련
export type FileTreeNode = FileEntry | DirectoryEntry;
export type FileTree = FileTreeNode[];