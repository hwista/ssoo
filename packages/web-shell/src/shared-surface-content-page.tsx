'use client';

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import {
  createSsooContentPageTemplateElement,
  type SsooMdiContentPageTemplateElement,
} from './mdi-page-registry';
import { SsooPageBreadcrumb, type SsooPageBreadcrumbItem } from './page-breadcrumb';
import { SsooPageHeader, type SsooPageHeaderProps } from './page-header';
import type { SsooContentPageTone } from './content-page-template';

export interface SsooSharedSurfaceContentPageOptions {
  surfaceId: string;
  title: ReactNode;
  children: ReactNode;
  description?: string;
  rootLabel?: ReactNode;
  pageTone?: SsooContentPageTone;
}

export type SsooSharedSurfacePageHeaderActions = Partial<
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

interface SsooSharedSurfacePageHeaderActionStore {
  getSnapshot: () => SsooSharedSurfacePageHeaderActions;
  subscribe: (listener: () => void) => () => void;
  setSnapshot: (nextSnapshot: SsooSharedSurfacePageHeaderActions) => void;
}

const EMPTY_SHARED_SURFACE_HEADER_ACTIONS: SsooSharedSurfacePageHeaderActions = Object.freeze({});
const SsooSharedSurfacePageHeaderActionContext =
  createContext<SsooSharedSurfacePageHeaderActionStore | null>(null);

function createSsooSharedSurfacePageHeaderActionStore(): SsooSharedSurfacePageHeaderActionStore {
  let snapshot = EMPTY_SHARED_SURFACE_HEADER_ACTIONS;
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

function SsooSharedSurfacePageHeaderActionProvider({
  store,
  children,
}: {
  store: SsooSharedSurfacePageHeaderActionStore;
  children: ReactNode;
}) {
  return (
    <SsooSharedSurfacePageHeaderActionContext.Provider value={store}>
      {children}
    </SsooSharedSurfacePageHeaderActionContext.Provider>
  );
}

function SsooSharedSurfacePageHeader({
  title,
  description,
  store,
}: {
  title: ReactNode;
  description?: string;
  store: SsooSharedSurfacePageHeaderActionStore;
}) {
  const actions = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );

  return (
    <SsooPageHeader
      mode={actions.mode ?? 'viewer'}
      title={title}
      description={description}
      onEdit={actions.onEdit}
      onDelete={actions.onDelete}
      onHistory={actions.onHistory}
      onSave={actions.onSave}
      onCancel={actions.onCancel}
      onBack={actions.onBack}
      saving={actions.saving}
      saveDisabled={actions.saveDisabled}
      isPreview={actions.isPreview}
      extraActions={actions.extraActions}
      extraActionsPosition={actions.extraActionsPosition}
      viewerRightSlot={actions.viewerRightSlot}
      editorPreviewSlot={actions.editorPreviewSlot}
      iconSlots={actions.iconSlots}
    />
  );
}

export function useSsooSharedSurfacePageHeaderActions(
  actions: SsooSharedSurfacePageHeaderActions | null | undefined,
) {
  const store = useContext(SsooSharedSurfacePageHeaderActionContext);

  useEffect(() => {
    if (!store) {
      return undefined;
    }

    store.setSnapshot(actions ?? EMPTY_SHARED_SURFACE_HEADER_ACTIONS);
    return () => {
      store.setSnapshot(EMPTY_SHARED_SURFACE_HEADER_ACTIONS);
    };
  }, [actions, store]);
}

export function createSsooSharedSurfaceContentPageElement({
  surfaceId,
  title,
  children,
  description,
  rootLabel = '사용자',
  pageTone = 'neutral',
}: SsooSharedSurfaceContentPageOptions): SsooMdiContentPageTemplateElement {
  const headerActionStore = createSsooSharedSurfacePageHeaderActionStore();
  const breadcrumbItems: SsooPageBreadcrumbItem[] = [
    { id: 'ssoo/shared-user-surface', label: rootLabel },
    { id: surfaceId, label: title },
  ];

  return createSsooContentPageTemplateElement({
    breadcrumbSlot: <SsooPageBreadcrumb items={breadcrumbItems} />,
    headerSlot: (
      <SsooSharedSurfacePageHeader
        title={title}
        description={description}
        store={headerActionStore}
      />
    ),
    mainContentSlot: (
      <SsooSharedSurfacePageHeaderActionProvider store={headerActionStore}>
        <div className="h-full overflow-auto p-4" data-ssoo-shared-surface-content>
          {children}
        </div>
      </SsooSharedSurfacePageHeaderActionProvider>
    ),
    pageTone,
    contentSurface: 'plain',
  });
}
