'use client';

import { normalizeDocumentPath } from '@/lib/utils/linkUtils';

const DOCUMENT_EDIT_DRAFT_STORAGE_PREFIX = 'dms-document-edit-draft-v1';

export interface DocumentEditDraft {
  path: string;
  content: string;
  revisionSeq?: number;
  updatedAt: string;
}

export function buildDocumentEditDraftStorageKey(input: {
  userId?: string | null;
  tabId?: string | null;
  path?: string | null;
}): string | null {
  const userId = input.userId?.trim();
  const tabId = input.tabId?.trim();
  const path = normalizeDocumentPath(input.path ?? '');
  if (!userId || !tabId || !path) {
    return null;
  }

  return [
    DOCUMENT_EDIT_DRAFT_STORAGE_PREFIX,
    encodeURIComponent(userId),
    encodeURIComponent(tabId),
    encodeURIComponent(path),
  ].join(':');
}

export function readDocumentEditDraft(storageKey: string | null, expectedPath: string): DocumentEditDraft | null {
  if (!storageKey || typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(storageKey);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<DocumentEditDraft>;
    const normalizedPath = normalizeDocumentPath(parsed.path ?? '');
    if (
      normalizedPath !== normalizeDocumentPath(expectedPath)
      || typeof parsed.content !== 'string'
      || typeof parsed.updatedAt !== 'string'
    ) {
      return null;
    }

    return {
      path: normalizedPath,
      content: parsed.content,
      ...(typeof parsed.revisionSeq === 'number' ? { revisionSeq: parsed.revisionSeq } : {}),
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function writeDocumentEditDraft(storageKey: string | null, draft: Omit<DocumentEditDraft, 'updatedAt'>): void {
  if (!storageKey || typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify({
      ...draft,
      path: normalizeDocumentPath(draft.path),
      updatedAt: new Date().toISOString(),
    } satisfies DocumentEditDraft));
  } catch {
    // sessionStorage can be unavailable or full; the editor still keeps the in-memory draft.
  }
}

export function removeDocumentEditDraft(storageKey: string | null): void {
  if (!storageKey || typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    // noop
  }
}
