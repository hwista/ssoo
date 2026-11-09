'use client';
import { Badge, Button } from '@ssoo/web-ui';
import { SsooErrorNotice } from '@ssoo/web-shell';
import { usePlatformAccessDiagnosis } from '@/hooks/queries/useParticipationManagement';
import { programPath } from '../access/program-context';
import { ACCOUNT_STATUS_LABELS, PARTICIPATION_STATUS_LABELS } from '../access/operating-labels';
import { ROLE_LABELS } from '../access/RequestHistory';
import { useTabStore } from '@/stores/tab.store';
import { getAdminTabOptions } from '@/components/layout/navigation';

export function PlatformAccessDiagnosisPanel({ user }: { user: { id: string; userName: string; loginId: string } }) {
  const query = usePlatformAccessDiagnosis(user.id);
  const openTab = useTabStore(state => state.openTab);
  const result = query.data;
  return <section aria-label="플랫폼 이용 자격 진단" className="space-y-3 rounded-lg border p-4">
    <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">플랫폼 이용 자격 진단</h3><div className="flex gap-2"><Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>진단 새로고침</Button><Button variant="outline" onClick={() => openTab(getAdminTabOptions(programPath('/memberships', { userId: user.id })))}>소속 관리 ↗</Button><Button variant="outline" onClick={() => openTab(getAdminTabOptions(programPath('/service-grants', { userId: user.id })))}>이용권 관리 ↗</Button></div></div>
    {query.isError ? <SsooErrorNotice error={query.error} /> : query.isLoading ? <p>이용 자격을 확인하는 중...</p> : result ? <>
      <div className="flex flex-wrap items-center gap-2 text-sm"><strong>{user.userName}</strong><span className="text-muted-foreground">{user.loginId}</span><Badge variant="outline">계정 {ACCOUNT_STATUS_LABELS[result.accountStatus] ?? result.accountStatus}</Badge><Badge variant="outline">{PARTICIPATION_STATUS_LABELS[result.participationStatus]}</Badge><span>유효 소속 {result.effectiveMembershipCount}개</span></div>
      <p className="text-xs text-muted-foreground">{new Date(result.generatedAt).toLocaleString('ko-KR')} 기준. 앱 진입 자격이며 개별 업무 자료의 권한은 해당 앱에서 추가 검사합니다. 회수·만료·소속 상세는 소속·이용권 관리에서 확인합니다.</p>
      <div className="grid gap-3 lg:grid-cols-2">
        {result.services.map(item => <article key={item.serviceCode} className="space-y-3 rounded-md border p-3" aria-label={`${item.serviceCode.toUpperCase()} 접근 결과`}>
          <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-semibold">{item.serviceCode.toUpperCase()}</h4><Badge variant={item.allowed ? 'outline' : 'destructive'}>{item.allowed ? '접근 가능' : '접근 불가'}</Badge></div>
          <p className="text-sm">{item.reason}</p>
          {item.allowed ? <p className="text-xs text-muted-foreground">적용 역할: {item.roleCodes.map(role => role === 'admin' ? '플랫폼 관리자' : ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role).join(', ') || '내 업무 이용'}. 업무 기능의 허용 여부는 아래 기능 권한 판정에서 확인합니다.</p>
            : <div className="space-y-2"><p className="text-sm">{result.accountStatus !== 'active' ? '계정 상태와 잠금 여부를 먼저 확인하세요.' : result.participationStatus !== 'active' ? '플랫폼 참여 승인·중지 상태를 먼저 확인하세요.' : '이 사용자의 소속과 이용권 만료·회수 여부를 확인하세요.'}</p>
              <Button size="sm" variant="outline" onClick={() => result.accountStatus !== 'active' || result.participationStatus !== 'active'
                ? openTab(getAdminTabOptions(`/accounts?search=${encodeURIComponent(user.loginId)}&userId=${encodeURIComponent(user.id)}`)) : openTab(getAdminTabOptions(programPath(result.effectiveMembershipCount === 0 ? '/memberships' : '/service-grants', { userId: user.id, ...(result.effectiveMembershipCount ? { serviceCode: item.serviceCode } : {}) })))}>{result.accountStatus !== 'active' || result.participationStatus !== 'active' ? '이 사용자 계정 확인' : result.effectiveMembershipCount === 0 ? '소속 관리 ↗' : '이용권 관리 ↗'}</Button>
            </div>}
          <details className="text-xs text-muted-foreground"><summary className="cursor-pointer py-1">판정 근거 식별자</summary><p className="mt-2 break-all">조직: {item.organizationIds.join(', ') || '없음'}<br />이용권: {item.grantIds.join(', ') || '없음'}</p></details>
        </article>)}
      </div>
    </> : null}
  </section>;
}
