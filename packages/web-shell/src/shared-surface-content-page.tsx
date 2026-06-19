'use client';

import type { ReactNode } from 'react';

import {
  createSsooContentPageTemplateElement,
  type SsooMdiContentPageTemplateElement,
} from './mdi-page-registry';
import { SsooPageBreadcrumb, type SsooPageBreadcrumbItem } from './page-breadcrumb';
import { SsooPageHeader } from './page-header';
import type { SsooContentPageTone } from './content-page-template';

export interface SsooSharedSurfaceContentPageOptions {
  surfaceId: string;
  title: ReactNode;
  children: ReactNode;
  description?: string;
  rootLabel?: ReactNode;
  pageTone?: SsooContentPageTone;
}

export function createSsooSharedSurfaceContentPageElement({
  surfaceId,
  title,
  children,
  description,
  rootLabel = '사용자',
  pageTone = 'neutral',
}: SsooSharedSurfaceContentPageOptions): SsooMdiContentPageTemplateElement {
  const breadcrumbItems: SsooPageBreadcrumbItem[] = [
    { id: 'ssoo/shared-user-surface', label: rootLabel },
    { id: surfaceId, label: title },
  ];

  return createSsooContentPageTemplateElement({
    breadcrumbSlot: <SsooPageBreadcrumb items={breadcrumbItems} />,
    headerSlot: <SsooPageHeader mode="viewer" description={description} />,
    mainContentSlot: (
      <div className="h-full overflow-auto p-4" data-ssoo-shared-surface-content>
        {children}
      </div>
    ),
    pageTone,
    contentSurface: 'plain',
  });
}
