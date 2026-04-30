import type {
  BodyLink,
  DocumentAcl,
  DocumentComment,
  DocumentPathHistoryEntry,
  DocumentPermissionGrant,
  DocumentVisibility,
  SourceFileMeta,
} from './document-metadata';
import type {
  TemplateGeneration,
  TemplateKind,
  TemplateOriginType,
  TemplateScope,
  TemplateSourceType,
  TemplateStatus,
  TemplateVisibility,
} from './template';

export type ContentType = 'document' | 'template';

export interface ContentMetadataBase {
  contentType: ContentType;
  title: string;
  summary?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt: string;
  author?: string;
  lastModifiedBy?: string;
  sourceFiles?: SourceFileMeta[];
  referenceFiles?: SourceFileMeta[];
}

export interface DocumentContentMetadata extends ContentMetadataBase {
  contentType: 'document';
  documentId?: string;
  sourceLinks?: string[];
  bodyLinks?: BodyLink[];
  relativePath?: string;
  pathHistory?: DocumentPathHistoryEntry[];
  visibility?: DocumentVisibility;
  grants?: DocumentPermissionGrant[];
  revisionSeq?: number;
  contentHash?: string;
  fileHashes?: {
    content: string;
    sources: Record<string, string>;
  };
  chunkIds?: string[];
  embeddingModel?: string;
  acl?: DocumentAcl;
  comments?: DocumentComment[];
  templateId?: string;
  ownerId?: string;
  ownerLoginId?: string;
}

export interface TemplateContentMetadata extends ContentMetadataBase {
  contentType: 'template';
  id?: string;
  name?: string;
  description?: string;
  scope?: TemplateScope;
  kind?: TemplateKind;
  ownerId?: string;
  visibility?: TemplateVisibility;
  status?: TemplateStatus;
  sourceType?: TemplateSourceType;
  originType?: TemplateOriginType;
  generation?: TemplateGeneration;
}

export type ContentMetadata = DocumentContentMetadata | TemplateContentMetadata;
