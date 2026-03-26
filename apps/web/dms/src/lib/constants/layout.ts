import type { DocumentType } from '@/types/layout';

export const BREAKPOINTS = {
  mobile: 768,
  desktop: 768,
} as const;

export const LAYOUT_SIZES = {
  sidebar: {
    expandedWidth: 340,
  },
  header: {
    height: 60,
  },
  tabBar: {
    height: 36,
    containerHeight: 53,
    tabMinWidth: 120,
    tabMaxWidth: 200,
  },
} as const;

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  doc: 'DOC',
  dev: 'DEV',
} as const;
