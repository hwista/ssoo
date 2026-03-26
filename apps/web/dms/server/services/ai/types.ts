export interface SearchResultItem {
  id: string;
  title: string;
  excerpt: string;
  path: string;
  score: number;
  summary?: string;
  snippets?: string[];
  totalSnippetCount?: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  contextMode?: 'doc' | 'deep';
  confidence?: 'high' | 'medium' | 'low';
  citations?: Array<{
    title: string;
    storageUri: string;
    versionId?: string;
    webUrl?: string;
  }>;
}

export interface AskResponse {
  query: string;
  answer: string;
  sources: SearchResultItem[];
  confidence: 'high' | 'medium' | 'low';
  citations: Array<{
    title: string;
    storageUri: string;
    versionId?: string;
    webUrl?: string;
  }>;
}

export interface AiContextOptions {
  contextMode?: 'doc' | 'deep';
  activeDocPath?: string;
}

export type HandlerResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; status: number };
