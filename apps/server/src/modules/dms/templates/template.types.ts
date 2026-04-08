import type {
  TemplateGeneration,
  TemplateOriginType,
  TemplateReferenceDoc,
  TemplateItem,
  TemplateScope,
  TemplateSourceType,
  TemplateStatus,
  TemplateVisibility,
} from '@ssoo/types/dms';

export interface StoredTemplateItem extends Omit<TemplateItem, 'content'> {
  content?: string;
}

export interface TemplateSidecarData {
  id: string;
  name: string;
  description?: string;
  summary?: string;
  tags?: string[];
  createdAt?: string;
  scope: TemplateScope;
  kind: TemplateItem['kind'];
  updatedAt: string;
  author?: string;
  lastModifiedBy?: string;
  ownerId: string;
  visibility: TemplateVisibility;
  status: TemplateStatus;
  sourceType: TemplateSourceType;
  originType?: TemplateOriginType;
  referenceDocuments?: TemplateReferenceDoc[];
  generation?: TemplateGeneration;
}
