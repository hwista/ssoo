import { createElement, isValidElement, type ReactElement, type ReactNode } from 'react';

import { SsooMdiTabbedContentArea } from './content-area';
import {
  SsooContentPageTemplate,
  type SsooContentPageTemplateProps,
} from './content-page-template';

export type SsooMdiPageRouteKind = 'contentPage';
export type SsooMdiContentPageTemplateContract = 'SsooContentPageTemplate' | 'domainAdapter';

export const SSOO_CONTENT_PAGE_ADAPTER_NAMES = {
  adminLocalPage: 'Admin Local Page',
  crmLocalPage: 'CRM Local Page',
  dmsPageTemplate: 'DMS PageTemplate',
  globalSearchPage: 'SsooGlobalSearchPage',
  pmsLocalPage: 'PMS Local Page',
  routeHandoffPage: 'Route Handoff Page',
  snsLocalPage: 'SNS Local Page',
} as const;

export type SsooContentPageAdapterName =
  (typeof SSOO_CONTENT_PAGE_ADAPTER_NAMES)[keyof typeof SSOO_CONTENT_PAGE_ADAPTER_NAMES];

export interface SsooMdiPageRouteMatchState {
  activeTabId: string | null;
  tabId: string;
}

export interface SsooMdiPageRouteRenderState<TTab> extends SsooMdiPageRouteMatchState {
  active: boolean;
  tab: TTab;
}

interface SsooMdiPageRouteBase<TTab> {
  key: string;
  description?: string;
  match: (tab: TTab, state: SsooMdiPageRouteMatchState) => boolean;
}

export interface SsooContentPageAdapterBoundaryProps {
  adapterName: SsooContentPageAdapterName;
  children: ReactNode;
}

export function SsooContentPageAdapterBoundary({
  adapterName,
  children,
}: SsooContentPageAdapterBoundaryProps) {
  return (
    <div className="contents" data-ssoo-content-page-adapter={adapterName}>
      {children}
    </div>
  );
}

declare const ssooMdiContentPageElementBrand: unique symbol;

export type SsooMdiContentPageTemplateElement = ReactElement & {
  readonly [ssooMdiContentPageElementBrand]: 'SsooContentPageTemplate';
};

export type SsooMdiContentPageAdapterElement = ReactElement & {
  readonly [ssooMdiContentPageElementBrand]: 'domainAdapter';
};

export type SsooMdiContentPageElement =
  | SsooMdiContentPageTemplateElement
  | SsooMdiContentPageAdapterElement;

export function createSsooContentPageTemplateElement(
  props: SsooContentPageTemplateProps,
): SsooMdiContentPageTemplateElement {
  return createElement(SsooContentPageTemplate, props) as SsooMdiContentPageTemplateElement;
}

export function createSsooContentPageAdapterElement(
  props: SsooContentPageAdapterBoundaryProps,
): SsooMdiContentPageAdapterElement {
  return createElement(SsooContentPageAdapterBoundary, props) as SsooMdiContentPageAdapterElement;
}

export interface SsooMdiContentPageRouteBase<TTab> extends SsooMdiPageRouteBase<TTab> {
  kind: 'contentPage';
  render: (state: SsooMdiPageRouteRenderState<TTab>) => SsooMdiContentPageElement;
}

export interface SsooMdiContentPageTemplateRoute<TTab> extends SsooMdiContentPageRouteBase<TTab> {
  template: 'SsooContentPageTemplate';
}

export interface SsooMdiContentPageAdapterRoute<TTab> extends SsooMdiContentPageRouteBase<TTab> {
  adapterName: SsooContentPageAdapterName;
  template: 'domainAdapter';
}

export type SsooMdiContentPageRoute<TTab> =
  | SsooMdiContentPageTemplateRoute<TTab>
  | SsooMdiContentPageAdapterRoute<TTab>;

export type SsooMdiPageRoute<TTab> = SsooMdiContentPageRoute<TTab>;

export function defineSsooMdiPageRoute<TTab>(route: SsooMdiPageRoute<TTab>): SsooMdiPageRoute<TTab> {
  return route;
}

export function defineSsooMdiPageRegistry<TTab>(
  routes: readonly SsooMdiPageRoute<TTab>[],
): readonly SsooMdiPageRoute<TTab>[] {
  return routes;
}

function assertContentPageRouteRender<TTab>(
  route: SsooMdiContentPageRoute<TTab>,
  element: SsooMdiContentPageElement,
) {
  if (!isValidElement(element)) {
    throw new Error(`SSOO MDI contentPage route "${route.key}" must render a React element.`);
  }

  if (route.template === 'SsooContentPageTemplate') {
    if (element.type !== SsooContentPageTemplate) {
      throw new Error(
        `SSOO MDI contentPage route "${route.key}" must render SsooContentPageTemplate through createSsooContentPageTemplateElement().`,
      );
    }
    return;
  }

  const props = element.props as Partial<SsooContentPageAdapterBoundaryProps>;
  if (element.type !== SsooContentPageAdapterBoundary || props.adapterName !== route.adapterName) {
    throw new Error(
      `SSOO MDI contentPage route "${route.key}" must render its approved domain adapter boundary "${route.adapterName}".`,
    );
  }
}

export function resolveSsooMdiPageRoute<TTab>(
  routes: readonly SsooMdiPageRoute<TTab>[],
  tab: TTab,
  state: SsooMdiPageRouteMatchState,
): SsooMdiPageRoute<TTab> | undefined {
  return routes.find((route) => route.match(tab, state));
}

export interface SsooRegisteredMdiContentAreaProps<TTab> {
  activeTabId: string | null;
  className?: string;
  emptySlot?: ReactNode;
  getTabId: (tab: TTab) => string;
  routes: readonly SsooMdiPageRoute<TTab>[];
  tabs: readonly TTab[];
  unknownRouteSlot?: (tab: TTab, state: SsooMdiPageRouteMatchState) => ReactNode;
}

export function SsooRegisteredMdiContentArea<TTab>({
  activeTabId,
  className,
  emptySlot,
  getTabId,
  routes,
  tabs,
  unknownRouteSlot,
}: SsooRegisteredMdiContentAreaProps<TTab>) {
  return (
    <SsooMdiTabbedContentArea
      activeTabId={activeTabId}
      className={className}
      emptySlot={emptySlot}
      getTabId={getTabId}
      tabs={tabs}
      renderTab={(tab, { active }) => {
        const tabId = getTabId(tab);
        const matchState = { activeTabId, tabId };
        const route = resolveSsooMdiPageRoute(routes, tab, matchState);

        if (!route) {
          return unknownRouteSlot?.(tab, matchState) ?? null;
        }

        const rendered = route.render({ ...matchState, active, tab });
        assertContentPageRouteRender(route, rendered);
        return rendered;
      }}
    />
  );
}
