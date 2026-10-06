'use client';

import { useEffect, useState } from 'react';
import type { CrmBusinessPlanRowUpsertRequest } from '@ssoo/types/crm';
import { createSharedHttpError } from '@ssoo/web-auth';
import { SsooErrorNotice } from '@ssoo/web-shell';
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, NativeSelect } from '@ssoo/web-ui';

export interface BusinessPlanCarryCandidate {
  contractId: string;
  startDate: string;
  endDate: string;
  row: CrmBusinessPlanRowUpsertRequest;
}

export function BusinessPlanCarryContracts({ baseYear, ownerOrganizationId, accessToken, disabled, onApply }: {
  baseYear: number;
  ownerOrganizationId?: string;
  accessToken: string | null;
  disabled: boolean;
  onApply: (rows: BusinessPlanCarryCandidate[]) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState('billing');
  const [rows, setRows] = useState<BusinessPlanCarryCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open || !accessToken) return;
    const controller = new AbortController();
    setRows(null);
    setError(null);
    const params = new URLSearchParams({ baseYear: String(baseYear), method });
    if (ownerOrganizationId) params.set('ownerOrganizationId', ownerOrganizationId);
    void fetch(`/api/crm/business-plan/carry-contracts?${params}`, { signal: controller.signal, headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || payload?.success !== true) throw createSharedHttpError(response, payload, '계약을 불러오지 못했습니다.');
        if (!controller.signal.aborted) setRows(payload.data);
      }).catch((nextError: unknown) => {
        if (!controller.signal.aborted) setError(nextError instanceof Error ? nextError.message : '계약 조회에 실패했습니다.');
      });
    return () => controller.abort();
  }, [open, accessToken, baseYear, ownerOrganizationId, method, retry]);
  return <>
    <Button type="button" variant="outline" disabled={disabled} onClick={() => { setMethod('billing'); setOpen(true); }}>전년이월실적 불러오기</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>진행 계약 불러오기</DialogTitle><DialogDescription>{baseYear}년 이전에 시작해 해당 연도까지 진행 중인 확정 계약을 입력 행에 추가합니다. 적용 후 저장해 주세요.</DialogDescription></DialogHeader>
        <label className="text-sm">불러오기 기준<NativeSelect aria-label="불러오기 기준" value={method} onChange={(event) => { setRows(null); setMethod(event.target.value); }}><option value="billing">청구계획 기준</option><option value="progress">진행률 기준</option></NativeSelect></label>
        <p className="text-xs text-muted-foreground">DC 후 매출·외부원가(상품+외부용역). 진행률은 계약 기간을 평균 월일수로 나누어 월별 배분합니다.</p>
        {error ? <SsooErrorNotice error={error} actions={[{ label: '계약 다시 조회', onClick: () => setRetry((value) => value + 1) }]} /> : rows ? <div className="max-h-64 overflow-y-auto text-sm">{rows.length === 0 ? '이월 대상 계약이 없습니다.' : rows.map((item) => <div key={item.contractId} className="border-b py-2"><div>{item.row.businessName}</div><div className="text-xs text-muted-foreground">{item.startDate} ~ {item.endDate}</div></div>)}</div> : <p>계약을 불러오는 중입니다.</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>취소</Button><Button type="button" disabled={disabled || !rows?.length || Boolean(error)} onClick={() => { if (rows && onApply(rows)) setOpen(false); }}>입력 행에 적용</Button></div>
      </DialogContent>
    </Dialog>
  </>;
}
