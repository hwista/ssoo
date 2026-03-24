import type { TocItem } from '@/components/templates/page-frame';
import type { InlineSummaryFileItem } from '@/components/common/assistant/reference/Picker';
import type { DocumentMetadata, SourceFileMeta, DocumentComment } from '@/types';
import type { EditorCommandHandlers, SelectionRange, ComposeApplyMode } from './documentPageTypes';
import type { DocumentSidecarMetadata } from './_components/DocumentSidecar';

export interface DocumentSidecarDiffAttachment {
  name: string;
  path: string;
  type: string;
  origin?: SourceFileMeta['origin'];
  status?: SourceFileMeta['status'];
}

export interface DocumentSidecarDiffComment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface DocumentSidecarDiffSnapshot {
  title: string;
  summary: string;
  tags: string[];
  sourceLinks: string[];
  commentIds: string[];
  attachmentPaths: string[];
  sourceFiles: DocumentSidecarDiffAttachment[];
  comments: DocumentSidecarDiffComment[];
}

export function getDocumentFilePath(tabPath: string | undefined): string | null {
  if (
    !tabPath ||
    tabPath === '/doc/new' ||
    tabPath === '/doc/new-doc' ||
    tabPath === '/doc/new-template' ||
    tabPath === '/doc/new-ai-summary'
  ) return null;

  const path = tabPath.replace(/^\/doc\//, '');
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

export function buildMarkdownToc(content: string): TocItem[] {
  if (!content) return [];

  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const items: TocItem[] = [];
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = headingRegex.exec(content)) !== null) {
    items.push({
      id: `heading-${index++}`,
      level: match[1].length,
      text: match[2].trim(),
    });
  }

  return items;
}

export function buildDocumentSidecarMetadata(
  content: string,
  documentMetadata: DocumentMetadata | null,
  fileMetadata: {
    createdAt: Date | null;
    modifiedAt: Date | null;
  }
): DocumentSidecarMetadata {
  const wordCount = content ? content.trim().split(/\s+/).filter(Boolean).length : 0;

  return {
    author: documentMetadata?.author || 'Unknown',
    createdAt: fileMetadata.createdAt || new Date(),
    updatedAt: fileMetadata.modifiedAt || undefined,
    lastModifiedBy: documentMetadata?.lastModifiedBy || undefined,
    lineCount: content ? content.split('\n').length : 0,
    charCount: content ? content.length : 0,
    wordCount,
  };
}

export function deriveDefaultTemplateName(content: string, fallbackPath: string): string {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading;

  const fallbackName = fallbackPath.split('/').pop()?.replace(/\.md$/i, '').trim();
  return fallbackName || '새 템플릿';
}

function normalizeSourceFile(file: SourceFileMeta): DocumentSidecarDiffAttachment {
  return {
    name: file.name,
    path: file.path,
    type: file.type,
    origin: file.origin,
    status: file.status,
  };
}

function normalizeComment(comment: DocumentComment): DocumentSidecarDiffComment {
  return {
    id: comment.id,
    author: comment.author,
    content: comment.content,
    createdAt: comment.createdAt,
  };
}

export function buildDocumentSidecarDiffSnapshot(
  documentMetadata: DocumentMetadata | null | undefined
): DocumentSidecarDiffSnapshot {
  const sourceFiles = (documentMetadata?.sourceFiles ?? []).map(normalizeSourceFile);
  const comments = (documentMetadata?.comments ?? []).map(normalizeComment);

  return {
    title: documentMetadata?.title ?? '',
    summary: documentMetadata?.summary ?? '',
    tags: documentMetadata?.tags ?? [],
    sourceLinks: documentMetadata?.sourceLinks ?? [],
    commentIds: comments.map((comment) => comment.id),
    attachmentPaths: sourceFiles.map((file) => file.path || file.name),
    sourceFiles,
    comments,
  };
}

export function stringifyDocumentSidecarDiffSnapshot(snapshot: DocumentSidecarDiffSnapshot): string {
  return JSON.stringify(
    {
      title: snapshot.title,
      summary: snapshot.summary,
      tags: snapshot.tags,
      sourceLinks: snapshot.sourceLinks,
      sourceFiles: snapshot.sourceFiles,
      comments: snapshot.comments,
    },
    null,
    2
  );
}

export function mapSummaryFiles(summaryFiles: InlineSummaryFileItem[]) {
  return summaryFiles.map((item) => ({
    id: item.id,
    name: item.name,
    type: item.type,
    textContent: item.textContent,
    images: item.images,
  }));
}

export function buildComposedDocument(params: {
  applyMode: ComposeApplyMode;
  baseContent: string;
  generated: string;
  selection: SelectionRange;
  hasSelection: boolean;
}) {
  const { applyMode, baseContent, generated, selection, hasSelection } = params;

  if (applyMode === 'replace-document') {
    return generated;
  }

  if (applyMode === 'replace-selection' && hasSelection) {
    return `${baseContent.slice(0, selection.from)}${generated}${baseContent.slice(selection.to)}`;
  }

  if (applyMode === 'append') {
    const joiner = baseContent.trim().length > 0 ? '\n\n' : '';
    return `${baseContent}${joiner}${generated}`;
  }

  return `${baseContent.slice(0, selection.from)}${generated}${baseContent.slice(selection.from)}`;
}

export function applyGeneratedContent(params: {
  applyMode: ComposeApplyMode;
  baseContent: string;
  generated: string;
  selection: SelectionRange;
  hasSelection: boolean;
  editorHandlers: EditorCommandHandlers | null;
  setContent: (content: string) => void;
}) {
  const { applyMode, baseContent, generated, selection, hasSelection, editorHandlers, setContent } = params;
  const nextContent = buildComposedDocument({
    applyMode,
    baseContent,
    generated,
    selection,
    hasSelection,
  });

  if (applyMode === 'replace-document') {
    if (editorHandlers?.insertAt) {
      editorHandlers.insertAt(0, baseContent.length, generated);
    } else {
      setContent(nextContent);
    }
    return nextContent;
  }

  if (applyMode === 'replace-selection' && hasSelection) {
    if (editorHandlers?.insertAt) {
      editorHandlers.insertAt(selection.from, selection.to, generated);
    } else {
      setContent(nextContent);
    }
    return nextContent;
  }

  if (applyMode === 'append') {
    const joiner = baseContent.trim().length > 0 ? '\n\n' : '';
    if (editorHandlers?.insertAt) {
      editorHandlers.insertAt(baseContent.length, baseContent.length, `${joiner}${generated}`);
    } else {
      setContent(nextContent);
    }
    return nextContent;
  }

  if (editorHandlers?.insertAt) {
    editorHandlers.insertAt(selection.from, selection.from, generated);
  } else {
    setContent(nextContent);
  }

  return nextContent;
}
