import type {
  SearchCitation,
  SearchConfidence,
  SearchContextMode,
  SearchResultItem,
} from './search';

export type AskContextMode = SearchContextMode | 'attachments-only';

export interface AskMessagePart {
  type: string;
  text?: string;
}

export interface AskMessageInput {
  role: string;
  content?: string;
  parts?: AskMessagePart[];
}

export interface AskTemplateInput {
  name: string;
  content: string;
}

export interface AskRequest {
  query?: string;
  messages?: AskMessageInput[];
  contextMode?: AskContextMode;
  activeDocPath?: string;
  templates?: AskTemplateInput[];
  stream?: boolean;
}

export interface AskResponse {
  query: string;
  answer: string;
  sources: SearchResultItem[];
  confidence: SearchConfidence;
  citations: SearchCitation[];
}
