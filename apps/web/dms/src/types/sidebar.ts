export type SidebarSection = 'bookmarks' | 'openTabs' | 'fileTree' | 'changes';

export interface SidebarState {
  expandedSections: SidebarSection[];
  searchQuery: string;
  expandedFolders: Set<string>;
  isCompactMode: boolean;
  sidebarOpen: boolean;
}

export interface SidebarActions {
  toggleSection: (section: SidebarSection) => void;
  setExpandedSections: (sections: SidebarSection[]) => void;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  toggleFolder: (path: string) => void;
  expandFolder: (path: string) => void;
  collapseFolder: (path: string) => void;
  collapseAllFolders: () => void;
  setCompactMode: (isCompact: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}
