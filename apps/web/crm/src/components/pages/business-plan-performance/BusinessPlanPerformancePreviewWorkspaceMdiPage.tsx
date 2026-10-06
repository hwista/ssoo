'use client';

import { BusinessPlanPerformancePreviewWorkspaceClient } from './BusinessPlanPerformancePreviewWorkspaceClient';
import { businessPlanPerformancePreviewFallback } from './businessPlanPerformancePreviewFallback';
import { normalizeBusinessPlanPerformancePreviewQuery } from './businessPlanPerformancePreviewQuery';

export function BusinessPlanPerformancePreviewWorkspaceMdiPage({ path, active }: { path: string; active: boolean }) {
  return (
    <BusinessPlanPerformancePreviewWorkspaceClient
      active={active}
      data={businessPlanPerformancePreviewFallback}
      query={normalizeBusinessPlanPerformancePreviewQuery(path)}
    />
  );
}
