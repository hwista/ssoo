import type { ReactNode } from 'react';
import {
  createSsooSettingsPageContentPageElement,
  createSsooSharedSurfaceContentPageElement,
  SsooContentAreaState,
  type SsooMdiContentPageTemplateElement,
} from '@ssoo/web-shell';

import {
  getSsooUserSurfaceTabId,
  getSsooUserSurfacePageDescription,
  getSsooUserSurfaceTabPath,
  getSsooUserSurfaceTabTitle,
  parseSsooUserSurfaceRoute,
} from './user-surface-routing';
import { SsooUserSurfacePage } from './user-surface';

export interface SsooUserSurfaceContentPageOptions {
  path: string | null | undefined;
  title: ReactNode;
  children: ReactNode;
  rootLabel?: ReactNode;
}

export interface SsooUserSurfaceOpenProfileTabOptions {
  id: string;
  title: string;
  path: string;
  icon: 'User';
  closable: true;
  activate: true;
}

export interface SsooUserSurfaceRouteContentPageOptions
  extends Omit<SsooUserSurfaceContentPageOptions, 'children'> {
  apiBaseUrl?: string;
  eventsPath?: string;
  onOpenProfileTab?: (options: SsooUserSurfaceOpenProfileTabOptions) => void;
  wrapChildren?: (children: ReactNode) => ReactNode;
}

export function createSsooUserSurfaceContentPageElement({
  path,
  title,
  children,
  rootLabel,
}: SsooUserSurfaceContentPageOptions): SsooMdiContentPageTemplateElement {
  const userSurfaceRoute = parseSsooUserSurfaceRoute(path);

  return createSsooSharedSurfaceContentPageElement({
    surfaceId: userSurfaceRoute ? `ssoo-user-${userSurfaceRoute.kind}` : 'ssoo-user-surface',
    title: userSurfaceRoute?.title ?? title,
    description: userSurfaceRoute
      ? getSsooUserSurfacePageDescription(userSurfaceRoute.kind)
      : undefined,
    rootLabel,
    pageTone: userSurfaceRoute?.kind === 'personal-settings' ? 'settings' : 'profile',
    children,
  });
}

export function createSsooUserSurfaceRouteContentPageElement({
  path,
  title,
  rootLabel,
  apiBaseUrl,
  eventsPath,
  onOpenProfileTab,
  wrapChildren,
}: SsooUserSurfaceRouteContentPageOptions): SsooMdiContentPageTemplateElement {
  const userSurfaceRoute = parseSsooUserSurfaceRoute(path);
  const body = userSurfaceRoute ? (
    <SsooUserSurfacePage
      surface={userSurfaceRoute.kind}
      userId={userSurfaceRoute.userId}
      apiBaseUrl={apiBaseUrl}
      eventsPath={eventsPath}
      onOpenProfile={onOpenProfileTab ? (nextUserId) => {
        onOpenProfileTab({
          id: getSsooUserSurfaceTabId('user-profile', nextUserId),
          title: getSsooUserSurfaceTabTitle('user-profile'),
          path: getSsooUserSurfaceTabPath('user-profile', nextUserId),
          icon: 'User',
          closable: true,
          activate: true,
        });
      } : undefined}
    />
  ) : (
    <SsooContentAreaState
      title="알 수 없는 사용자 표면입니다."
      description={`경로: ${path ?? ''}`}
    />
  );
  const children = wrapChildren ? wrapChildren(body) : body;

  if (userSurfaceRoute?.kind === 'personal-settings') {
    return createSsooSettingsPageContentPageElement({
      title: userSurfaceRoute.title ?? title,
      description: getSsooUserSurfacePageDescription(userSurfaceRoute.kind),
      breadcrumbItems: [
        { id: 'ssoo/shared-user-surface', label: rootLabel ?? '사용자' },
        { id: `ssoo-user-${userSurfaceRoute.kind}`, label: userSurfaceRoute.title ?? title },
      ],
      breadcrumbRootIconSlot: null,
      overviewAnchorId: 'ssoo-user-settings-overview',
      index: {
        ariaLabel: '계정 설정 항목 색인',
        description: '프로필과 계정 표시 정보를 관리합니다.',
        items: [
          {
            id: 'ssoo-user-settings-basic',
            label: '기본 정보',
            description: '표시 이름과 공개 링크 정보를 관리합니다.',
          },
          {
            id: 'ssoo-user-settings-profile-intro',
            label: '프로필 소개',
            description: '프로필 소개 문구를 관리합니다.',
          },
        ],
        onItemSelect: (item) => {
          document.getElementById(item.id)?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        },
      },
      children,
    });
  }

  return createSsooUserSurfaceContentPageElement({
    path,
    title,
    rootLabel,
    children,
  });
}
