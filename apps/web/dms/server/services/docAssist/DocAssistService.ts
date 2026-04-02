import { generateText, streamText, type ModelMessage, type TextPart, type FilePart } from 'ai';
import { getChatModel } from '@/server/services/ai';
import { fileSystemService } from '@/server/services/fileSystem/FileSystemService';
import { logger } from '@/lib/utils/errorUtils';
import type { TemplateItem } from '@/types/template';
import type { FileNode } from '@/types/file-tree';
import { buildComposeSystemPrompt } from './prompts';

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
  contentType?: 'document' | 'template';
}

export type ApplyMode = 'replace-document' | 'replace-selection' | 'append' | 'insert';

interface RecommendTitleAndPathInput {
  currentContent: string;
  activeDocPath?: string;
  directoryTree?: string[];
  existingFiles?: string[];
  contentType?: 'document' | 'template';
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

function buildFallbackTitle(content: string): string {
  const firstLine = content.split('\n').find((line) => line.trim().length > 0) ?? '';
  const fallbackTitle = firstLine.replace(/^#+\s*/, '').slice(0, 60).trim();
  return fallbackTitle || '새 문서';
}

function buildFallbackFileName(title: string): string {
  const fallbackFileName = title
    .replace(/[^\w가-힣\s-]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join('-')
    .toLowerCase();

  return fallbackFileName ? `${fallbackFileName}.md` : 'new-doc.md';
}

function ensureUniqueFileName(directory: string, fileName: string, existingFiles: string[]): string {
  const fullPath = directory ? `${directory}/${fileName}` : fileName;
  if (!fileName || !existingFiles.includes(fullPath)) return fileName;

  const base = fileName.replace(/\.md$/, '');
  return `${base}-${Date.now().toString(36).slice(-4)}.md`;
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

      const systemPrompt = buildComposeSystemPrompt({
        applyMode,
        hasTemplate: !!documentTemplate,
        hasAttachments: !!summaryContext,
        hasImages,
        contentType: input.contentType,
      });

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
        maxOutputTokens: 4096,
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

  async composeDocumentStream(input: ComposeInput, signal?: AbortSignal): Promise<{
    stream: ReadableStream<string>;
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
      const emptyStream = new ReadableStream<string>({
        start(controller) { controller.close(); },
      });
      return {
        stream: emptyStream,
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
    const imageParts = collectImages(boundedFiles);
    const hasImages = imageParts.length > 0;

    const model = await getChatModel();
    logger.info('doc-assist compose stream request', {
      instructionLength: instruction.length,
      currentContentLength: input.currentContent.length,
      selectedTextLength: selectedText.length,
      templateCount: documentTemplate ? 1 : 0,
      summaryFileCount: boundedFiles.length,
      imageCount: imageParts.length,
    });

    const systemPrompt = buildComposeSystemPrompt({
      applyMode,
      hasTemplate: !!documentTemplate,
      hasAttachments: !!summaryContext,
      hasImages,
      contentType: input.contentType,
    });

    const userContentParts: (TextPart | FilePart)[] = [];
    const textPrompt = [
      `[지시]\n${instruction}`,
      selectedText ? `[선택 텍스트]\n${selectedText}` : '',
      `[현재 문서 편집 맥락]\n${boundedCurrentContent}`,
      templateContext ? `[문서 템플릿]\n${templateContext}` : '',
      summaryContext ? `[요약 첨부 컨텍스트]\n${summaryContext}` : '',
    ].filter(Boolean).join('\n\n');

    userContentParts.push({ type: 'text', text: textPrompt });
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

    const result = streamText({
      model,
      messages,
      maxOutputTokens: 4096,
      abortSignal: signal,
      onError: (error: unknown) => {
        if (signal?.aborted) return;
        const err = error instanceof Error ? error : (error as Record<string, unknown>)?.error;
        const errObj = err instanceof Error ? err : null;
        logger.error('doc-assist compose stream error', {
          message: errObj?.message ?? String(error),
        });
      },
    });

    const textStream = result.textStream;
    const stream = new ReadableStream<string>({
      async start(controller) {
        try {
          for await (const chunk of textStream) {
            if (signal?.aborted) break;
            controller.enqueue(chunk);
          }
        } catch (error) {
          if (signal?.aborted) return;
          logger.error('doc-assist compose stream iteration error', error);
        } finally {
          controller.close();
        }
      },
    });

    return {
      stream,
      applyMode,
      suggestedPath: recommendPath(input),
      relevanceWarnings: buildRelevanceWarnings(instruction, input.summaryFiles ?? []),
    };
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
    const isTemplate = input.contentType === 'template';
    const defaultDir = isTemplate ? 'templates/personal' : 'drafts';
    const defaultFileName = isTemplate ? 'new-template.md' : 'new-doc.md';
    const entityLabel = isTemplate ? '템플릿' : '문서';

    if (!content) {
      return { suggestedTitle: isTemplate ? '새 템플릿' : '새 문서', suggestedDirectory: defaultDir, suggestedFileName: defaultFileName };
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
              `당신은 ${entityLabel} 관리 AI입니다.`,
              `주어진 ${entityLabel} 내용을 분석하여 적절한 ${entityLabel}명, 저장 디렉토리, 파일명을 추천하세요.`,
              '반드시 JSON만 출력하세요. 다른 설명 없이 JSON만 반환하세요.',
              `출력 형식: {"title":"${entityLabel} 제목","directory":"저장/경로","fileName":"파일명.md"}`,
              '규칙:',
              `- title: ${entityLabel} 내용을 대표하는 한국어 제목 (간결하게)`,
              '- directory: 기존 디렉토리 구조를 참고하여 적절한 위치 선택. 해당하는 디렉토리가 없으면 새 경로 제안 가능.',
              '- fileName: 영문 kebab-case + .md 확장자. 기존 파일과 중복되지 않도록 주의.',
              `- 기존 디렉토리가 비어있으면 ${defaultDir}/ 를 기본 디렉토리로 사용.`,
              ...(isTemplate ? [
                '- 이 문서는 재사용 가능한 템플릿입니다. 제목에 "템플릿"이 포함되도록 하고, 용도를 나타내는 이름을 부여하세요.',
              ] : []),
            ].join('\n'),
          },
          {
            role: 'user',
            content: `[${entityLabel} 내용]\n${boundedContent}${dirsContext}${filesContext}`,
          },
        ],
        maxOutputTokens: 200,
      });

      const text = result.text.trim();
      // JSON 파싱 (코드 펜스 제거)
      const jsonStr = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      const parsed = JSON.parse(jsonStr);

      const fallbackTitle = buildFallbackTitle(content);
      const title = typeof parsed.title === 'string' && parsed.title.trim()
        ? parsed.title.trim()
        : fallbackTitle;
      let fileName = typeof parsed.fileName === 'string' ? parsed.fileName.trim() : '';
      if (fileName && !fileName.endsWith('.md')) fileName += '.md';
      if (!fileName) {
        fileName = buildFallbackFileName(title);
      }

      // 중복 파일명 체크
      const dir = typeof parsed.directory === 'string' ? parsed.directory.trim() : defaultDir;
      fileName = ensureUniqueFileName(dir || defaultDir, fileName, existingFiles);

      return {
        suggestedTitle: title,
        suggestedDirectory: dir || defaultDir,
        suggestedFileName: fileName,
      };
    } catch (error) {
      logger.error('doc-assist recommendTitleAndPath failed', error);
      const fallbackTitle = buildFallbackTitle(content);
      const fallbackFileName = ensureUniqueFileName(
        defaultDir,
        buildFallbackFileName(fallbackTitle),
        existingFiles,
      );
      return {
        suggestedTitle: fallbackTitle,
        suggestedDirectory: defaultDir,
        suggestedFileName: fallbackFileName,
      };
    }
  }
}

export const docAssistService = new DocAssistService();
