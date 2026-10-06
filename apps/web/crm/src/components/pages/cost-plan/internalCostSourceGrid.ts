import type {
  CrmCostPlanInternalSourceGrid,
  CrmCostPlanInternalSourceGridRequest,
  CrmCostPlanInternalSourceItemCode,
} from '@ssoo/types/crm';

export const INTERNAL_COST_SOURCE_ITEMS: ReadonlyArray<{ code: CrmCostPlanInternalSourceItemCode; name: string }> = [
  { code: 'labor', name: '인건비' },
  { code: 'other', name: '기타' },
  { code: 'dept_adj', name: '사업부간조정' },
  { code: 'svc', name: '매출원가용역' },
  { code: 'dept_common', name: '사업부공통' },
];

export interface InternalCostSourceGridDraftItem {
  itemCode: CrmCostPlanInternalSourceItemCode;
  itemName: string;
  planValues: string[];
  actualValues: string[];
}

export function toInternalCostSourceGridDraft(grid: CrmCostPlanInternalSourceGrid): InternalCostSourceGridDraftItem[] {
  const byCode = new Map(grid.items.map((item) => [item.itemCode, item]));
  return INTERNAL_COST_SOURCE_ITEMS.map((definition) => {
    const item = byCode.get(definition.code);
    return {
      itemCode: definition.code,
      itemName: definition.name,
      planValues: Array.from({ length: 12 }, (_, index) => toInputValue(item?.monthlyPlanAmounts[index] ?? 0)),
      actualValues: Array.from({ length: 12 }, (_, index) => toInputValue(item?.monthlyActualAmounts[index] ?? 0)),
    };
  });
}

export function sanitizeInternalCostSourceInput(value: string): string {
  const raw = value.replace(/[^0-9,-]/g, '').replace(/(?!^)-/g, '');
  if (raw === '-') return raw;
  const parsed = raw ? Number.parseInt(raw.replace(/,/g, ''), 10) : 0;
  return Number.isFinite(parsed) && parsed !== 0 ? parsed.toLocaleString('ko-KR') : '';
}

export function parseInternalCostSourcePasteAmount(value: string): number {
  const trimmed = value.trim();
  const isNegative = trimmed.startsWith('-')
    || trimmed.startsWith('△')
    || trimmed.startsWith('▲')
    || (trimmed.startsWith('(') && trimmed.endsWith(')'));
  const raw = trimmed.replace(/[^0-9.]/g, '').trim();
  if (!raw) return 0;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return 0;
  const rounded = Math.round(parsed);
  return isNegative ? -rounded : rounded;
}

export function applyInternalCostSourceGridPaste(
  drafts: InternalCostSourceGridDraftItem[],
  startItemIndex: number,
  startType: 'plan' | 'actual',
  startMonthIndex: number,
  clipboardText: string,
): { drafts: InternalCostSourceGridDraftItem[]; pastedCellCount: number; invalidCellCount: number } {
  const matrix = clipboardText
    .split(/\r?\n/)
    .filter((row) => row.trim() !== '')
    .map((row) => row.split('\t'));
  const next = drafts.map((draft) => ({
    ...draft,
    planValues: [...draft.planValues],
    actualValues: [...draft.actualValues],
  }));
  const startRowIndex = (startItemIndex * 2) + (startType === 'actual' ? 1 : 0);
  let pastedCellCount = 0;
  let invalidCellCount = 0;

  matrix.forEach((columns, rowOffset) => {
    const targetRowIndex = startRowIndex + rowOffset;
    if (targetRowIndex >= INTERNAL_COST_SOURCE_ITEMS.length * 2) return;
    const itemIndex = Math.floor(targetRowIndex / 2);
    const type = targetRowIndex % 2 === 0 ? 'planValues' : 'actualValues';
    columns.forEach((cell, columnOffset) => {
      const monthIndex = startMonthIndex + columnOffset;
      if (monthIndex >= 12) return;
      if (cell.trim() !== '' && !/[0-9]/.test(cell)) {
        invalidCellCount += 1;
        return;
      }
      next[itemIndex][type][monthIndex] = toInputValue(parseInternalCostSourcePasteAmount(cell));
      pastedCellCount += 1;
    });
  });

  return { drafts: next, pastedCellCount, invalidCellCount };
}

export function toInternalCostSourceGridRequest(
  targetYear: number,
  drafts: InternalCostSourceGridDraftItem[],
): CrmCostPlanInternalSourceGridRequest {
  return {
    targetYear,
    items: INTERNAL_COST_SOURCE_ITEMS.map((definition) => {
      const draft = drafts.find((item) => item.itemCode === definition.code);
      if (!draft) throw new Error(`내부원가 필수 항목이 누락되었습니다: ${definition.name}`);
      return {
        itemCode: definition.code,
        monthlyPlanAmounts: draft.planValues.map(toAmount),
        monthlyActualAmounts: draft.actualValues.map(toAmount),
      };
    }),
  };
}

export function sumInternalCostSourceValues(values: string[]): number {
  return values.reduce((sum, value) => sum + toAmount(value), 0);
}

function toInputValue(value: number): string {
  return value === 0 ? '' : Math.round(value).toLocaleString('ko-KR');
}

function toAmount(value: string): number {
  if (!value || value === '-') return 0;
  const amount = Number(value.replace(/,/g, ''));
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}
