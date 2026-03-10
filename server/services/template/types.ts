import type {
  TemplateItem,
  TemplateScope,
  TemplateSourceType,
  TemplateStatus,
  TemplateVisibility,
} from '@/types/template';

export interface StoredTemplateItem extends Omit<TemplateItem, 'content'> {
  content?: string;
}

export interface TemplateStoreShape {
  global: StoredTemplateItem[];
  personal: Record<string, StoredTemplateItem[]>;
}

export interface TemplateSidecarData {
  id: string;
  name: string;
  description?: string;
  scope: TemplateScope;
  kind: TemplateItem['kind'];
  updatedAt: string;
  ownerId: string;
  visibility: TemplateVisibility;
  status: TemplateStatus;
  sourceType: TemplateSourceType;
}
