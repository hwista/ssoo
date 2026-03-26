import type { TocItem } from '@/components/templates/page-frame';

export interface ViewerSearchControls {
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

export interface ViewerTocControls {
  items?: TocItem[];
  onItemClick?: (id: string) => void;
  label?: string;
  listStyle?: 'hierarchy' | 'flat';
}

export interface ViewerZoomControls {
  level: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  show?: boolean;
}

export interface ViewerAssistantControls {
  onAttach?: () => void;
  title?: string;
  filterControl?: React.ReactNode;
}
