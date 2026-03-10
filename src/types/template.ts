export type TemplateScope = 'global' | 'personal';
export type TemplateKind = 'document' | 'folder';
export type TemplateVisibility = 'shared' | 'personal';
export type TemplateStatus = 'active' | 'archived';
export type TemplateSourceType = 'markdown-file';

export interface TemplateItem {
  id: string;
  name: string;
  description?: string;
  scope: TemplateScope;
  kind: TemplateKind;
  content: string;
  updatedAt: string;
  ownerId?: string;
  visibility?: TemplateVisibility;
  status?: TemplateStatus;
  sourceType?: TemplateSourceType;
  sourcePath?: string;
}

export interface StoredTemplateItem extends Omit<TemplateItem, 'content'> {
  content?: string;
}

export interface TemplateStoreShape {
  global: StoredTemplateItem[];
  personal: Record<string, StoredTemplateItem[]>;
}
