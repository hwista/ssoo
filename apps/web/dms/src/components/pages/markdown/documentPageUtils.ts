import type { TocItem } from '@/components/templates/page-frame';
import type { DocumentMetadata, SourceFileMeta, DocumentComment } from '@/types';
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

export function resolveSaveDisplayName(
  metadata: DocumentMetadata | null,
  fallbackContent: string,
  fallbackPath: string,
): string {
  return metadata?.title?.trim() || deriveDefaultTemplateName(fallbackContent, fallbackPath);
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
