export type DocumentOrientation = 'portrait' | 'landscape';

export const DOCUMENT_WIDTHS: Record<DocumentOrientation, number> = {
  portrait: 975,
  landscape: 1380,
};

export const DEFAULT_DOCUMENT_ORIENTATION: DocumentOrientation = 'portrait';
