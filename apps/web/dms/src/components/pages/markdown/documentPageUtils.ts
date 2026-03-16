import type { TocItem } from '@/components/templates/page-frame';
import type { DocumentMetadata } from '@/types';
import type { DocumentSidecarMetadata } from './_components/DocumentSidecar';

export function getDocumentFilePath(tabPath: string | undefined): string | null {
  if (
    !tabPath ||
    tabPath === '/wiki/new' ||
    tabPath === '/wiki/new-wiki' ||
    tabPath === '/wiki/new-template' ||
    tabPath === '/wiki/new-ai-summary'
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
    createdAt: fileMetadata.createdAt || undefined,
    updatedAt: fileMetadata.modifiedAt || undefined,
    lineCount: content ? content.split('\n').length : 0,
    charCount: content ? content.length : 0,
    wordCount,
    attachments: documentMetadata?.sourceFiles || [],
  };
}

export function deriveDefaultTemplateName(content: string, fallbackPath: string): string {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading;

  const fallbackName = fallbackPath.split('/').pop()?.replace(/\.md$/i, '').trim();
  return fallbackName || '새 템플릿';
}
