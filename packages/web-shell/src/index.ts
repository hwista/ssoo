export {
  getSsooAppIdentity,
  getSsooAppMetadata,
  SSOO_APP_IDENTITIES,
} from './app-identity';
export type {
  SsooAppIdentity,
  SsooAppKey,
  SsooAppMetadata,
} from './app-identity';

export {
  getSsooAppIconResponse,
  buildSsooAppIconHref,
  buildSsooAppIconSvg,
  getSsooAppDefaultIconColor,
  normalizeSsooIconAccentColor,
  resolveSsooAppIconAccentColor,
  SSOO_APP_ICON_COLOR_PARAM,
  SSOO_APP_ICON_CONTENT_TYPE,
  SSOO_APP_ICON_DESCRIPTOR,
  SSOO_APP_ICON_PATH,
  SSOO_APP_ICON_SIZES,
  SSOO_APP_ICON_SVG,
} from './app-icon';
export type {
  SsooAppIconDescriptor,
  SsooAppIconHrefOptions,
  SsooAppIconMode,
  SsooAppIconSvgOptions,
} from './app-icon';

export { SsooFaviconSync } from './favicon-sync';
export type { SsooFaviconSyncProps } from './favicon-sync';

export { SSOO_SHELL_METRICS } from './shell-metrics';
export type { SsooShellMetrics } from './shell-metrics';

export {
  getSsooAppDefaultThemeKey,
  getSsooThemePreset,
  SSOO_APP_DEFAULT_THEME_KEYS,
  SSOO_THEME_PRESETS,
} from './theme';
export type {
  SsooThemePreset,
  SsooThemePresetKey,
} from './theme';

export { SsooAppFrame, resolveSsooAppFrameMainOffset } from './app-frame';
export type { SsooAppFrameMode, SsooAppFrameProps } from './app-frame';

export { SsooWorkbenchShell } from './workbench-shell';
export type { SsooWorkbenchShellProps } from './workbench-shell';

export {
  SSOO_GLOBAL_SEARCH_APP_PATH,
  SSOO_GLOBAL_SEARCH_PLACEHOLDER,
  SsooGlobalSearchPage,
  SsooGlobalSearchResultCard,
} from './global-search';
export type {
  SsooGlobalSearchBadge,
  SsooGlobalSearchBlockedSourceReason,
  SsooGlobalSearchBlockedSourceSummary,
  SsooGlobalSearchEntityFacet,
  SsooGlobalSearchEntityType,
  SsooGlobalSearchHistoryItem,
  SsooGlobalSearchPageProps,
  SsooGlobalSearchPermissionState,
  SsooGlobalSearchRanker,
  SsooGlobalSearchRequest,
  SsooGlobalSearchResponse,
  SsooGlobalSearchResult,
  SsooGlobalSearchResultRenderState,
  SsooGlobalSearchSourceApp,
  SsooGlobalSearchSourceFacet,
  SsooGlobalSearchTarget,
} from './global-search';

export {
  AiPanel,
  SsooAiPanel,
} from './ai-search/AiPanel';
export type {
  AiPanelProps,
  SsooAiPanelProps,
} from './ai-search/AiPanel';
export {
  SsooAiSearchPage,
} from './ai-search/AiSearchPage';
export type {
  SsooAiSearchPageProps,
  SsooAiSearchResponse,
  SsooAiSearchTopSlotContext,
} from './ai-search/AiSearchPage';
export {
  SearchResultsPanel,
  SsooAiSearchResultsPanel,
} from './ai-search/SearchResultsPanel';
export type {
  SsooAiSearchResultRenderState,
  SsooAiSearchResultsPanelProps,
} from './ai-search/SearchResultsPanel';
export {
  buildHistoryItems,
  buildSearchTocItems,
  getTopSearchKeywords,
  rankSearchResults,
  tokenizeHighlightTerms,
} from './ai-search/searchPageUtils';
export type {
  SearchBlockedSourceSummary,
  SearchResultItem,
  SsooAiSearchBlockedSourceReason,
  SsooAiSearchBlockedSourceSummary,
  SsooAiSearchHistoryItem,
  SsooAiSearchHistorySourceItem,
  SsooAiSearchResultItem,
  SsooAiSearchTocItem,
} from './ai-search/searchPageUtils';
export {
  DEFAULT_ZOOM,
  SsooAiSearchToolbar,
  Toolbar,
  ZOOM_LEVELS,
} from './ai-search/toolbar/Toolbar';
export type {
  SsooAiSearchToolbarProps,
  ToolbarProps,
} from './ai-search/toolbar/Toolbar';
export {
  ToolbarSearchControls,
  SsooAiSearchToolbarSearchControls,
} from './ai-search/toolbar/SearchControls';
export {
  ToolbarTocMenu,
  SsooAiSearchToolbarTocMenu,
} from './ai-search/toolbar/TocMenu';
export {
  ToolbarZoomControls,
  SsooAiSearchToolbarZoomControls,
} from './ai-search/toolbar/ZoomControls';
export type {
  SsooAiSearchViewerAssistantControls,
  SsooAiSearchViewerSearchControls,
  SsooAiSearchViewerTocControls,
  SsooAiSearchViewerTocItem,
  SsooAiSearchViewerZoomControls,
  ViewerAssistantControls,
  ViewerSearchControls,
  ViewerTocControls,
  ViewerZoomControls,
} from './ai-search/toolbar/toolbarTypes';

export { SsooSourceFilterBar } from './source-filter-bar';
export type {
  SsooSourceFilterBarProps,
  SsooSourceFilterItem,
} from './source-filter-bar';

export {
  SSOO_HEADER_PRIMARY_ACTION_MIN_WIDTH,
  SSOO_HEADER_SEARCH_PLACEHOLDER,
  SSOO_HEADER_USER_MENU_DROPDOWN_WIDTH,
  SsooAppHeader,
  SsooHeader,
  SsooHeaderActionButton,
  SsooHeaderIconButton,
  SsooHeaderNotificationButton,
  SsooHeaderSearchBox,
  SsooHeaderUserMenuLoadingState,
} from './header';
export type {
  SsooAppHeaderActionDescriptor,
  SsooAppHeaderNotificationDescriptor,
  SsooAppHeaderProps,
  SsooAppHeaderUserMenuContext,
  SsooAppHeaderUserMenuSlot,
  SsooHeaderActionButtonProps,
  SsooHeaderIconButtonProps,
  SsooHeaderLeadingDescriptor,
  SsooHeaderMode,
  SsooHeaderNotificationBadge,
  SsooHeaderNotificationButtonProps,
  SsooHeaderProps,
  SsooHeaderSearchBoxProps,
  SsooHeaderUserMenuLoadingStateProps,
} from './header';

export {
  createSsooGlobalSearchOpenRequest,
  createSsooGlobalSearchPath,
  getSsooGlobalSearchQueryFromPath,
  getSsooGlobalSearchTitle,
  useSsooGlobalHeaderSearch,
} from './global-header-search';
export type {
  SsooGlobalSearchOpenRequest,
  UseSsooGlobalHeaderSearchOptions,
  UseSsooGlobalHeaderSearchResult,
} from './global-header-search';

export {
  SsooTabBarControlButton,
  SsooTabBarCloseButton,
  SsooTabBarHomeButton,
  SsooTabBarIcon,
  SsooTabBarItem,
  SsooTabBarStatusDot,
  SsooMdiTabBar,
} from './tabbar';
export type {
  SsooMdiTabBarProps,
  SsooMdiTabDescriptor,
  SsooMdiTabRenderState,
  SsooTabBarCloseButtonProps,
  SsooTabBarControlButtonProps,
  SsooTabBarHomeButtonProps,
  SsooTabBarIconProps,
  SsooTabBarIconSize,
  SsooTabBarIconTone,
  SsooTabBarItemProps,
  SsooTabBarStatusDotProps,
  SsooTabBarStatusDotTone,
} from './tabbar';

export {
  SsooContentAreaEmptyState,
  SsooContentAreaState,
  SsooContentAreaSurface,
  SsooMdiContentArea,
  SsooMdiContentPane,
} from './content-area';
export type {
  SsooContentAreaEmptyStateProps,
  SsooContentAreaPadding,
  SsooContentAreaScroll,
  SsooContentAreaStateProps,
  SsooContentAreaStateVariant,
  SsooContentAreaSurfaceProps,
  SsooContentAreaTone,
  SsooMdiContentAreaProps,
  SsooMdiContentPaneProps,
} from './content-area';

export {
  SSOO_CONTENT_PAGE_ADAPTER_NAMES,
  createSsooContentPageAdapterElement,
  createSsooContentPageTemplateElement,
  defineSsooMdiPageRegistry,
  defineSsooMdiPageRoute,
  resolveSsooMdiPageRoute,
  SsooContentPageAdapterBoundary,
  SsooRegisteredMdiContentArea,
} from './mdi-page-registry';
export type {
  SsooContentPageAdapterName,
  SsooContentPageAdapterBoundaryProps,
  SsooMdiContentPageAdapterElement,
  SsooMdiContentPageAdapterRoute,
  SsooMdiContentPageElement,
  SsooMdiContentPageRoute,
  SsooMdiContentPageRouteBase,
  SsooMdiContentPageTemplateElement,
  SsooMdiContentPageTemplateContract,
  SsooMdiContentPageTemplateRoute,
  SsooMdiPageRoute,
  SsooMdiPageRouteKind,
  SsooMdiPageRouteMatchState,
  SsooMdiPageRouteRenderState,
  SsooRegisteredMdiContentAreaProps,
} from './mdi-page-registry';

export {
  SSOO_ROUTE_POLICY_MATCHER,
  SSOO_SHARED_USER_SURFACE_PATH_PREFIX,
  isSsooSharedUserSurfacePath,
  isSsooRoutePolicyAllowed,
  resolveSsooRoutePolicyDecision,
} from './route-policy';
export type {
  SsooRoutePolicyDecision,
  SsooRoutePolicyMode,
  SsooRoutePolicyOptions,
} from './route-policy';

export {
  SsooSettingsBanner,
  SsooSettingsMainPanel,
  SsooSettingsPendingSummary,
  SsooSettingsSurface,
  SsooSettingsViewModeTabs,
} from './settings-surface';
export type {
  SsooSettingsBannerProps,
  SsooSettingsBannerTone,
  SsooSettingsMainPanelProps,
  SsooSettingsPendingSummaryProps,
  SsooSettingsSurfaceProps,
  SsooSettingsViewModeOption,
  SsooSettingsViewModeTabsProps,
} from './settings-surface';
export { createSsooSettingsSidebarSections } from './settings-sidebar';
export type {
  CreateSsooSettingsSidebarSectionsOptions,
  SsooSettingsSidebarSearchEntryTone,
  SsooSettingsSidebarSectionConfig,
} from './settings-sidebar';

export { SsooPageBreadcrumb } from './page-breadcrumb';
export type {
  SsooPageBreadcrumbItem,
  SsooPageBreadcrumbProps,
} from './page-breadcrumb';

export { SsooPageHeader } from './page-header';
export type {
  SsooPageHeaderAction,
  SsooPageHeaderActionVariant,
  SsooPageHeaderIconSlots,
  SsooPageHeaderMode,
  SsooPageHeaderProps,
} from './page-header';

export { SsooPageChromeStack } from './page-chrome';
export type { SsooPageChromeStackProps } from './page-chrome';
export {
  SSOO_PAGE_CHROME_CLASSES,
  SSOO_PAGE_CHROME_METRICS,
} from './page-chrome-metrics';

export {
  createSsooSharedSurfaceContentPageElement,
} from './shared-surface-content-page';
export type {
  SsooSharedSurfaceContentPageOptions,
} from './shared-surface-content-page';

export {
  SSOO_CONTENT_PAGE_METRICS,
  SSOO_CONTENT_PAGE_TONE_CLASSES,
  SsooContentPageTemplate,
} from './content-page-template';
export type {
  SsooContentPageLayoutVariant,
  SsooContentPageSidecarControlSlots,
  SsooContentPageSidecarMode,
  SsooContentPageSidecarNarrowBehavior,
  SsooContentPageSurfaceVariant,
  SsooContentPageTemplateProps,
  SsooContentPageTone,
} from './content-page-template';

export { SsooPageIndexRail } from './page-index-rail';
export type {
  SsooPageIndexRailItem,
  SsooPageIndexRailProps,
} from './page-index-rail';

export { SsooSectionedShell } from './sectioned-shell';
export type {
  SsooSectionedShellProps,
  SsooSectionedShellVariant,
} from './sectioned-shell';

export {
  SsooActivityListSection,
  SsooChipListSection,
  SsooCollapsibleSection,
  SsooKeyValueSection,
  SsooPanelFrame,
  SsooTextSection,
} from './page-panel';
export type {
  SsooActivityAction,
  SsooActivityItem,
  SsooActivityListSectionProps,
  SsooChipItem,
  SsooChipListSectionProps,
  SsooCollapsibleSectionControlSlots,
  SsooCollapsibleSectionProps,
  SsooCollapsibleSectionVariant,
  SsooKeyValueItem,
  SsooKeyValueSectionProps,
  SsooPanelFrameProps,
  SsooTextSectionProps,
} from './page-panel';

export { SsooNotificationPanel } from './notification-center';
export type {
  SsooNotificationPanelAction,
  SsooNotificationPanelActionVariant,
  SsooNotificationPanelCategory,
  SsooNotificationPanelFilter,
  SsooNotificationPanelItem,
  SsooNotificationPanelProps,
  SsooNotificationPanelTone,
} from './notification-center';
export { SsooHeaderNotificationCenter } from './header-notification-center';
export type { SsooHeaderNotificationCenterProps } from './header-notification-center';

export {
  SSOO_SIDEBAR_SEARCH_CLEAR_LABEL,
  SSOO_SIDEBAR_SEARCH_PLACEHOLDER,
  SSOO_SIDEBAR_SEARCH_RAIL_LABEL,
  SsooSidebarBadge,
  SsooSidebarDivider,
  SsooSidebarEmptyState,
  SsooSidebarSearchBox,
  SsooSidebarSection,
  SsooSidebarSectionNote,
  SsooSidebarState,
  SsooSidebarSurface,
  SsooSidebarSearchableTree,
  SsooSidebarTreeActionButton,
  SsooSidebarTreeNodeIcon,
  SsooSidebarTreeStatusBadge,
  SsooSidebarTree,
  filterSsooSidebarTree,
  useSsooSidebarSearchQuery,
} from './sidebar';
export type {
  SsooSidebarBadgeProps,
  SsooSidebarBadgeTone,
  SsooSidebarDividerProps,
  SsooSidebarEmptyStateProps,
  SsooSidebarIcon,
  SsooSidebarMode,
  SsooSidebarSearchBoxProps,
  SsooSidebarSectionNoteProps,
  SsooSidebarSectionProps,
  SsooSidebarStateProps,
  SsooSidebarStateVariant,
  SsooSidebarSurfaceActionConfig,
  SsooSidebarSurfaceBrandActionConfig,
  SsooSidebarSurfaceFooterConfig,
  SsooSidebarSurfaceProps,
  SsooSidebarSurfaceSearchConfig,
  SsooSidebarSurfaceSection,
  SsooSidebarTreeActionButtonProps,
  SsooSidebarTreeFilterOptions,
  SsooSidebarTreeNodeIconProps,
  SsooSidebarTreeNodeState,
  SsooSidebarTreeProps,
  SsooSidebarSearchableTreeProps,
  SsooSidebarTreeStatusBadgeProps,
} from './sidebar';
