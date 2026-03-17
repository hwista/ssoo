import { generateText, type ModelMessage, type TextPart, type FilePart } from 'ai';
import { getChatModel } from '@/server/services/ai';
import { fileSystemService } from '@/server/services/fileSystem/FileSystemService';
import { logger } from '@/lib/utils/errorUtils';
import type { TemplateItem } from '@/types/template';
import type { FileNode } from '@/types/file-tree';

interface ImageInput {
  base64: string;
  mimeType: string;
  name: string;
}

interface SummaryFileInput {
  id?: string;
  name: string;
  type?: string;
  textContent: string;
  images?: ImageInput[];
}

interface ComposeInput {
  instruction: string;
  currentContent: string;
  selectedText?: string;
  activeDocPath?: string;
  templates?: TemplateItem[];
  summaryFiles?: SummaryFileInput[];
}

export type ApplyMode = 'replace-document' | 'replace-selection' | 'append' | 'insert';

interface RecommendTitleAndPathInput {
  currentContent: string;
  activeDocPath?: string;
  directoryTree?: string[];
  existingFiles?: string[];
}

export interface TitleAndPathResult {
  suggestedTitle: string;
  suggestedDirectory: string;
  suggestedFileName: string;
}

const MAX_CURRENT_CONTENT_CHARS = 6000;
const MAX_TEMPLATE_CHARS = 1500;
const MAX_SUMMARY_FILE_COUNT = 2;
const MAX_SUMMARY_FILE_CHARS = 2000;
const MAX_IMAGES_PER_REQUEST = 5;

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9가-힣]+/g)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
}

function buildRelevanceWarnings(instruction: string, files: SummaryFileInput[]): string[] {
  if (files.length === 0) return [];
  const baseTerms = new Set(tokenize(instruction));
  const minOverlap = baseTerms.size <= 3 ? 1 : 2;
  const warnings: string[] = [];

  for (const file of files) {
    const hasImages = (file.images?.length ?? 0) > 0;
    const terms = tokenize(file.textContent).slice(0, 200);
    const overlap = terms.filter((term) => baseTerms.has(term)).length;
    // 이미지가 있는 파일은 텍스트 기반 관련성 경고를 완화
    if (overlap < minOverlap && !hasImages) {
      warnings.push(`'${file.name}' 파일은 현재 지시와의 연결이 약해 보여 결과 품질이 떨어질 수 있습니다.`);
    }
  }
  return warnings;
}

function recommendPath(input: ComposeInput): string {
  if (input.activeDocPath && input.activeDocPath.trim().length > 0) {
    return input.activeDocPath;
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

function collectImages(files: SummaryFileInput[]): FilePart[] {
  const parts: FilePart[] = [];
  for (const file of files) {
    if (!file.images) continue;
    for (const img of file.images) {
      if (parts.length >= MAX_IMAGES_PER_REQUEST) break;
      parts.push({
        type: 'file',
        data: Buffer.from(img.base64, 'base64'),
        mediaType: img.mimeType,
      });
    }
  }
  return parts;
}

function flattenTree(nodes: FileNode[], prefix = ''): { dirs: string[]; files: string[] } {
  const dirs: string[] = [];
  const files: string[] = [];
  for (const node of nodes) {
    const path = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.type === 'directory') {
      dirs.push(path);
      if (node.children) {
        const sub = flattenTree(node.children, path);
        dirs.push(...sub.dirs);
        files.push(...sub.files);
      }
    } else {
      files.push(path);
    }
  }
  return { dirs, files };
}

class DocAssistService {
  async composeDocument(input: ComposeInput): Promise<{
    text: string;
    applyMode: ApplyMode;
    suggestedPath: string;
    relevanceWarnings: string[];
  }> {
    const instruction = input.instruction.trim();
    if (instruction.length === 0) {
      throw new Error('instruction은 필수입니다.');
    }

    const selectedText = input.selectedText?.trim() ?? '';
    const instructionLower = instruction.toLowerCase();
    const shouldClearDocument = /(내용\s*다\s*지워|전체\s*삭제|전부\s*삭제|모두\s*삭제|문서\s*비워|전체\s*비워|싹\s*지워)/.test(instructionLower);
    if (!selectedText && shouldClearDocument) {
      return {
        text: '',
        applyMode: 'replace-document',
        suggestedPath: recommendPath(input),
        relevanceWarnings: buildRelevanceWarnings(instruction, input.summaryFiles ?? []),
      };
    }

    const applyMode: ApplyMode = selectedText
      ? 'replace-selection'
      : /(추가|append|덧붙|이어써|하단)/.test(instructionLower)
        ? 'append'
        : 'insert';
    const documentTemplate = (input.templates ?? []).find((item) => item.kind === 'document');
    const boundedCurrentContent = input.currentContent.slice(0, MAX_CURRENT_CONTENT_CHARS);
    const templateContext = documentTemplate
      ? `${documentTemplate.name}\n${documentTemplate.content.slice(0, MAX_TEMPLATE_CHARS)}`
      : '';
    const boundedFiles = (input.summaryFiles ?? []).slice(0, MAX_SUMMARY_FILE_COUNT);
    const summaryContext = boundedFiles
      .map((file, index) => `[요약 첨부 ${index + 1}: ${file.name}]\n${file.textContent.slice(0, MAX_SUMMARY_FILE_CHARS)}`)
      .join('\n\n---\n\n');

    // 첨부 파일에서 이미지 수집
    const imageParts = collectImages(boundedFiles);
    const hasImages = imageParts.length > 0;

    try {
      const model = await getChatModel();
      logger.info('doc-assist compose request', {
        instructionLength: instruction.length,
        currentContentLength: input.currentContent.length,
        boundedCurrentContentLength: boundedCurrentContent.length,
        selectedTextLength: selectedText.length,
        templateCount: documentTemplate ? 1 : 0,
        summaryFileCount: boundedFiles.length,
        imageCount: imageParts.length,
      });

      const systemPrompt = [
        '당신은 문서 편집 AI입니다.',
        '반드시 한국어 마크다운만 출력하세요.',
        '설명 문장, 머리말, 코드펜스 없이 결과 본문만 반환하세요.',
        summaryContext || hasImages
          ? '요약 첨부 컨텍스트가 있으면 그 안의 정보(텍스트와 이미지 포함)만 근거로 작성하세요. 첨부에 없는 사실을 보충하거나 추정하지 마세요.'
          : '제공된 지시와 편집 맥락만 사용해 작성하세요.',
        documentTemplate
          ? '문서 템플릿이 있으면 제목 체계, 섹션 구조, 문서 형식을 반드시 따르세요. 템플릿과 충돌하는 임의 형식으로 바꾸지 마세요.'
          : '문서 템플릿이 없으면 지시에 맞는 가장 자연스러운 마크다운 구조를 선택하세요.',
        (summaryContext || hasImages) && documentTemplate
          ? '요약 첨부 컨텍스트는 내용의 근거이고, 문서 템플릿은 출력 형식의 기준입니다. 두 역할을 혼동하지 마세요.'
          : '',
        hasImages
          ? '첨부된 이미지를 주의 깊게 분석하고, 이미지에 포함된 차트, 다이어그램, 표 등의 정보를 문서에 반영하세요.'
          : '',
        applyMode === 'replace-selection'
          ? '선택 텍스트를 지시에 맞춰 치환할 결과만 반환하세요.'
          : applyMode === 'append'
            ? '현재 문서 하단에 추가할 신규 블록만 반환하세요.'
            : applyMode === 'insert'
              ? '지시에 맞는 새 콘텐츠만 반환하세요. 기존 문서 내용을 반복하거나 전체를 반환하지 마세요.'
              : '현재 문서를 지시에 맞게 수정한 완성본 전체를 반환하세요.',
      ].filter(Boolean).join('\n');

      // 멀티모달 메시지 구성: 텍스트 + 이미지
      const userContentParts: (TextPart | FilePart)[] = [];

      const textPrompt = [
        `[지시]\n${instruction}`,
        selectedText ? `[선택 텍스트]\n${selectedText}` : '',
        `[현재 문서 편집 맥락]\n${boundedCurrentContent}`,
        templateContext ? `[문서 템플릿]\n${templateContext}` : '',
        summaryContext ? `[요약 첨부 컨텍스트]\n${summaryContext}` : '',
      ].filter(Boolean).join('\n\n');

      userContentParts.push({ type: 'text', text: textPrompt });

      // 이미지가 있으면 멀티모달 메시지로, 없으면 텍스트 전용
      if (hasImages) {
        userContentParts.push(
          { type: 'text', text: '\n[첨부 이미지 — 아래 이미지들을 분석하여 문서 작성에 활용하세요]' },
          ...imageParts,
        );
      }

      const messages: ModelMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContentParts },
      ];

      const result = await generateText({
        model,
        messages,
        maxOutputTokens: 1200,
      });

      return {
        text: result.text.trim(),
        applyMode,
        suggestedPath: recommendPath(input),
        relevanceWarnings: buildRelevanceWarnings(instruction, input.summaryFiles ?? []),
      };
    } catch (error) {
      logger.error('doc-assist compose failed', error, {
        instructionLength: instruction.length,
        currentContentLength: input.currentContent.length,
        selectedTextLength: selectedText.length,
        templateCount: documentTemplate ? 1 : 0,
        summaryFileCount: input.summaryFiles?.length ?? 0,
        imageCount: imageParts.length,
      });
      throw error;
    }
  }

  recommendDocumentPath(input: Omit<ComposeInput, 'currentContent'>): {
    suggestedPath: string;
    relevanceWarnings: string[];
  } {
    return {
      suggestedPath: recommendPath({ ...input, currentContent: '' }),
      relevanceWarnings: buildRelevanceWarnings(input.instruction, input.summaryFiles ?? []),
    };
  }

  async recommendTitleAndPath(input: RecommendTitleAndPathInput): Promise<TitleAndPathResult> {
    const content = input.currentContent.trim();
    if (!content) {
      return { suggestedTitle: '', suggestedDirectory: 'drafts', suggestedFileName: '' };
    }

    // 디렉토리 트리와 기존 파일 목록 가져오기
    let dirs = input.directoryTree ?? [];
    let existingFiles = input.existingFiles ?? [];

    if (dirs.length === 0 || existingFiles.length === 0) {
      try {
        const treeResult = await fileSystemService.getFileTree();
        if (treeResult.success && treeResult.data) {
          const flat = flattenTree(treeResult.data);
          if (dirs.length === 0) dirs = flat.dirs;
          if (existingFiles.length === 0) existingFiles = flat.files;
        }
      } catch {
        // fallback: use empty lists
      }
    }

    const boundedContent = content.slice(0, 3000);
    const dirsContext = dirs.length > 0
      ? `\n\n[기존 디렉토리 구조]\n${dirs.slice(0, 50).join('\n')}`
      : '';
    const filesContext = existingFiles.length > 0
      ? `\n\n[기존 파일 목록 (중복 방지용)]\n${existingFiles.slice(0, 100).join('\n')}`
      : '';

    try {
      const model = await getChatModel();
      const result = await generateText({
        model,
        messages: [
          {
            role: 'system',
            content: [
              '당신은 문서 관리 AI입니다.',
              '주어진 문서 내용을 분석하여 적절한 문서명, 저장 디렉토리, 파일명을 추천하세요.',
              '반드시 JSON만 출력하세요. 다른 설명 없이 JSON만 반환하세요.',
              '출력 형식: {"title":"문서 제목","directory":"저장/경로","fileName":"파일명.md"}',
              '규칙:',
              '- title: 문서 내용을 대표하는 한국어 제목 (간결하게)',
              '- directory: 기존 디렉토리 구조를 참고하여 적절한 위치 선택. 해당하는 디렉토리가 없으면 새 경로 제안 가능.',
              '- fileName: 영문 kebab-case + .md 확장자. 기존 파일과 중복되지 않도록 주의.',
              '- 기존 디렉토리가 비어있으면 drafts/ 를 기본 디렉토리로 사용.',
            ].join('\n'),
          },
          {
            role: 'user',
            content: `[문서 내용]\n${boundedContent}${dirsContext}${filesContext}`,
          },
        ],
        maxOutputTokens: 200,
      });

      const text = result.text.trim();
      // JSON 파싱 (코드 펜스 제거)
      const jsonStr = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      const parsed = JSON.parse(jsonStr);

      let fileName = typeof parsed.fileName === 'string' ? parsed.fileName.trim() : '';
      if (fileName && !fileName.endsWith('.md')) fileName += '.md';

      // 중복 파일명 체크
      const dir = typeof parsed.directory === 'string' ? parsed.directory.trim() : 'drafts';
      const fullPath = dir ? `${dir}/${fileName}` : fileName;
      if (fileName && existingFiles.includes(fullPath)) {
        const base = fileName.replace(/\.md$/, '');
        fileName = `${base}-${Date.now().toString(36).slice(-4)}.md`;
      }

      return {
        suggestedTitle: typeof parsed.title === 'string' ? parsed.title.trim() : '',
        suggestedDirectory: dir || 'drafts',
        suggestedFileName: fileName,
      };
    } catch (error) {
      logger.error('doc-assist recommendTitleAndPath failed', error);
      // Fallback: 첫 줄에서 제목 추출
      const firstLine = content.split('\n').find((l) => l.trim().length > 0) ?? '';
      const fallbackTitle = firstLine.replace(/^#+\s*/, '').slice(0, 60).trim();
      const fallbackFileName = fallbackTitle
        .replace(/[^\w가-힣\s-]/g, '')
        .trim()
        .split(/\s+/)
        .slice(0, 4)
        .join('-')
        .toLowerCase();
      return {
        suggestedTitle: fallbackTitle || '새 문서',
        suggestedDirectory: 'drafts',
        suggestedFileName: fallbackFileName ? `${fallbackFileName}.md` : '',
      };
    }
  }
}

export const docAssistService = new DocAssistService();
