/**
 * 통합 콘텐츠 메타데이터 타입 (discriminated union)
 *
 * 기존 2개 타입을 하나로 통합:
 * - DocumentMetadata (문서 사이드카)
 * - TemplateSidecarData (템플릿 사이드카)
 *
 * 베이스: DocumentMetadata 구조
 * .sidecar.json 파일에 contentType 필드로 구분
 */

import type { ReferenceFile } from './reference-file';
import type {
  TemplateScope,
  TemplateKind,
  TemplateVisibility,
  TemplateStatus,
  TemplateSourceType,
  TemplateOriginType,
  TemplateGeneration,
} from './template';
import type {
  DocumentAcl,
  DocumentVersionEntry,
  DocumentComment,
  BodyLink,
} from './document-metadata';

export type ContentType = 'document' | 'template';

/** 공통 기반 필드 (7개 공유 + referenceFiles) */
export interface ContentMetadataBase {
  contentType: ContentType;
  title: string;
  summary?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt: string;
  author?: string;
  lastModifiedBy?: string;
  /** 통합 참조 파일 목록 (sourceFiles + referenceDocuments 통합) */
  referenceFiles?: ReferenceFile[];
}

/** 문서 확장 (문서 전용 필드) */
export interface DocumentContentMetadata extends ContentMetadataBase {
  contentType: 'document';
  sourceLinks?: string[];
  bodyLinks?: BodyLink[];
  fileHashes?: {
    content: string;
    sources: Record<string, string>;
  };
  chunkIds?: string[];
  embeddingModel?: string;
  acl?: DocumentAcl;
  versionHistory?: DocumentVersionEntry[];
  comments?: DocumentComment[];
  templateId?: string;
}

/** 템플릿 확장 (템플릿 전용 필드) */
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

/** 통합 콘텐츠 메타데이터 (discriminated union) */
export type ContentMetadata = DocumentContentMetadata | TemplateContentMetadata;

/** ContentMetadata가 문서인지 체크하는 타입 가드 */
export function isDocumentMetadata(
  metadata: ContentMetadata,
): metadata is DocumentContentMetadata {
  return metadata.contentType === 'document';
}

/** ContentMetadata가 템플릿인지 체크하는 타입 가드 */
export function isTemplateMetadata(
  metadata: ContentMetadata,
): metadata is TemplateContentMetadata {
  return metadata.contentType === 'template';
}
