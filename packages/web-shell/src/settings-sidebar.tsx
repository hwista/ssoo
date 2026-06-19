'use client';

import type { ReactNode } from 'react';
import {
  SsooSidebarState,
  SsooSidebarTree,
  SsooSidebarTreeStatusBadge,
  type SsooSidebarBadgeTone,
  type SsooSidebarIcon,
  type SsooSidebarSurfaceSection,
  type SsooSidebarTreeNodeState,
} from './sidebar';

export type SsooSettingsSidebarSearchEntryTone = Extract<SsooSidebarBadgeTone, 'primary' | 'muted' | 'neutral'>;

export interface SsooSettingsSidebarSectionConfig {
  id: string;
  title: string;
  icon: SsooSidebarIcon;
  expanded: boolean;
  onToggle: () => void;
  emptyText: ReactNode;
}

export interface CreateSsooSettingsSidebarSectionsOptions<TSearchEntry, TMenuNode> {
  showSearchResults: boolean;
  searchSection: SsooSettingsSidebarSectionConfig;
  menuSection: SsooSettingsSidebarSectionConfig;
  searchResults: readonly TSearchEntry[];
  menuNodes: readonly TMenuNode[];
  disclosureIcon: SsooSidebarIcon;
  getSearchEntryId: (entry: TSearchEntry) => string;
  getSearchEntryTitle: (entry: TSearchEntry) => ReactNode;
  getSearchEntrySubtitle?: (entry: TSearchEntry) => string | undefined;
  getSearchEntryKindLabel: (entry: TSearchEntry) => ReactNode;
  getSearchEntryKindTone?: (entry: TSearchEntry) => SsooSettingsSidebarSearchEntryTone;
  isSearchEntryActive?: (entry: TSearchEntry) => boolean;
  onSearchEntrySelect: (entry: TSearchEntry) => void | Promise<void>;
  getMenuNodeId: (node: TMenuNode) => string;
  getMenuNodeLabel: (node: TMenuNode) => ReactNode;
  getMenuNodeTitle?: (node: TMenuNode) => string | undefined;
  getMenuNodeChildren?: (node: TMenuNode) => readonly TMenuNode[] | undefined;
  getMenuNodeIcon?: (node: TMenuNode, state: SsooSidebarTreeNodeState) => SsooSidebarIcon | undefined;
  isMenuNodeFolder?: (node: TMenuNode) => boolean;
  isMenuNodeExpanded?: (node: TMenuNode) => boolean;
  isMenuNodeActive?: (node: TMenuNode) => boolean;
  getMenuNodeStatusLabel?: (node: TMenuNode, state: SsooSidebarTreeNodeState) => ReactNode;
  getMenuNodeStatusTone?: (node: TMenuNode, state: SsooSidebarTreeNodeState) => SsooSidebarBadgeTone;
  renderMenuNodeTrailingAction?: (node: TMenuNode, state: SsooSidebarTreeNodeState) => ReactNode;
  onMenuNodeSelect: (node: TMenuNode, state: SsooSidebarTreeNodeState) => void | Promise<void>;
}

export function createSsooSettingsSidebarSections<TSearchEntry, TMenuNode>({
  showSearchResults,
  searchSection,
  menuSection,
  searchResults,
  menuNodes,
  disclosureIcon,
  getSearchEntryId,
  getSearchEntryTitle,
  getSearchEntrySubtitle,
  getSearchEntryKindLabel,
  getSearchEntryKindTone,
  isSearchEntryActive,
  onSearchEntrySelect,
  getMenuNodeId,
  getMenuNodeLabel,
  getMenuNodeTitle,
  getMenuNodeChildren,
  getMenuNodeIcon,
  isMenuNodeFolder,
  isMenuNodeExpanded,
  isMenuNodeActive,
  getMenuNodeStatusLabel,
  getMenuNodeStatusTone,
  renderMenuNodeTrailingAction,
  onMenuNodeSelect,
}: CreateSsooSettingsSidebarSectionsOptions<TSearchEntry, TMenuNode>): SsooSidebarSurfaceSection[] {
  if (showSearchResults) {
    return [
      {
        id: searchSection.id,
        title: searchSection.title,
        icon: searchSection.icon,
        expanded: searchSection.expanded,
        onToggle: searchSection.onToggle,
        children: searchResults.length > 0 ? (
          <SsooSidebarTree<TSearchEntry>
            nodes={searchResults}
            getNodeId={getSearchEntryId}
            getNodeLabel={getSearchEntryTitle}
            getNodeTitle={getSearchEntrySubtitle}
            getNodeIcon={() => searchSection.icon}
            isNodeActive={isSearchEntryActive}
            renderNodeTrailingAction={(entry) => (
              <SsooSidebarTreeStatusBadge tone={getSearchEntryKindTone?.(entry) ?? 'muted'}>
                {getSearchEntryKindLabel(entry)}
              </SsooSidebarTreeStatusBadge>
            )}
            onNodeSelect={onSearchEntrySelect}
            disclosureIcon={disclosureIcon}
          />
        ) : (
          <SsooSidebarState>{searchSection.emptyText}</SsooSidebarState>
        ),
      },
    ];
  }

  return [
    {
      id: menuSection.id,
      title: menuSection.title,
      icon: menuSection.icon,
      expanded: menuSection.expanded,
      onToggle: menuSection.onToggle,
      children: menuNodes.length > 0 ? (
        <SsooSidebarTree<TMenuNode>
          nodes={menuNodes}
          getNodeId={getMenuNodeId}
          getNodeLabel={getMenuNodeLabel}
          getNodeTitle={getMenuNodeTitle}
          getNodeChildren={getMenuNodeChildren}
          getNodeIcon={getMenuNodeIcon}
          isNodeFolder={isMenuNodeFolder}
          isNodeExpanded={isMenuNodeExpanded}
          isNodeActive={isMenuNodeActive}
          renderNodeTrailingAction={(node, state) => {
            const customAction = renderMenuNodeTrailingAction?.(node, state);
            if (customAction) return customAction;
            const statusLabel = getMenuNodeStatusLabel?.(node, state);
            if (!statusLabel) return null;
            return (
              <SsooSidebarTreeStatusBadge tone={getMenuNodeStatusTone?.(node, state) ?? 'muted'}>
                {statusLabel}
              </SsooSidebarTreeStatusBadge>
            );
          }}
          onNodeSelect={onMenuNodeSelect}
          disclosureIcon={disclosureIcon}
        />
      ) : (
        <SsooSidebarState>{menuSection.emptyText}</SsooSidebarState>
      ),
    },
  ];
}
