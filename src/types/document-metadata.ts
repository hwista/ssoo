export interface DocumentAcl {
  owners: string[];
  editors: string[];
  viewers: string[];
}

export interface SourceFileMeta {
  name: string;
  path: string;
  type: string;
  size: number;
  url?: string;
  storageUri?: string;
  provider?: 'local' | 'sharepoint' | 'nas';
  versionId?: string;
  etag?: string;
  checksum?: string;
  origin?: 'manual' | 'ingest' | 'teams' | 'network_drive' | 'reference' | 'template';
  status?: 'draft' | 'pending_confirm' | 'published';
}

export interface DocumentVersionEntry {
  id: string;
  createdAt: string;
  author: string;
  summary: string;
}

export interface DocumentComment {
  id: string;
  author: string;
  email?: string;
  avatarUrl?: string;
  content: string;
  createdAt: string;
  parentId?: string;
  deletedAt?: string;
}

export interface BodyLink {
  url: string;
  label: string;
  /** 'link' = 일반 링크, 'image' = 이미지 링크 */
  type: 'link' | 'image';
}

export interface DocumentMetadata {
  title: string;
  summary: string;
  tags: string[];
  sourceLinks: string[];
  bodyLinks: BodyLink[];
  createdAt: string;
  updatedAt: string;
  fileHashes: {
    content: string;
    sources: Record<string, string>;
  };
  chunkIds: string[];
  embeddingModel: string;
  sourceFiles: SourceFileMeta[];
  acl: DocumentAcl;
  versionHistory: DocumentVersionEntry[];
  comments: DocumentComment[];
  templateId: string;
  author: string;
  lastModifiedBy: string;
}
