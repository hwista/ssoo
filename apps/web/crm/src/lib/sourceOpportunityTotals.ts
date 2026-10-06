import type { CrmOpportunity } from '@ssoo/types/crm';

export function getSourceOpportunityRevenue(item: Pick<CrmOpportunity, 'revenueLines'>): number {
  return item.revenueLines.reduce((sum, line) => sum + (line.quantity ?? 0) * (line.unitPrice ?? 0), 0);
}

export function getSourceOpportunityCost(item: Pick<CrmOpportunity, 'costLines'>): number {
  return item.costLines.reduce((sum, line) => sum + (line.quantity ?? 0) * (line.unitPrice ?? 0), 0);
}

export function formatSourceListAmount(value: number): string {
  return Math.abs(value) >= 100000000 ? `${(value / 100000000).toFixed(1)}억` : `${(value / 10000).toLocaleString('ko-KR')}만`;
}
