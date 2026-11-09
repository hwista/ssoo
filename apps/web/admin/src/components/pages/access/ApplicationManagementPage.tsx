'use client';

import { useState } from 'react';
import { resolveCommonSearchResultHref } from '@ssoo/web-auth';
import { SsooDataWorkspacePage, type SsooDataGridColumnDef } from '@ssoo/web-shell';
import { Button, NativeSelect } from '@ssoo/web-ui';
import { getAdminTabOptions, getAdminBreadcrumb } from '@/components/layout/navigation';
import { useTabStore } from '@/stores/tab.store';
import { readProgramContext, programPath } from './program-context';
import { ServiceGrantManagementPanel } from './ServiceGrantManagementPanel';

const applications = [
  { code: 'admin', name: '플랫폼 관리', responsibility: '공통 마스터·권한·계정·운영', policy: '공통 관리: 플랫폼 관리자. 신청·위임 승인: 허용 범위.' },
  { code: 'crm', name: '고객·영업 관리', responsibility: '고객·영업 업무와 도메인 설정' },
  { code: 'pms', name: '프로젝트 관리', responsibility: '프로젝트 업무와 도메인 설정' },
  { code: 'dms', name: '문서 관리', responsibility: '문서·지식 업무와 도메인 설정' },
  { code: 'sns', name: '협업', responsibility: '협업 업무와 도메인 설정' },
] as const;

export function ApplicationManagementPage({ view = 'catalog', path = '' }: { view?: 'grants' | 'catalog'; path?: string }) {
  const openTab = useTabStore(state => state.openTab);
  const context = readProgramContext(path);
  const [service, setService] = useState(context.serviceCode ?? '');
  const openRelated = () => openTab(getAdminTabOptions(view === 'grants' ? '/applications' : '/service-grants'));
  if (view === 'grants') return <ServiceGrantManagementPanel key={service} standalone userId={context.userId} organizationId={context.organizationId} serviceCode={service || undefined}
    relatedAction={{ label: '애플리케이션 기준 보기', variant: 'outline', onClick: openRelated }}
    serviceFilterSlot={<NativeSelect aria-label="애플리케이션" value={service} onChange={event => setService(event.target.value)}><option value="">전체 업무 앱</option>{applications.filter(app => app.code !== 'admin').map(app => <option key={app.code} value={app.code}>{app.code.toUpperCase()} · {app.name}</option>)}</NativeSelect>} />;
  const columns: SsooDataGridColumnDef<(typeof applications)[number]>[] = [
    { id: 'actions', header: '이용권', size: 135, cell: ({ row: { original: app } }) => app.code === 'admin' ? '플랫폼 관리 권한' : <Button variant="outline" size="sm" onClick={() => openTab(getAdminTabOptions(programPath('/service-grants', { serviceCode: app.code })))}>{app.code.toUpperCase()} 이용권 보기</Button> },
    { id: 'name', header: '식별자·이름', size: 200, cell: ({ row: { original: app } }) => `${app.code.toUpperCase()} · ${app.name}` },
    { accessorKey: 'responsibility', header: '관리 책임', size: 180 },
    { id: 'policy', header: '이용 정책', size: 280, cell: ({ row: { original: app } }) => 'policy' in app ? app.policy : '계정 활성 · 참여 승인 · 유효 이용권. 플랫폼 관리자는 관리 권한 적용.' },
    { id: 'url', header: '접속 경로', size: 180, cell: ({ row: { original: app } }) => {
      const href = resolveCommonSearchResultHref({ sourceApp: app.code, target: { sourceApp: app.code, path: '/' } });
      return href ? <Button asChild variant="link"><a href={href} target="_blank" rel="noreferrer">{href}</a></Button> : '접속 경로 설정 확인 필요';
    } },
  ];
  return <SsooDataWorkspacePage compact title="애플리케이션 기준" description="플랫폼 5개 앱의 관리 책임, 이용 정책과 접속 경로를 확인합니다. 앱 목록·접속 경로는 배포 설정을 따릅니다. 조직별 이용권 외에 남아 있는 플랫폼 전체 이용권도 확인해야 합니다."
    breadcrumbItems={getAdminBreadcrumb('/applications')}
    toolbar={{ actions: [{ label: '서비스 이용권 관리 열기', variant: 'outline', onClick: openRelated }] }}
    table={{ columns, data: [...applications], fitViewport: true, mobileSummaryColumns: ['name', 'responsibility', 'actions', 'url'], enableSorting: false }} />;
}
