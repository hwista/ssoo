import type { ReactNode } from 'react';

export interface SsooAiSearchViewerTocItem {
  id: string;
  text: string;
  level: number;
}

export interface SsooAiSearchViewerSearchControls {
  query: string;
  onQueryChange: (query: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  resultCount: number;
  currentResultIndex: number;
  hasSearched: boolean;
  onNavigateResult: (direction: 'prev' | 'next') => void;
  placeholder?: string;
}

export interface SsooAiSearchViewerTocControls {
  items?: SsooAiSearchViewerTocItem[];
  onItemClick?: (id: string) => void;
  label?: string;
  listStyle?: 'hierarchy' | 'flat';
}

export interface SsooAiSearchViewerZoomControls {
  level: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  show?: boolean;
}

export interface SsooAiSearchViewerAssistantControls {
  onAttach?: () => void;
  title?: string;
  filterControl?: ReactNode;
}

export type ViewerSearchControls = SsooAiSearchViewerSearchControls;
export type ViewerTocControls = SsooAiSearchViewerTocControls;
export type ViewerZoomControls = SsooAiSearchViewerZoomControls;
export type ViewerAssistantControls = SsooAiSearchViewerAssistantControls;
