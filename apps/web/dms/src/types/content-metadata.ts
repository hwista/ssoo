import type {
  ContentMetadata,
  DocumentContentMetadata,
  TemplateContentMetadata,
} from '@ssoo/types/dms';

export type {
  ContentMetadataBase,
  ContentType,
  ContentMetadata,
  DocumentContentMetadata,
  TemplateContentMetadata,
} from '@ssoo/types/dms';

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
