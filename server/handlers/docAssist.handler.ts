import { docAssistService, type ApplyMode } from '@/server/services/docAssist/DocAssistService';
import type { TemplateItem } from '@/types/template';

interface SummaryFileInput {
  id?: string;
  name: string;
  type?: string;
  textContent: string;
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
