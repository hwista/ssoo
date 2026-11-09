'use client';
import { useState } from 'react';
import { getAdminBreadcrumb } from '@/components/layout/navigation';
import { SsooErrorNotice, SsooWorkspacePage, SsooDataGrid } from '@ssoo/web-shell';
import { Button } from '@ssoo/web-ui';
import { MailCheck, RefreshCw, Send } from 'lucide-react';
import { useAuthProviderSettings, useEmailDeliveryStatus, useRunEmailDelivery } from '@/hooks/queries/useAuthAdmin';
import { MailSettingsPanel } from './MailSettingsPanel';
import { EmailMessagesPanel, EmailMessageAction } from './EmailMessagesPanel';
import { useTabStore } from '@/stores/tab.store';
import { getAdminTabOptions } from '@/components/layout/navigation';
function formatDateTime(value?: string | null): string {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ value }: { value: string }) {
  const tone = value === 'pending'
    ? 'bg-ssoo-warning-bg text-ssoo-warning'
    : value === 'approved'
      ? 'bg-ssoo-success-bg text-ssoo-success'
      : 'bg-muted text-muted-foreground';

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {({ pending: '대기', processing: '전송 중', sent: '발송 서버 수락', failed: '실패', superseded: '대체됨', consumed: '사용 완료' } as Record<string, string>)[value] ?? value}
    </span>
  );
}


export function EmailOperationsPage() {
  const [activeView, setActiveView] = useState('admin-auth-email-delivery');
  const settingsQuery = useAuthProviderSettings();
  const settings = settingsQuery.data?.data;
  const emailDeliveryQuery = useEmailDeliveryStatus();
  const emailDelivery = emailDeliveryQuery.data?.data;
  const runEmailDeliveryMutation = useRunEmailDelivery();
  const openTab = useTabStore(state => state.openTab);
  return <SsooWorkspacePage compact breadcrumbItems={getAdminBreadcrumb("/email-operations")} scrollBody title="인증 메일 운영" description="메일 연결·시험 발송·전송 기록·실패 재시도와 로컬 수신함을 관리합니다."
    index={{ ariaLabel: '인증 메일 운영 항목', items: [{id:'admin-auth-email-delivery',label:'발송 상태·수동 실행'}, {id:'mail-records',label:'전체 전송 기록'}, {id:'mail-connection',label:'연결·시험 발송·수신함'}], activeItemId: activeView, onItemSelect:item => setActiveView(item.id) }}>
    <div><Button variant="outline" onClick={() => openTab(getAdminTabOptions('/auth'))}>인증 정책 열기</Button></div>
    {settingsQuery.isError ? <SsooErrorNotice error={settingsQuery.error} actions={[{label:'인증 정책 다시 조회',onClick:() => settingsQuery.refetch()}]} /> : null}
      <div hidden={activeView !== 'admin-auth-email-delivery'} id="admin-auth-email-delivery" className="scroll-mt-4 rounded-lg border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <MailCheck className="h-5 w-5" />
              메일 전송 현황
            </h2>

          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                settings?.emailDeliveryMode === 'disabled'
                  ? 'bg-muted text-muted-foreground'
                  : emailDelivery?.state === 'ready'
                    ? 'bg-ssoo-success-bg text-ssoo-success'
                    : 'bg-destructive/10 text-destructive'
              }`}
            >
              {settings?.emailDeliveryMode === 'disabled'
                ? '정책 비활성'
                : emailDelivery?.state === 'ready' ? '처리 준비됨' : '전달 차단'}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={runEmailDeliveryMutation.isPending || !settings || settings.emailDeliveryMode === 'disabled'}
              onClick={() => runEmailDeliveryMutation.mutate()}
            >
              <Send className="mr-1 h-4 w-4" />
              지금 처리
            </Button>
            <Button variant="outline" size="sm" onClick={() => emailDeliveryQuery.refetch()}>
              <RefreshCw className="mr-1 h-4 w-4" />
              새로고침
            </Button>
          </div>
        </div>

        {emailDeliveryQuery.isLoading ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">로딩 중...</div>
        ) : emailDeliveryQuery.isError || !emailDelivery ? (
          <SsooErrorNotice className="px-5 py-6">메일 전달 상태를 조회하지 못했습니다.</SsooErrorNotice>
        ) : (
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">대기</p><p className="mt-1 text-xl font-semibold">{emailDelivery.counts.pending ?? 0}</p></div>
              <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">처리 중</p><p className="mt-1 text-xl font-semibold">{emailDelivery.counts.processing ?? 0}</p></div>
              <div className="rounded-md border p-3"><p className="whitespace-normal text-xs text-muted-foreground">처리 완료<span className="block">보관·전달</span></p><p className="mt-1 text-xl font-semibold">{emailDelivery.counts.sent ?? 0}</p></div>
              <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">실패</p><p className="mt-1 text-xl font-semibold">{emailDelivery.counts.failed ?? 0}</p></div>
            </div>
            <p className={`text-sm ${emailDelivery.state === 'blocked' ? 'text-destructive' : 'text-muted-foreground'}`}>
              {emailDelivery.reason}
            </p>
            <details className="text-sm text-muted-foreground">
              <summary className="cursor-pointer py-1">메일 연결·전달 상태 안내</summary>
              <p className="mt-2 break-words">
                메일 연결 설정에서 로컬 수신함·회사 SMTP·Microsoft 메일을 선택할 수 있습니다.
                연결 확인 후 저장·적용하고 시험 메일로 실제 수신을 확인하세요.
                기존 서버 환경 설정을 선택하면 AUTH_EMAIL_SMTP_* 환경변수를 계속 사용합니다.
                로컬 보관 및 발송 서버의 수락은 외부 수신 완료와 다릅니다.
              </p>
            </details>

            {emailDelivery.recent.length === 0 ? (
              <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">메일 이력이 없습니다.</div>
            ) : (
              <SsooDataGrid fitViewport enableSorting={false} mobileSummaryColumns={['recipient', 'state', 'reason', 'actions']}
                data={emailDelivery.recent} columns={[
                  { accessorKey: 'recipient', header: '수신자', size: 150 },
                  { id: 'state', header: '상태', size: 130, cell: ({row:{original:message}}) => message.deliveryTarget === 'local' && message.statusCode === 'sent' ? '로컬 수신함 보관' : <StatusBadge value={message.statusCode} /> },
                  { id: 'templateCode', header: '메일 유형', size: 140, cell: ({row:{original:message}}) => message.templateCode === 'auth.password-reset' ? '비밀번호 복구' : message.templateCode },
                  { id: 'date', header: '생성일', size: 155, cell: ({row:{original:message}}) => formatDateTime(message.createdAt) },
                  { id: 'reason', header: '실패 사유', size: 175, cell: ({row:{original:message}}) => message.failReason ? <SsooErrorNotice compact error={message.failReason} /> : '—' },
                  { id: 'actions', header: '작업', size: 145, cell: ({row:{original:message}}) => <EmailMessageAction message={message} ready={emailDelivery.state === 'ready'} /> },
                ]} />
            )}
          </div>
        )}
      </div>

    <div hidden={activeView !== 'mail-records'} id="mail-records" className="scroll-mt-4"><EmailMessagesPanel ready={emailDelivery?.state === 'ready'} /></div>
    <div hidden={activeView !== 'mail-connection'} id="mail-connection" className="scroll-mt-4"><MailSettingsPanel /></div>
  </SsooWorkspacePage>;
}
