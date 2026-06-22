import { SSOO_CONTENT_PAGE_METRICS } from '@ssoo/web-shell';

export type DocumentOrientation = 'portrait' | 'landscape';

export const DOCUMENT_WIDTHS: Record<DocumentOrientation, number> = {
  portrait: SSOO_CONTENT_PAGE_METRICS.mainContentWidthPx,
  landscape: SSOO_CONTENT_PAGE_METRICS.landscapeContentWidthPx,
};

export const DEFAULT_DOCUMENT_ORIENTATION: DocumentOrientation = 'portrait';
