import { generateText } from 'ai';
import { getChatModel } from '@/server/services/ai';
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

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9가-힣]+/g)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
}

function buildRelevanceWarnings(instruction: string, files: SummaryFileInput[]): string[] {
  if (files.length <= 1) return [];
  const baseTerms = new Set(tokenize(instruction));
  const warnings: string[] = [];

  for (const file of files) {
    const terms = tokenize(file.textContent).slice(0, 80);
    const overlap = terms.filter((term) => baseTerms.has(term)).length;
    if (overlap < 2) {
      warnings.push(`'${file.name}' 파일은 현재 지시와 연관성이 낮아 보입니다.`);
    }
  }
  return warnings;
}

function recommendPath(input: ComposeInput): string {
  if (input.activeDocPath && input.activeDocPath.trim().length > 0) {
    return input.activeDocPath;
  }

  const folderTemplate = (input.templates ?? []).find((item) => item.kind === 'folder');
  if (folderTemplate) {
    const firstLine = folderTemplate.content
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.endsWith('/'));
    if (firstLine) return `${firstLine.replace(/\/+$/, '')}/new-doc.md`;
  }

  const title = input.instruction
    .replace(/[^\w가-힣\s/-]/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join('-')
    .toLowerCase();
  return `drafts/${title || 'new-doc'}.md`;
}

export async function composeDocument(input: ComposeInput): Promise<{
  text: string;
  suggestedPath: string;
  relevanceWarnings: string[];
}> {
  const instruction = input.instruction.trim();
  if (instruction.length === 0) {
    throw new Error('instruction은 필수입니다.');
  }

  const selectedText = input.selectedText?.trim() ?? '';
  const documentTemplates = (input.templates ?? []).filter((item) => item.kind === 'document');
  const summaryContext = (input.summaryFiles ?? [])
    .slice(0, 4)
    .map((file, index) => `[요약 첨부 ${index + 1}: ${file.name}]\n${file.textContent.slice(0, 4000)}`)
    .join('\n\n---\n\n');

  const model = await getChatModel();
  const result = await generateText({
    model,
    system: [
      '당신은 문서 편집 AI입니다.',
      '반드시 한국어 마크다운만 출력하세요.',
      '설명 문장, 머리말, 코드펜스 없이 결과 본문만 반환하세요.',
      '지시가 수정이면 선택 텍스트를 우선 반영하고, 없으면 기존 문맥에 자연스럽게 이어지게 작성하세요.',
    ].join('\n'),
    prompt: [
      `[지시]\n${instruction}`,
      selectedText ? `[선택 텍스트]\n${selectedText}` : '',
      `[현재 문서]\n${input.currentContent.slice(0, 12000)}`,
      documentTemplates.length > 0
        ? `[문서 템플릿]\n${documentTemplates.map((item) => `${item.name}\n${item.content}`).join('\n\n')}`
        : '',
      summaryContext ? `[요약 첨부 컨텍스트]\n${summaryContext}` : '',
    ].filter(Boolean).join('\n\n'),
    maxOutputTokens: 1800,
  });

  return {
    text: result.text.trim(),
    suggestedPath: recommendPath(input),
    relevanceWarnings: buildRelevanceWarnings(instruction, input.summaryFiles ?? []),
  };
}

export function recommendDocumentPath(input: Omit<ComposeInput, 'currentContent'>): {
  suggestedPath: string;
  relevanceWarnings: string[];
} {
  return {
    suggestedPath: recommendPath({ ...input, currentContent: '' }),
    relevanceWarnings: buildRelevanceWarnings(input.instruction, input.summaryFiles ?? []),
  };
}
