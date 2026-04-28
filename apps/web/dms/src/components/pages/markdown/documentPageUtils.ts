import type { TocItem } from '@/components/templates/page-frame';
import { stringifyJson } from '@/lib/utils';
import type { DocumentMetadata, SourceFileMeta, DocumentComment } from '@/types';
import type { AuthIdentity } from '@ssoo/types/common';
import type { DocumentPanelMetadata } from './_components/DocumentPanel';

export interface DocumentMetadataDiffAttachment {
  name: string;
  path: string;
  type: string;
  origin?: SourceFileMeta['origin'];
  status?: SourceFileMeta['status'];
}

export interface DocumentMetadataDiffComment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface DocumentMetadataDiffSnapshot {
  title: string;
  summary: string;
  tags: string[];
  sourceLinks: string[];
  commentIds: string[];
  attachmentPaths: string[];
  sourceFiles: DocumentMetadataDiffAttachment[];
  comments: DocumentMetadataDiffComment[];
}

export type DocumentAclRole = 'owner' | 'editor' | 'viewer' | 'open' | 'none';

function resolveSubjects(currentUser: AuthIdentity | null | undefined): string[] {
  return [currentUser?.userId, currentUser?.loginId]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

function matchesSubjects(subjects: string[], candidates: Array<string | undefined>): boolean {
  const candidateSet = new Set(
    candidates
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value)),
  );

  return subjects.some((subject) => candidateSet.has(subject));
}

function hasAclEntries(documentMetadata: DocumentMetadata | null | undefined): boolean {
  const owners = documentMetadata?.acl?.owners ?? [];
  const editors = documentMetadata?.acl?.editors ?? [];
  const viewers = documentMetadata?.acl?.viewers ?? [];
  return owners.length > 0 || editors.length > 0 || viewers.length > 0;
}

function hasActiveUserGrant(
  documentMetadata: DocumentMetadata | null | undefined,
  currentUser: AuthIdentity | null | undefined,
  roles: Array<'read' | 'write' | 'manage'>,
): boolean {
  const subjects = resolveSubjects(currentUser);
  if (subjects.length === 0) {
    return false;
  }

  return (documentMetadata?.grants ?? []).some((grant) => (
    grant.principalType === 'user'
    && roles.includes(grant.role)
    && subjects.includes(grant.principalId)
    && (!grant.expiresAt || Date.parse(grant.expiresAt) >= Date.now())
  ));
}

export function getDocumentFilePath(tabPath: string | undefined): string | null {
  if (
    !tabPath ||
    tabPath === '/doc/new' ||
    tabPath === '/doc/new-doc' ||
    tabPath === '/doc/new-template' ||
    tabPath === '/doc/new-ai-summary'
  ) return null;

  const pathWithoutQuery = tabPath.split('?')[0];
  const path = pathWithoutQuery.replace(/^\/doc\//, '');
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

export function getDocumentHighlightQuery(tabPath: string | undefined): string | null {
  if (!tabPath) return null;
  const queryStart = tabPath.indexOf('?');
  if (queryStart < 0) return null;
  try {
    const params = new URLSearchParams(tabPath.slice(queryStart));
    const highlight = params.get('highlight');
    return highlight?.trim() || null;
  } catch {
    return null;
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

export function resolveDocumentAclRole(
  documentMetadata: DocumentMetadata | null | undefined,
  currentUser: AuthIdentity | null | undefined,
): DocumentAclRole {
  const acl = documentMetadata?.acl;
  const subjects = resolveSubjects(currentUser);
  const hasModernAccessConfig = Boolean(
    documentMetadata?.ownerId
    || documentMetadata?.ownerLoginId
    || documentMetadata?.visibility?.scope
    || (documentMetadata?.grants ?? []).length > 0
  );
  const isLegacyOpen = !hasModernAccessConfig && !hasAclEntries(documentMetadata);
  const isOwner = matchesSubjects(
    subjects,
    [documentMetadata?.ownerId, documentMetadata?.ownerLoginId, ...(acl?.owners ?? [])],
  );
  const hasReadGrant = hasActiveUserGrant(documentMetadata, currentUser, ['read', 'write', 'manage']);
  const hasWriteGrant = hasActiveUserGrant(documentMetadata, currentUser, ['write', 'manage']);
  const visibilityReadable = documentMetadata?.visibility?.scope === 'public';

  if (isOwner) {
    return 'owner';
  }

  if (
    hasWriteGrant
    || subjects.some((subject) => (acl?.editors ?? []).includes(subject))
  ) {
    return 'editor';
  }

  if (
    visibilityReadable
    || hasReadGrant
    || subjects.some((subject) => (acl?.viewers ?? []).includes(subject))
  ) {
    return 'viewer';
  }

  if (isLegacyOpen) {
    return 'open';
  }

  return 'none';
}

export function canEditDocument(
  documentMetadata: DocumentMetadata | null | undefined,
  currentUser: AuthIdentity | null | undefined,
): boolean {
  const role = resolveDocumentAclRole(documentMetadata, currentUser);
  return role === 'open'
    || role === 'owner'
    || role === 'editor'
    || hasActiveUserGrant(documentMetadata, currentUser, ['write', 'manage']);
}

export function canManageDocument(
  documentMetadata: DocumentMetadata | null | undefined,
  currentUser: AuthIdentity | null | undefined,
): boolean {
  const role = resolveDocumentAclRole(documentMetadata, currentUser);
  return role === 'open'
    || role === 'owner'
    || hasActiveUserGrant(documentMetadata, currentUser, ['manage']);
}

export function buildDocumentPanelMetadata(
  content: string,
  documentMetadata: DocumentMetadata | null,
  fileMetadata: {
    createdAt: Date | null;
    modifiedAt: Date | null;
  }
): DocumentPanelMetadata {
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

function normalizeSourceFile(file: SourceFileMeta): DocumentMetadataDiffAttachment {
  return {
    name: file.name,
    path: file.path,
    type: file.type ?? 'application/octet-stream',
    origin: file.origin,
    status: file.status,
  };
}

function normalizeComment(comment: DocumentComment): DocumentMetadataDiffComment {
  return {
    id: comment.id,
    author: comment.author,
    content: comment.content,
    createdAt: comment.createdAt,
  };
}

export function buildDocumentMetadataDiffSnapshot(
  documentMetadata: DocumentMetadata | null | undefined
): DocumentMetadataDiffSnapshot {
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

export function stringifyDocumentMetadataDiffSnapshot(snapshot: DocumentMetadataDiffSnapshot): string {
  return stringifyJson({
    title: snapshot.title,
    summary: snapshot.summary,
    tags: snapshot.tags,
    sourceLinks: snapshot.sourceLinks,
    sourceFiles: snapshot.sourceFiles,
    comments: snapshot.comments,
  });
}
