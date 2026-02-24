export type TemplateScope = 'global' | 'personal';
export type TemplateKind = 'document' | 'folder';

export interface TemplateItem {
  id: string;
  name: string;
  description?: string;
  scope: TemplateScope;
  kind: TemplateKind;
  content: string;
  updatedAt: string;
}

export interface TemplateStoreShape {
  global: TemplateItem[];
  personal: Record<string, TemplateItem[]>;
}
