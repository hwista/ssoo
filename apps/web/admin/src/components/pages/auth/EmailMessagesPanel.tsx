'use client';

import { useState } from 'react';
import type { AuthEmailDeliveryMessageSummary } from '@ssoo/types/common';
import { SsooErrorNotice, SsooDataGrid, type SsooDataGridColumnDef } from '@ssoo/web-shell';
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, NativeSelect, Textarea } from '@ssoo/web-ui';
import { useEmailMessages, useRetryEmailDelivery } from '@/hooks/queries/useAuthAdmin';
import { OperationHistoryButton } from '../access/OperationHistoryButton';

const labels: Record<string, string> = { pending: '대기', processing: '전송 중', sent: '발송 서버 수락', failed: '실패', superseded: '대체됨', consumed: '사용 완료' };
const date = (value?: string | null) => value ? new Date(value).toLocaleString('ko-KR') : '—';

export function EmailMessagesPanel({ ready }: { ready: boolean }) {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const query = useEmailMessages({ page, pageSize: 20, status: status || undefined });
  const columns: SsooDataGridColumnDef<AuthEmailDeliveryMessageSummary>[] = [

    { id: 'status', header: '상태', size: 170, cell: ({row:{original:message}}) => message.deliveryTarget === 'local' && message.statusCode === 'sent' ? '로컬 수신함 보관' : labels[message.statusCode] || message.statusCode },
    { accessorKey: 'recipient', header: '수신자', size: 180 },
    { accessorKey: 'templateCode', header: '유형', size: 160 },
    { id: 'date', header: '요청 시각', size: 190, cell: ({row:{original:message}}) => date(message.createdAt) },
    { id: 'actions', header: '작업', size: 180, cell: ({row:{original:message}}) => <EmailMessageAction message={message} ready={ready} /> },
  ];
  return <section className="min-w-0 space-y-3 rounded-lg border p-4" aria-label="인증 메일 전체 기록">
    <h2 className="text-base font-semibold">인증 메일 전체 기록</h2>
    <div className="flex flex-wrap items-end gap-3"><label className="space-y-1 text-sm"><span>메일 처리 상태</span><NativeSelect value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">전체</option>{Object.entries(labels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></label><Button variant="outline" disabled={query.isFetching} onClick={() => query.refetch()}>메일 기록 새로고침</Button></div>
    {!ready && <p className="text-sm text-muted-foreground">메일 연결과 발송 작업이 준비된 뒤 실패 메일을 재시도할 수 있습니다. 만료된 비밀번호 복구는 사용자 관리에서 새로 요청하세요.</p>}
    <div className="h-[min(60dvh,480px)]"><SsooDataGrid columns={columns} data={query.data?.items ?? []} loading={query.isLoading} error={query.error} onRetry={() => { void query.refetch(); }} fitViewport mobileSummaryColumns={['recipient', 'status', 'actions']} enableSorting={false} emptyState="해당하는 메일 기록이 없습니다."
      pagination={{page, pageSize: 20, total: query.data?.total ?? 0, onPageChange: setPage, disabled: query.isFetching}} /></div>
  </section>;
}

export function EmailMessageAction({ message, ready }: { message: AuthEmailDeliveryMessageSummary; ready: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const retry = useRetryEmailDelivery();
  const submit = async () => {
    try { await retry.mutateAsync({ messageId: message.messageId, reason: reason.trim(), expectedUpdatedAt: message.updatedAt }); setOpen(false); } catch { /* Preserve the failed action for correction. */ }
  };
  return <><Button variant="outline" size="sm" onClick={() => { retry.reset(); setReason(''); setOpen(true); }}>메일 상세·재시도</Button><Dialog open={open} onOpenChange={value => { if (!retry.isPending) setOpen(value); }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>인증 메일 상세</DialogTitle><DialogDescription>전달 상태와 실패 원인을 확인합니다.</DialogDescription></DialogHeader>
    <div className="space-y-3 break-words text-sm"><p>{message.recipient} · {message.templateCode}</p><p>{message.deliveryTarget === 'local' && message.statusCode === 'sent' ? '로컬 수신함 보관' : labels[message.statusCode] || message.statusCode}</p><p>생성 {date(message.createdAt)} · 전달 {date(message.sentAt)} · 실패 {date(message.failedAt)}</p>{message.failReason && <SsooErrorNotice error={message.failReason} />}<OperationHistoryButton filter={{ category: 'email', subjectId: message.messageId }} onNavigate={() => setOpen(false)} />
      {message.statusCode === 'failed' && <>{!ready && <p>발송 설정이 준비되지 않아 실패 상태를 유지합니다.</p>}<label className="block space-y-1"><span>메일 재시도 사유</span><Textarea value={reason} maxLength={2000} disabled={!ready || retry.isPending} onChange={event => setReason(event.target.value)} /></label>{retry.error && <SsooErrorNotice error={retry.error} />}<Button disabled={!ready || !reason.trim() || retry.isPending} onClick={submit}>이 메일 재시도</Button></>}
    </div>
  </DialogContent></Dialog></>;
}
