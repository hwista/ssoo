import type { CrmCostPlanAmsSourceExternalCostRequest, CrmCostPlanAmsSourceWorkspace } from '@ssoo/types/crm';

export interface AmsSourceGridDraftRow {
  vendorId: string;
  vendorName: string;
  wbsCode: string;
  planValues: string[];
  actualValues: string[];
}

export function toAmsSourceGridDrafts(workspace: CrmCostPlanAmsSourceWorkspace): AmsSourceGridDraftRow[] {
  return workspace.externalCostRows.map((row) => ({
    vendorId: row.vendorId,
    vendorName: row.vendorName,
    wbsCode: row.wbsCode,
    planValues: row.monthlyPlanAmounts.map(toInputValue),
    actualValues: row.monthlyActualAmounts.map(toInputValue),
  }));
}

export function sanitizeAmsSourceInput(value: string): string {
  const raw = value.replace(/[^0-9,-]/g, '').replace(/(?!^)-/g, '');
  if (raw === '-') return raw;
  const parsed = raw ? Number.parseInt(raw.replace(/,/g, ''), 10) : 0;
  return Number.isFinite(parsed) && parsed !== 0 ? parsed.toLocaleString('ko-KR') : '';
}

export function parseAmsSourcePasteAmount(value: string): number {
  const trimmed = value.trim();
  const negative = trimmed.startsWith('-') || trimmed.startsWith('△') || trimmed.startsWith('▲')
    || (trimmed.startsWith('(') && trimmed.endsWith(')'));
  const raw = trimmed.replace(/[^0-9.]/g, '');
  if (!raw) return 0;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return 0;
  const rounded = Math.round(parsed);
  return negative ? -rounded : rounded;
}

export function applyAmsSourceGridPaste(
  drafts: AmsSourceGridDraftRow[],
  startRowIndex: number,
  type: 'plan' | 'actual',
  startMonthIndex: number,
  clipboardText: string,
) {
  const matrix = clipboardText.split(/\r?\n/).filter((row) => row.trim() !== '').map((row) => row.split('\t'));
  const next = drafts.map((draft) => ({ ...draft, planValues: [...draft.planValues], actualValues: [...draft.actualValues] }));
  const key = type === 'plan' ? 'planValues' : 'actualValues';
  let pastedCellCount = 0;
  let invalidCellCount = 0;
  matrix.forEach((columns, rowOffset) => {
    const row = next[startRowIndex + rowOffset];
    if (!row) return;
    columns.forEach((cell, columnOffset) => {
      const monthIndex = startMonthIndex + columnOffset;
      if (monthIndex >= 12) return;
      if (cell.trim() !== '' && !/[0-9]/.test(cell)) {
        invalidCellCount += 1;
        return;
      }
      row[key][monthIndex] = toInputValue(parseAmsSourcePasteAmount(cell));
      pastedCellCount += 1;
    });
  });
  return { drafts: next, pastedCellCount, invalidCellCount };
}

export function toAmsSourceExternalCostRequest(targetYear: number, drafts: AmsSourceGridDraftRow[]): CrmCostPlanAmsSourceExternalCostRequest {
  return {
    targetYear,
    rows: drafts.map((draft) => ({
      vendorId: draft.vendorId,
      wbsCode: draft.wbsCode,
      monthlyPlanAmounts: draft.planValues.map(toAmount),
      monthlyActualAmounts: draft.actualValues.map(toAmount),
    })),
  };
}

export function sumAmsSourceValues(values: string[]) {
  return values.reduce((sum, value) => sum + toAmount(value), 0);
}

function toInputValue(value: number) {
  return value === 0 ? '' : Math.round(value).toLocaleString('ko-KR');
}

function toAmount(value: string) {
  if (!value || value === '-') return 0;
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

// Keep edited cells when a vendor mapping changes in another open CRM tab.
export function reconcileAmsSourceDrafts(
  drafts: AmsSourceGridDraftRow[],
  previous: CrmCostPlanAmsSourceWorkspace,
  next: CrmCostPlanAmsSourceWorkspace,
): AmsSourceGridDraftRow[] {
  const key = (row: AmsSourceGridDraftRow) => JSON.stringify([row.vendorId, row.wbsCode]);
  const previousByKey = new Map(toAmsSourceGridDrafts(previous).map((row) => [key(row), row]));
  const draftsByKey = new Map(drafts.map((row) => [key(row), row]));
  return toAmsSourceGridDrafts(next).map((row) => {
    const draft = draftsByKey.get(key(row));
    const baseline = previousByKey.get(key(row));
    if (!draft || !baseline) return row;
    return {
      ...row,
      planValues: row.planValues.map((value, index) => draft.planValues[index] !== baseline.planValues[index] ? draft.planValues[index] : value),
      actualValues: row.actualValues.map((value, index) => draft.actualValues[index] !== baseline.actualValues[index] ? draft.actualValues[index] : value),
    };
  });
}
