import type {
  CrmBusinessPlanRow,
  CrmBusinessPlanRowUpsertRequest,
  CrmBusinessPlanPreviewRegion,
} from '@ssoo/types/crm';

export const BUSINESS_PLAN_AMOUNT_CELL_COUNT = 28;

export interface BusinessPlanGridDraft {
  rowCode?: string;
  carriedContractId?: string;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmBusinessPlanPreviewRegion, 'all'>;
  businessName: string;
  wbsCode: string;
  amounts: string[];
}

export function createEmptyBusinessPlanGridDraft(): BusinessPlanGridDraft {
  return {
    businessType: '',
    industryLine: '',
    ownerName: '담당 미지정',
    region: 'unspecified',
    businessName: '',
    wbsCode: '',
    amounts: Array.from({ length: BUSINESS_PLAN_AMOUNT_CELL_COUNT }, () => '0'),
  };
}

export function toBusinessPlanGridDraft(row: CrmBusinessPlanRow, baseYear: number, unit = 1): BusinessPlanGridDraft {
  const base = row.years.find((year) => year.targetYear === baseYear);
  const next = row.years.find((year) => year.targetYear === baseYear + 1);
  const following = row.years.find((year) => year.targetYear === baseYear + 2);
  const amounts = Array.from({ length: BUSINESS_PLAN_AMOUNT_CELL_COUNT }, () => '0');
  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    amounts[monthIndex * 2] = String(base?.monthlyRevenueAmounts[monthIndex] ?? 0);
    amounts[(monthIndex * 2) + 1] = String(base?.monthlyExternalCostAmounts[monthIndex] ?? 0);
  }
  amounts[24] = String(next?.revenueAmount ?? 0);
  amounts[25] = String(next?.externalCostAmount ?? 0);
  amounts[26] = String(following?.revenueAmount ?? 0);
  amounts[27] = String(following?.externalCostAmount ?? 0);
  return {
    rowCode: row.rowCode,
    businessType: row.businessType,
    industryLine: row.industryLine,
    ownerName: row.ownerName,
    region: row.region,
    businessName: row.businessName,
    wbsCode: row.wbsCode ?? '',
    amounts: amounts.map((value) => String(Number(value) / unit)),
  };
}

export function parseBusinessPlanAmount(value: string, unit = 1): number | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '-') {
    return 0;
  }
  const isParenthesized = /^\(.*\)$/.test(trimmed);
  const isTriangleNegative = /^[△▲]/.test(trimmed);
  const normalized = trimmed
    .replace(/[₩￦$€£¥원,\s]/g, '')
    .replace(/^[△▲]/, '')
    .replace(/^\((.*)\)$/, '$1');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const amount = Math.round(((isParenthesized || isTriangleNegative) ? -Math.abs(parsed) : parsed) * unit);
  return Number.isSafeInteger(amount) ? amount : null;
}

export function applyBusinessPlanGridPaste(
  drafts: BusinessPlanGridDraft[],
  startRowIndex: number,
  startCellIndex: number,
  clipboardText: string,
  unit = 1,
): { drafts: BusinessPlanGridDraft[]; invalidCells: string[] } {
  const rows = clipboardText.replace(/\r\n?/g, '\n').split('\n');
  if (rows.at(-1) === '') rows.pop();
  const next = drafts.map((draft) => ({ ...draft, amounts: [...draft.amounts] }));
  const invalidCells: string[] = [];
  rows.forEach((rowText, rowOffset) => {
    const target = next[startRowIndex + rowOffset];
    if (!target) return;
    rowText.split('\t').forEach((cell, columnOffset) => {
      const targetCell = startCellIndex + columnOffset;
      if (targetCell >= BUSINESS_PLAN_AMOUNT_CELL_COUNT) return;
      const parsed = parseBusinessPlanAmount(cell, unit);
      if (parsed === null) {
        invalidCells.push(`${startRowIndex + rowOffset + 1}행 ${targetCell + 1}열`);
        return;
      }
      target.amounts[targetCell] = String(parsed / unit);
    });
  });
  return { drafts: next, invalidCells };
}

export function toBusinessPlanRowRequest(draft: BusinessPlanGridDraft, unit = 1): CrmBusinessPlanRowUpsertRequest {
  const required = [
    ['사업구분', draft.businessType],
    ['계열/산업', draft.industryLine],
    ['담당자', draft.ownerName],
    ['사업명', draft.businessName],
  ] as const;
  const missing = required.find(([, value]) => !value.trim());
  if (missing) {
    throw new Error(`${missing[0]}을 입력해 주세요.`);
  }
  const amounts = draft.amounts.map((value, index) => {
    const parsed = parseBusinessPlanAmount(value, unit);
    if (parsed === null) {
      throw new Error(`${index + 1}번째 금액 셀은 숫자로 입력해 주세요.`);
    }
    return parsed;
  });
  return {
    businessType: draft.businessType.trim(),
    industryLine: draft.industryLine.trim(),
    ownerName: draft.ownerName.trim(),
    region: draft.region,
    businessName: draft.businessName.trim(),
    ...(draft.wbsCode.trim() ? { wbsCode: draft.wbsCode.trim() } : {}),
    monthlyRevenueAmounts: Array.from({ length: 12 }, (_, index) => amounts[index * 2] ?? 0),
    monthlyExternalCostAmounts: Array.from({ length: 12 }, (_, index) => amounts[(index * 2) + 1] ?? 0),
    nextYearRevenueAmount: amounts[24] ?? 0,
    nextYearExternalCostAmount: amounts[25] ?? 0,
    followingYearRevenueAmount: amounts[26] ?? 0,
    followingYearExternalCostAmount: amounts[27] ?? 0,
  };
}
