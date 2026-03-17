import { docAssistService, type ApplyMode, type TitleAndPathResult } from '@/server/services/docAssist/DocAssistService';
import type { TemplateItem } from '@/types/template';

interface SummaryFileInput {
  id?: string;
  name: string;
  type?: string;
  textContent: string;
  images?: { base64: string; mimeType: string; name: string }[];
}

interface ComposeInput {
  instruction: string;
  currentContent: string;
  selectedText?: string;
  activeDocPath?: string;
  templates?: TemplateItem[];
  summaryFiles?: SummaryFileInput[];
}

export async function composeDocument(input: ComposeInput): Promise<{
  text: string;
  applyMode: ApplyMode;
  suggestedPath: string;
  relevanceWarnings: string[];
}> {
  return docAssistService.composeDocument(input);
}

export function recommendDocumentPath(input: Omit<ComposeInput, 'currentContent'>): {
  suggestedPath: string;
  relevanceWarnings: string[];
} {
  return docAssistService.recommendDocumentPath(input);
}

export async function recommendTitleAndPath(input: {
  currentContent: string;
  activeDocPath?: string;
}): Promise<TitleAndPathResult> {
  return docAssistService.recommendTitleAndPath(input);
}
