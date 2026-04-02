export type TemplateScope = 'global' | 'personal';
export type TemplateKind = 'document' | 'folder';
/** shared = system template (always visible), public = marketplace (others can scrape), private = 나만보기 */
export type TemplateVisibility = 'shared' | 'public' | 'private';
export type TemplateStatus = 'active' | 'archived';
export type TemplateSourceType = 'markdown-file';
export type TemplateOriginType = 'referenced' | 'generated';

export interface TemplateReferenceDoc {
  path: string;
  title?: string;
  source?: 'manual' | 'picker' | 'assistant' | 'current-document' | 'template-selected';
  kind?: 'document' | 'file';
  provider?: string;
  mimeType?: string;
  size?: number;
  storage?: 'path' | 'inline';
  textContent?: string;
  tempId?: string;
}

export interface TemplateGeneration {
  source: 'ai' | 'manual';
  taskKey?: string;
  profileKey?: string;
}

/** Entry in personal/manifest/{userId}.json for scraped templates */
export interface ScrapeEntry {
  templateId: string;
  scope: 'system' | 'personal';
  ownerId: string;
  /** Future: git commit hash at time of scraping, for pinned-version reading */
  gitCommitHash?: string;
  scrapedAt: string;
}

/** Shape of personal/manifest/{userId}.json */
export interface UserTemplateManifest {
  owned: string[];
  scraped: ScrapeEntry[];
}

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
  summary?: string;
  tags?: string[];
  createdAt?: string;
  author?: string;
  lastModifiedBy?: string;
  originType?: TemplateOriginType;
  referenceDocuments?: TemplateReferenceDoc[];
  generation?: TemplateGeneration;
}
