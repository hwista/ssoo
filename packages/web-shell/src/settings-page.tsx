'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { ChevronRight, Settings } from 'lucide-react';

import {
  createSsooContentPageTemplateElement,
  type SsooMdiContentPageTemplateElement,
} from './mdi-page-registry';
import {
  SsooContentPageTemplate,
  type SsooContentPageTemplateProps,
} from './content-page-template';
import {
  SsooPageBreadcrumb,
  type SsooPageBreadcrumbItem,
} from './page-breadcrumb';
import {
  SsooPageHeader,
  type SsooPageHeaderProps,
} from './page-header';
import {
  SsooPageIndexRail,
  type SsooPageIndexRailItem,
} from './page-index-rail';
import {
  SsooSettingsMainPanel,
  SsooSettingsSurface,
} from './settings-surface';

export type SsooSettingsPageHeaderActions = Partial<
  Pick<
    SsooPageHeaderProps,
    | 'mode'
    | 'onEdit'
    | 'onDelete'
    | 'onHistory'
    | 'onSave'
    | 'onCancel'
    | 'onBack'
    | 'saving'
    | 'saveDisabled'
    | 'isPreview'
    | 'extraActions'
    | 'extraActionsPosition'
    | 'viewerRightSlot'
    | 'editorPreviewSlot'
    | 'iconSlots'
  >
>;

export interface SsooSettingsPageIndexOptions {
  items: SsooPageIndexRailItem[];
  activeItemId?: string;
  title?: ReactNode;
  description?: ReactNode;
  ariaLabel?: string;
  onItemSelect: (item: SsooPageIndexRailItem) => void;
}

export interface SsooSettingsPageProps {
  filePath?: string;
  breadcrumbItems?: SsooPageBreadcrumbItem[];
  breadcrumbLastItemLabel?: ReactNode;
  breadcrumbRootIconSlot?: ReactNode;
  breadcrumbAriaLabel?: string;
  onBreadcrumbRootClick?: () => void;
  onBreadcrumbItemClick?: (item: SsooPageBreadcrumbItem, index: number) => void;
  title?: ReactNode;
  description?: string;
  headerActions?: SsooSettingsPageHeaderActions;
  index?: SsooSettingsPageIndexOptions | null;
  overviewAnchorId?: string;
  bannerSlot?: ReactNode;
  pendingSummarySlot?: ReactNode;
  topSlot?: ReactNode;
  children: ReactNode;
  stateSlot?: ReactNode;
  compactMode?: boolean;
}

interface SsooSettingsPageHeaderActionStore {
  getSnapshot: () => SsooSettingsPageHeaderActions;
  subscribe: (listener: () => void) => () => void;
  setSnapshot: (nextSnapshot: SsooSettingsPageHeaderActions) => void;
}

const EMPTY_SETTINGS_PAGE_HEADER_ACTIONS: SsooSettingsPageHeaderActions = Object.freeze({});
const SsooSettingsPageHeaderActionContext =
  createContext<SsooSettingsPageHeaderActionStore | null>(null);

const SETTINGS_BREADCRUMB_DISPLAY_NAMES: Record<string, string> = {
  'ai/chat': 'AI 대화',
  settings: '설정',
  git: 'Git',
  storage: 'Storage',
  ingest: 'Ingest',
};

function createSsooSettingsPageHeaderActionStore(
  initialSnapshot: SsooSettingsPageHeaderActions = EMPTY_SETTINGS_PAGE_HEADER_ACTIONS,
): SsooSettingsPageHeaderActionStore {
  let snapshot = initialSnapshot;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setSnapshot: (nextSnapshot) => {
      snapshot = nextSnapshot;
      listeners.forEach((listener) => listener());
    },
  };
}

function SsooSettingsPageHeaderActionProvider({
  store,
  children,
}: {
  store: SsooSettingsPageHeaderActionStore;
  children: ReactNode;
}) {
  return (
    <SsooSettingsPageHeaderActionContext.Provider value={store}>
      {children}
    </SsooSettingsPageHeaderActionContext.Provider>
  );
}

function SsooSettingsPageHeader({
  title,
  description,
  actions,
  store,
}: {
  title?: ReactNode;
  description?: string;
  actions?: SsooSettingsPageHeaderActions;
  store?: SsooSettingsPageHeaderActionStore;
}) {
  const storeActions = useSyncExternalStore(
    store?.subscribe ?? (() => () => undefined),
    store?.getSnapshot ?? (() => EMPTY_SETTINGS_PAGE_HEADER_ACTIONS),
    store?.getSnapshot ?? (() => EMPTY_SETTINGS_PAGE_HEADER_ACTIONS),
  );
  const resolvedActions = store ? storeActions : actions ?? EMPTY_SETTINGS_PAGE_HEADER_ACTIONS;

  return (
    <SsooPageHeader
      mode={resolvedActions.mode ?? 'viewer'}
      title={title}
      description={description}
      onEdit={resolvedActions.onEdit}
      onDelete={resolvedActions.onDelete}
      onHistory={resolvedActions.onHistory}
      onSave={resolvedActions.onSave}
      onCancel={resolvedActions.onCancel}
      onBack={resolvedActions.onBack}
      saving={resolvedActions.saving}
      saveDisabled={resolvedActions.saveDisabled}
      isPreview={resolvedActions.isPreview}
      extraActions={resolvedActions.extraActions}
      extraActionsPosition={resolvedActions.extraActionsPosition}
      viewerRightSlot={resolvedActions.viewerRightSlot}
      editorPreviewSlot={resolvedActions.editorPreviewSlot}
      iconSlots={resolvedActions.iconSlots}
    />
  );
}

function buildSettingsBreadcrumbItems(filePath?: string): SsooPageBreadcrumbItem[] {
  if (!filePath) {
    return [{ id: 'settings', label: SETTINGS_BREADCRUMB_DISPLAY_NAMES.settings, path: 'settings' }];
  }

  const cleanPath = filePath.replace(/^\/+|\/+$/g, '');
  const displayName = SETTINGS_BREADCRUMB_DISPLAY_NAMES[cleanPath];
  if (displayName) {
    return [{ id: cleanPath, label: displayName, path: cleanPath }];
  }

  return cleanPath.split('/').filter(Boolean).map((segment, index, segments) => {
    const path = segments.slice(0, index + 1).join('/');
    return {
      id: path,
      label: SETTINGS_BREADCRUMB_DISPLAY_NAMES[path] ?? SETTINGS_BREADCRUMB_DISPLAY_NAMES[segment] ?? segment,
      path,
    };
  });
}

function createSettingsBreadcrumbSlot({
  filePath,
  breadcrumbItems,
  breadcrumbLastItemLabel,
  breadcrumbRootIconSlot,
  breadcrumbAriaLabel,
  onBreadcrumbRootClick,
  onBreadcrumbItemClick,
}: Pick<
  SsooSettingsPageProps,
  | 'filePath'
  | 'breadcrumbItems'
  | 'breadcrumbLastItemLabel'
  | 'breadcrumbRootIconSlot'
  | 'breadcrumbAriaLabel'
  | 'onBreadcrumbRootClick'
  | 'onBreadcrumbItemClick'
>) {
  const items = breadcrumbItems ?? buildSettingsBreadcrumbItems(filePath);

  return (
    <SsooPageBreadcrumb
      items={items}
      lastItemLabel={breadcrumbLastItemLabel}
      rootIconSlot={breadcrumbRootIconSlot === undefined ? <Settings className="h-3.5 w-3.5" /> : breadcrumbRootIconSlot}
      separatorSlot={<ChevronRight className="mx-1 h-3.5 w-3.5 shrink-0 text-gray-400" />}
      onRootClick={onBreadcrumbRootClick}
      onItemClick={onBreadcrumbItemClick}
      ariaLabel={breadcrumbAriaLabel ?? '설정 경로'}
    />
  );
}

function createSettingsIndexSlot(index?: SsooSettingsPageIndexOptions | null) {
  if (!index || index.items.length === 0) {
    return undefined;
  }

  return (
    <SsooPageIndexRail
      ariaLabel={index.ariaLabel ?? '설정 항목 색인'}
      activeItemId={index.activeItemId}
      title={index.title}
      description={index.description}
      items={index.items}
      onItemSelect={index.onItemSelect}
    />
  );
}

function createSettingsMainContentSlot({
  overviewAnchorId,
  bannerSlot,
  pendingSummarySlot,
  topSlot,
  children,
  store,
}: Pick<
  SsooSettingsPageProps,
  'overviewAnchorId' | 'bannerSlot' | 'pendingSummarySlot' | 'topSlot' | 'children'
> & {
  store?: SsooSettingsPageHeaderActionStore;
}) {
  const content = (
    <SsooSettingsSurface>
      <SsooSettingsMainPanel>
        {overviewAnchorId ? <div id={overviewAnchorId} className="scroll-mt-4" /> : null}
        {bannerSlot}
        {pendingSummarySlot}
        {topSlot}
        {children}
      </SsooSettingsMainPanel>
    </SsooSettingsSurface>
  );

  if (!store) {
    return content;
  }

  return (
    <SsooSettingsPageHeaderActionProvider store={store}>
      {content}
    </SsooSettingsPageHeaderActionProvider>
  );
}

function buildSsooSettingsPageTemplateProps(
  props: SsooSettingsPageProps,
  store?: SsooSettingsPageHeaderActionStore,
): SsooContentPageTemplateProps {
  const breadcrumbSlot = createSettingsBreadcrumbSlot(props);
  const title = props.title === undefined ? '설정' : props.title;
  const headerSlot = (
    <SsooSettingsPageHeader
      title={title}
      description={props.description}
      actions={props.headerActions}
      store={store}
    />
  );

  return {
    breadcrumbSlot,
    headerSlot,
    mainContentSlot: createSettingsMainContentSlot({ ...props, store }),
    leftSubContentSlot: createSettingsIndexSlot(props.index),
    stateSlot: props.stateSlot,
    pageTone: 'settings',
    contentSurface: 'plain',
    sidecarMode: 'hidden',
    compactMode: props.compactMode,
  };
}

export function useSsooSettingsPageHeaderActions(
  actions: SsooSettingsPageHeaderActions | null | undefined,
) {
  const store = useContext(SsooSettingsPageHeaderActionContext);

  useEffect(() => {
    if (!store) {
      return undefined;
    }

    store.setSnapshot(actions ?? EMPTY_SETTINGS_PAGE_HEADER_ACTIONS);
    return () => {
      store.setSnapshot(EMPTY_SETTINGS_PAGE_HEADER_ACTIONS);
    };
  }, [actions, store]);
}

export function SsooSettingsPage(props: SsooSettingsPageProps) {
  const templateProps = useMemo(() => buildSsooSettingsPageTemplateProps(props), [props]);
  return <SsooContentPageTemplate {...templateProps} />;
}

export function createSsooSettingsPageContentPageElement(
  props: SsooSettingsPageProps,
): SsooMdiContentPageTemplateElement {
  const headerActionStore = createSsooSettingsPageHeaderActionStore(props.headerActions);

  return createSsooContentPageTemplateElement(
    buildSsooSettingsPageTemplateProps(props, headerActionStore),
  );
}
