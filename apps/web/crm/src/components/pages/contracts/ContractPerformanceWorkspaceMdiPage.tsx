'use client';

import { ContractPerformanceWorkspaceClient } from './ContractPerformanceWorkspaceClient';
import { normalizeContractPerformanceQuery } from './contractPerformanceQuery';
import { contractPerformanceFallback } from './contractPerformanceFallback';

export function ContractPerformanceWorkspaceMdiPage({ path, active }: { path: string; active: boolean }) {
  return <ContractPerformanceWorkspaceClient active={active} data={contractPerformanceFallback} query={normalizeContractPerformanceQuery(path)} />;
}
