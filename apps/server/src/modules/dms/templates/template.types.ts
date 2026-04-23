import type {
  TemplateGeneration,
  TemplateItem,
  TemplateOriginType,
  TemplateReferenceDoc,
  TemplateScope,
  TemplateSourceType,
  TemplateStatus,
  TemplateVisibility,
} from '@ssoo/types/dms';

export interface StoredTemplateItem extends Omit<TemplateItem, 'content'> {
  content?: string;
}

export interface TemplateMetadataRecord {
  id: string;
  name: string;
  description?: string;
  summary?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt: string;
  author?: string;
  lastModifiedBy?: string;
  scope: TemplateScope;
  kind: TemplateItem['kind'];
  ownerId: string;
  visibility: TemplateVisibility;
  status: TemplateStatus;
  sourceType: TemplateSourceType;
  originType?: TemplateOriginType;
  referenceDocuments?: TemplateReferenceDoc[];
  generation?: TemplateGeneration;
}
