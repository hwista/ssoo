// ============================================
// File Types
// 파일 관련 타입 정의
// ============================================

/**
 * 파일 노드 타입 (PMS MenuItem 대응)
 */
export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  // 확장 속성
  size?: number;
  lastModified?: Date;
  permissions?: FilePermissions;
}

/**
 * 파일 확장자 타입
 */
export type FileType = 'md' | 'txt' | 'json' | 'js' | 'ts' | 'css' | 'tsx' | 'html' | 'xml';

/**
 * 파일 권한
 */
export interface FilePermissions {
  readable: boolean;
  writable: boolean;
  executable: boolean;
}

/**
 * 파일 메타정보
 */
export interface FileMetadata {
  path: string;
  name: string;
  type: FileType;
  size: number;
  lastModified: Date;
  isDirectory: boolean;
}

/**
 * 파일 이벤트 (실시간 감시용)
 */
export interface FileEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir' | 'connected';
  path?: string;
  metadata?: FileMetadata;
  timestamp: number;
}

/**
 * 파일 엔트리 (API용)
 */
export interface FileEntry {
  type: 'file';
  name: string;
  path: string;
  metadata?: FileMetadata;
}

/**
 * 디렉토리 엔트리 (API용)
 */
export interface DirectoryEntry {
  type: 'directory';
  name: string;
  path: string;
  children: (FileEntry | DirectoryEntry)[];
}

/**
 * 파일 트리 타입
 */
export type FileTreeNode = FileEntry | DirectoryEntry;
export type FileTree = FileTreeNode[];

/**
 * 책갈피 아이템 (PMS FavoriteMenuItem 대응)
 */
export interface BookmarkItem {
  id: string;
  title: string;
  path: string;
  icon?: string;
  addedAt: Date;
}
