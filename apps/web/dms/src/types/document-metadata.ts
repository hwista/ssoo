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
  origin?: 'manual' | 'ingest' | 'teams' | 'network_drive';
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
  content: string;
  createdAt: string;
}

export interface DocumentMetadata {
  title: string;
  summary: string;
  tags: string[];
  sourceLinks: string[];
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
