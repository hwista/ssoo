export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  lastModified?: Date;
  /** 문서 메타데이터에서 읽은 제목. 없으면 name으로 fallback. */
  title?: string;
}
