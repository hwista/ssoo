'use client';
import { ProgramContext } from '../access/ProgramContext';
import { readProgramContext } from '../access/program-context';
import { getAdminBreadcrumb } from '@/components/layout/navigation';

import { SsooDataGrid, SsooErrorNotice } from '@ssoo/web-shell';
import { getAdminTabOptions } from '@/components/layout/navigation';
import { useTabStore } from '@/stores/tab.store';
import { ApprovalAuthoritiesTab } from './ApprovalAuthoritiesTab';
import { CommonPermissionsPanel } from './CommonPermissionsPanel';
import { PlatformAccessDiagnosisPanel } from './PlatformAccessDiagnosisPanel';
import { OperationHistoryButton } from '../access/OperationHistoryButton';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { RefreshCcw, Search, Shield, AlertTriangle, Users, Save, ScrollText } from 'lucide-react';
import { SsooSearchInput, SsooWorkspacePage } from '@ssoo/web-shell';
import type {
  AccessInspectionResult,
  PermissionCatalogGroup,
  PermissionExceptionRecord,
  PermissionResolutionTrace,
} from '@ssoo/types/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useAccessAudit,
  useInspectAccess,
  useListExceptions,
  usePermissionCatalog,
  useRolePermissions,
  useUpdateRolePermissions,
} from '@/hooks/queries/useAccessOps';
import { useUserList } from '@/hooks/queries/useUsers';
import type { InspectAccessParams, ListExceptionsParams } from '@/lib/api/endpoints/accessOps';
import { Checkbox, NativeSelect, Textarea } from '@ssoo/web-ui';

type TabId = 'approval-authorities' | 'grants' | 'catalog' | 'inspect' | 'exceptions' | 'audit' | 'organization-permissions' | 'user-permissions';

interface InspectDraft {
  targetObjectType: string;
  targetObjectId: string;
  domainPermissionCodes: string;
  includeInactive: boolean;
}

const INITIAL_DRAFT: InspectDraft = {
  targetObjectType: '',
  targetObjectId: '',
  domainPermissionCodes: '',
  includeInactive: false,
};

function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const OWNER_LABELS: Record<PermissionCatalogGroup['owner'], { title: string; description: string }> = {
  'admin-platform': { title: '플랫폼 공통 관리', description: '사용자·조직·역할과 플랫폼 관리 기능' },
  dms: { title: 'DMS · 문서 관리', description: '문서 조회·작성·검색·공유와 문서 관리 기능' },
  crm: { title: 'CRM · 고객·영업 관리', description: '고객·영업 업무와 관리 기능' },
  pms: { title: 'PMS · 프로젝트 관리', description: '프로젝트 업무와 관리 기능' },
  sns: { title: 'SNS · 협업', description: '협업 업무와 관리 기능' },
  cms: { title: 'CMS · 콘텐츠 관리', description: '콘텐츠 업무와 관리 기능' },
  unknown: { title: '미분류 기능', description: '관리 책임 분류 확인이 필요한 기능' },
};
const CATALOG_STATUS_LABELS = { 'launch-active': '사용 중', foundation: '기반 기능', planned: '준비 중' };

function CodeList({
  title,
  codes,
  emptyText = '적용된 항목이 없습니다.',
}: {
  title: string;
  codes: string[];
  emptyText?: string;
}) {
  const catalog = usePermissionCatalog();
  const names = new Map(catalog.data?.groups.flatMap(group => group.items.map(item => [item.permissionCode, item.permissionCode === 'system.override' ? '플랫폼 전체 관리' : item.permissionName] as const)) ?? []);
  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-medium">{title}</h4>
        <span className="text-xs text-muted-foreground">{codes.length}개</span>
      </div>
      {codes.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {codes.map((code) => (
            <span
              key={code}
              className="rounded-full border bg-muted/50 px-2 py-0.5 text-caption-2xs font-medium"
            >
              {names.get(code) ?? code}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      )}
      {codes.length ? <details className="text-xs text-muted-foreground"><summary className="cursor-pointer py-1">권한 코드 보기</summary><p className="mt-1 break-all">{codes.join(', ')}</p></details> : null}
    </div>
  );
}

function PolicyTraceSection({
  title,
  snapshot,
}: {
  title: string;
  snapshot: AccessInspectionResult['action'] | NonNullable<AccessInspectionResult['object']>;
}) {
  const policy = snapshot.policy as PermissionResolutionTrace;

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">
            허용 기능 {snapshot.grantedPermissionCodes.length}개 · 관리자 전체 권한{' '}
            {policy.hasSystemOverride ? '적용' : '미적용'}
          </p>
        </div>
        {'targetObjectType' in snapshot && snapshot.targetObjectType ? (
          <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
            {snapshot.targetObjectType}:{snapshot.targetObjectId}
          </span>
        ) : null}
      </div>

      <CodeList title="최종 허용 기능" codes={snapshot.grantedPermissionCodes} />

      {'targetObjectType' in snapshot ? (
        <CodeList
          title="입력한 업무 권한"
          codes={snapshot.domainPermissionCodes}
          emptyText="추가 업무 권한 입력이 없습니다."
        />
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <CodeList title="기본 역할 권한" codes={policy.rolePermissionCodes} />
        <CodeList title="조직 기본 권한" codes={policy.organizationPermissionCodes} />
        <CodeList title="User grant" codes={policy.userGrantedPermissionCodes} />
        <CodeList title="User revoke" codes={policy.userRevokedPermissionCodes} />
        <CodeList title="Domain grant" codes={policy.domainGrantedPermissionCodes} />
        <CodeList title="Object grant" codes={policy.objectGrantedPermissionCodes} />
        <CodeList title="Object revoke" codes={policy.objectRevokedPermissionCodes} />
      </div>
    </section>
  );
}

function ExceptionRow({ item }: { item: PermissionExceptionRecord }) {
  return (
    <TableRow>
      <TableCell>
        <div className="font-medium text-sm">{item.permissionCode}</div>
        <div className="text-xs text-muted-foreground">{item.permissionCode === 'system.override' ? '플랫폼 전체 관리' : item.permissionName}</div>
      </TableCell>
      <TableCell>
        <span className="text-sm">{item.userName}</span>
        <div className="text-xs text-muted-foreground">{item.loginId}</div>
      </TableCell>
      <TableCell>
        <span
          className={
            item.effectType === 'grant'
              ? 'rounded-full bg-ssoo-success-bg px-2 py-0.5 text-xs font-medium text-ssoo-success'
              : 'rounded-full bg-ssoo-danger-bg px-2 py-0.5 text-xs font-medium text-ssoo-danger'
          }
        >
          {item.effectType === 'grant' ? '허용' : '차단'}
        </span>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {item.exceptionAxis === 'action' ? '기능' : item.exceptionAxis === 'object' ? '자료' : item.exceptionAxis}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {item.targetObjectType && item.targetObjectId
          ? `${item.targetObjectType}:${item.targetObjectId}`
          : item.targetOrgName ?? '-'}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {item.reason ?? item.memo ?? '-'}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatDateTime(item.expiresAt)}
      </TableCell>
      <TableCell>
        <span
          className={
            item.isActive ? 'text-xs text-ssoo-success' : 'text-xs text-muted-foreground'
          }
        >
          {!item.isActive ? '회수됨' : item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now() ? '만료' : '미회수'}
        </span>
      </TableCell>
    </TableRow>
  );
}

function ExceptionTable({
  title,
  items,
}: {
  title: string;
  items: PermissionExceptionRecord[];
}) {
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">{items.length}건</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">기록이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">기능 권한</TableHead>
                <TableHead className="text-xs">효과</TableHead>
                <TableHead className="text-xs">대상</TableHead>
                <TableHead className="text-xs">사유</TableHead>
                <TableHead className="text-xs">만료</TableHead>
                <TableHead className="text-xs">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{item.permissionCode}</div>
                    <div className="text-xs text-muted-foreground">{item.permissionCode === 'system.override' ? '플랫폼 전체 관리' : item.permissionName}</div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        item.effectType === 'grant' ? 'text-ssoo-success' : 'text-destructive'
                      }
                    >
                      {item.effectType === 'grant' ? '허용' : '차단'}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.targetObjectType && item.targetObjectId
                      ? `${item.targetObjectType}:${item.targetObjectId}`
                      : item.targetOrgName ?? '-'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.reason ?? item.memo ?? '-'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(item.expiresAt)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        item.isActive
                          ? 'text-xs text-ssoo-success'
                          : 'text-xs text-muted-foreground'
                      }
                    >
                      {!item.isActive ? '회수됨' : item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now() ? '만료' : '미회수'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}



function AdminSummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-lg border bg-background px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
        </div>
        <div className="rounded-full border bg-muted/40 p-2 text-muted-foreground">{icon}</div>
      </div>
    </article>
  );
}

function CatalogGroupCard({ group }: { group: PermissionCatalogGroup }) {
  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{OWNER_LABELS[group.owner].title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{OWNER_LABELS[group.owner].description}</p>
        </div>
        <span
          className={
            group.launchFocus
              ? 'rounded-full border border-ssoo-success-border bg-ssoo-success-bg px-2 py-0.5 text-xs font-medium text-ssoo-success'
              : 'rounded-full border px-2 py-0.5 text-xs text-muted-foreground'
          }
        >
          {group.launchFocus ? '운영 검증 대상' : '준비 중인 기능 포함'}
        </span>
      </div>
      <SsooDataGrid fitViewport enableSorting={false} mobileSummaryColumns={['permission', 'status']}
        data={group.items} columns={[
          { id: 'permission', header: '기능 권한', size: 220, cell: ({row:{original:item}}) => <><strong>{item.permissionCode === 'system.override' ? '플랫폼 전체 관리' : item.permissionName}</strong><p className="break-all text-xs text-muted-foreground">{item.permissionCode}</p></> },
          { accessorKey: 'capability', header: '기능 설명', size: 220 },
          { accessorKey: 'menuSurface', header: '메뉴 위치', size: 220 },
          { accessorKey: 'operationSurface', header: '운영 책임', size: 220 },
          { id: 'status', header: '상태', size: 100, cell: ({row:{original:item}}) => CATALOG_STATUS_LABELS[item.status] },
        ]} />
    </section>
  );
}

function CatalogTab() {
  const catalogQuery = usePermissionCatalog();
  const catalog = catalogQuery.data;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">플랫폼/앱별 권한 기능 명세</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              플랫폼과 각 앱의 기능 권한을 확인합니다. 이 화면에서 역할별 허용 기능을 관리하고, 실제 접근은 각 앱의 이용 자격과 개별 자료 권한을 함께 적용해 판단합니다.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => catalogQuery.refetch()}>
            <RefreshCcw className="mr-1 h-3 w-3" />
            새로고침
          </Button>
        </div>
        {catalog ? (
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <AdminSummaryCard title="전체 권한" value={catalog.summary.total} icon={<Shield className="h-4 w-4" />} />
            <AdminSummaryCard title="사용 중인 기능" value={catalog.summary.launchActive} icon={<CheckIcon />} />
            <AdminSummaryCard title="기반 기능" value={catalog.summary.foundation} icon={<Users className="h-4 w-4" />} />
            <AdminSummaryCard title="준비 중" value={catalog.summary.planned} icon={<AlertTriangle className="h-4 w-4" />} />
          </div>
        ) : null}
      </div>

      {catalogQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">권한 명세를 불러오는 중...</p>
      ) : catalogQuery.isError ? (
        <SsooErrorNotice className="p-4">
          권한 명세를 불러오지 못했습니다.
        </SsooErrorNotice>
      ) : catalog ? (
        <div className="space-y-4">
          {catalog.groups.map((group) => (
            <CatalogGroupCard key={group.owner} group={group} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CheckIcon() {
  return <Shield className="h-4 w-4" />;
}

/* ────────────── Inspect Tab ────────────── */
function InspectTab({ initialUserId = '' }: { initialUserId?: string }) {
  const [selectedUserId, setSelectedUserId] = useState(initialUserId);
  useEffect(() => { if (initialUserId) setSelectedUserId(initialUserId); }, [initialUserId]);
  const [userSearch, setUserSearch] = useState('');
  const [draft, setDraft] = useState<InspectDraft>(INITIAL_DRAFT);
  const [inspectParams, setInspectParams] = useState<InspectAccessParams | null>(null);

  const usersQuery = useUserList({ page: 1, limit: 100 }, true);
  const users = useMemo(() => usersQuery.data?.data ?? [], [usersQuery.data?.data]);

  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.userName.toLowerCase().includes(q) ||
        u.loginId.toLowerCase().includes(q),
    );
  }, [users, userSearch]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId],
  );

  useEffect(() => {
    if (selectedUserId) {
      setDraft(INITIAL_DRAFT);
      setInspectParams({ userId: selectedUserId });
    } else {
      setInspectParams(null);
    }
  }, [selectedUserId]);

  const inspectQuery = useInspectAccess(inspectParams, !!inspectParams);
  const result = inspectQuery.data;

  const applyInspect = () => {
    if (!selectedUserId) return;
    setInspectParams({
      userId: selectedUserId,
      ...(draft.targetObjectType ? { targetObjectType: draft.targetObjectType } : {}),
      ...(draft.targetObjectId ? { targetObjectId: draft.targetObjectId } : {}),
      ...(draft.domainPermissionCodes
        ? { domainPermissionCodes: draft.domainPermissionCodes }
        : {}),
      ...(draft.includeInactive ? { includeInactive: true } : {}),
    });
  };

  return (
    <div className="space-y-4">
      {/* User selector */}
      <details open={!selectedUser} className="rounded-lg border bg-card p-4">
        <summary className="cursor-pointer text-sm font-semibold">{selectedUser ? `대상: ${selectedUser.userName} · ${selectedUser.loginId} — 사용자 변경` : '대상 사용자 선택'}</summary>

        {usersQuery.isLoading && (
          <p className="text-sm text-muted-foreground">사용자 목록을 불러오는 중...</p>
        )}

        {usersQuery.isError && (
          <SsooErrorNotice className="gap-2">
            사용자 목록을 불러오지 못했습니다.
            <Button variant="outline" size="sm" onClick={() => usersQuery.refetch()}>
              <RefreshCcw className="mr-1 h-3 w-3" />
              다시 시도
            </Button>
          </SsooErrorNotice>
        )}

        {!usersQuery.isLoading && !usersQuery.isError && (
          <>
            <div className="flex gap-3">
              <SsooSearchInput
                id="admin-access-user-lookup-input"
                name="admin-access-user-lookup-query"
                ariaLabel="권한 대상 사용자 검색"
                intent="entity-lookup"
                placeholder="이름 또는 로그인 ID 검색..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="max-w-xs"
              />
            </div>
            {filteredUsers.length > 0 && (
          <div className="mt-2 max-h-48 overflow-auto rounded-md border">
            {filteredUsers.map((u) => (
              <Button variant="plain" size="plain"
                key={u.id}
                type="button"
                onClick={() => setSelectedUserId(u.id)}
                className={`flex w-full items-center gap-3 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/50 ${
                  u.id === selectedUserId ? 'bg-primary/10 font-medium' : ''
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{u.userName}</span>
                <span className="text-xs text-muted-foreground">{u.loginId}</span>
                <span className="rounded-full border px-1.5 py-0.5 text-caption-xs text-muted-foreground">
                  {({ admin: '플랫폼 관리자', manager: '매니저', user: '사용자', viewer: '조회자' } as Record<string, string>)[u.roleCode] ?? u.roleCode}
                </span>
              </Button>
            ))}
          </div>
        )}
          </>
        )}
      </details>

      {/* Inspect parameters */}
      {selectedUser ? <PlatformAccessDiagnosisPanel user={selectedUser} /> : null}
      {selectedUser && (
        <details className="rounded-lg border bg-card p-4"><summary className="cursor-pointer text-sm font-semibold">세부 자료 권한 조회 (선택)</summary><div className="pt-3">
          <div className="mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">
              {selectedUser.userName} ({selectedUser.loginId})
            </h3>
            <span className="rounded-full border px-2 py-0.5 text-caption-xs text-muted-foreground">
              {({ admin: '플랫폼 관리자', manager: '매니저', user: '사용자', viewer: '조회자' } as Record<string, string>)[selectedUser.roleCode] ?? selectedUser.roleCode}
            </span>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.4fr_auto]">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">자료 유형</label>
              <Input
                value={draft.targetObjectType}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, targetObjectType: e.target.value }))
                }
                placeholder="예: dms.document"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">자료 식별자</label>
              <Input
                value={draft.targetObjectId}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, targetObjectId: e.target.value }))
                }
                placeholder="예: 123"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                추가 업무 권한 코드
              </label>
              <Input
                value={draft.domainPermissionCodes}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, domainPermissionCodes: e.target.value }))
                }
                placeholder="여러 코드는 쉼표로 구분"
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                <Input
                  type="checkbox"
                  checked={draft.includeInactive}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, includeInactive: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-muted-foreground"
                />
                비활성 포함
              </label>
              <Button onClick={applyInspect}>
                <Search className="mr-1 h-4 w-4" />
                조회
              </Button>
            </div>
          </div>
        </div></details>
      )}

      {/* Results */}
      {inspectQuery.isLoading && (
        <div className="flex h-40 items-center justify-center rounded-lg border text-muted-foreground">
          권한 정보를 불러오는 중...
        </div>
      )}

      {inspectQuery.isError && (
        <SsooErrorNotice className="space-y-3 p-4">
          <p className="text-sm text-destructive">
            {inspectQuery.error instanceof Error
              ? inspectQuery.error.message
              : '권한 진단 조회에 실패했습니다.'}
          </p>
          <Button variant="outline" onClick={() => inspectQuery.refetch()}>
            <RefreshCcw className="mr-1 h-4 w-4" />
            다시 시도
          </Button>
        </SsooErrorNotice>
      )}

      {result && (
        <div className="space-y-4">
          <section className="grid gap-3 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-xs text-muted-foreground">대상 사용자</div>
              <div className="mt-1 text-sm font-medium">{result.subject.userName}</div>
              <div className="mt-1 text-xs text-muted-foreground">{result.subject.loginId}</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-xs text-muted-foreground">조직 수</div>
              <div className="mt-1 text-sm font-medium">{result.organizationIds.length}개</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {result.organizationIds.join(', ') || '-'}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-xs text-muted-foreground">기본 역할 권한</div>
              <div className="mt-1 text-sm font-medium">{({ admin: '플랫폼 관리자', manager: '매니저', user: '사용자', viewer: '조회자' } as Record<string, string>)[result.subject.roleCode] ?? result.subject.roleCode}</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-xs text-muted-foreground">관리자 전체 권한</div>
              <div className="mt-1 text-sm font-medium">
                {result.action.policy.hasSystemOverride ? '허용' : '미허용'}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                비활성 기록 {result.input.includeInactive ? '포함' : '제외'}
              </div>
            </div>
          </section>

          <PolicyTraceSection title="기능 권한 판정" snapshot={result.action} />
          {result.object ? (
            <PolicyTraceSection title="자료 권한 판정" snapshot={result.object} />
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            <ExceptionTable
              title="기능 권한 예외"
              items={result.permissionExceptions.action}
            />
            <ExceptionTable
              title="자료 권한 예외"
              items={result.permissionExceptions.object}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────── Exceptions Tab ────────────── */
function ExceptionsTab({ userId }: { userId?: string }) {
  const [filters, setFilters] = useState<ListExceptionsParams>({
    userId,
    includeInactive: false,
    limit: 100,
  });
  const [loginIdSearch, setLoginIdSearch] = useState('');

  const exceptionsQuery = useListExceptions(filters);
  const result = exceptionsQuery.data;

  const applySearch = () => {
    setFilters((prev) => ({
      ...prev,
      loginId: loginIdSearch || undefined,
    }));
  };

  return (
    <div className="space-y-4">
      {userId && <ProgramContext context={{ userId }} basePath="/user-permissions?tab=exceptions" />}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">예외 검색</h3>
        <div className="flex flex-wrap gap-3">
          <SsooSearchInput
            id="admin-access-login-id-filter-input"
            name="admin-access-login-id-filter-query"
            ariaLabel="권한 예외 로그인 ID 필터"
            disabled={Boolean(userId)}
            intent="data-filter"
            placeholder="로그인 ID 필터..."
            value={loginIdSearch}
            onChange={(e) => setLoginIdSearch(e.target.value)}
            className="max-w-xs"
          />
          <NativeSelect
            value={filters.exceptionAxis ?? ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                exceptionAxis: (e.target.value as 'action' | 'object') || undefined,
              }))
            }
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">전체 적용 범위</option>
            <option value="action">기능 권한</option>
            <option value="object">자료 권한</option>
          </NativeSelect>
          <label className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
            <Input
              type="checkbox"
              checked={filters.includeInactive ?? false}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, includeInactive: e.target.checked }))
              }
              className="h-4 w-4 rounded border-muted-foreground"
            />
            비활성 포함
          </label>
          <Button onClick={applySearch}>
            <Search className="mr-1 h-4 w-4" />
            검색
          </Button>
        </div>
      </div>

      {exceptionsQuery.isLoading && (
        <div className="flex h-40 items-center justify-center rounded-lg border text-muted-foreground">
          예외 내역을 불러오는 중...
        </div>
      )}

      {exceptionsQuery.isError && (
        <SsooErrorNotice className="space-y-3 p-4">
          <p className="text-sm text-destructive">
            {exceptionsQuery.error instanceof Error
              ? exceptionsQuery.error.message
              : '예외 내역 조회에 실패했습니다.'}
          </p>
          <Button variant="outline" onClick={() => exceptionsQuery.refetch()}>
            <RefreshCcw className="mr-1 h-4 w-4" />
            다시 시도
          </Button>
        </SsooErrorNotice>
      )}

      {result && (
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold">예외 내역</h3>
            <span className="text-xs text-muted-foreground">{result.total}건</span>
          </div>
          {result.items.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              <AlertTriangle className="mr-2 h-4 w-4" />
              예외 기록이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">기능 권한</TableHead>
                    <TableHead className="text-xs">사용자</TableHead>
                    <TableHead className="text-xs">효과</TableHead>
                    <TableHead className="text-xs">적용 범위</TableHead>
                    <TableHead className="text-xs">대상</TableHead>
                    <TableHead className="text-xs">사유</TableHead>
                    <TableHead className="text-xs">만료</TableHead>
                    <TableHead className="text-xs">상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((item) => (
                    <ExceptionRow key={item.id} item={item} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ────────────── Role Grants Tab ────────────── */
function RoleGrantsTab({ initialRoleId, onInspect }: { initialRoleId?: string; onInspect: (userId: string) => void }) {
  const openTab = useTabStore(state => state.openTab);
  const rolesQuery = useRolePermissions();
  const catalogQuery = usePermissionCatalog();
  const updateMutation = useUpdateRolePermissions();
  const [selectedRoleCode, setSelectedRoleCode] = useState('');
  const [draftCodes, setDraftCodes] = useState<string[]>([]);
  const [baseCodes, setBaseCodes] = useState<string[]>([]);
  const [draftRevision, setDraftRevision] = useState('');
  const edited = useRef(false);
  const loadedRole = useRef('');
  const [searchText, setSearchText] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [reason, setReason] = useState('');
  const [impactPage, setImpactPage] = useState(1);

  const roles = rolesQuery.data ?? [];
  const selectedRole = roles.find((role) => role.roleCode === selectedRoleCode && role.isActive)
    ?? (initialRoleId ? roles.find(role => role.roleId === initialRoleId && role.isActive)
      : roles.find(role => role.roleCode === 'user' && role.isActive) ?? roles.find(role => role.isActive));

  const impactUsers = useUserList({ roleCode: selectedRole?.roleCode, page: impactPage, limit: 20 });

  useEffect(() => {
    if (!selectedRole || (edited.current && loadedRole.current === selectedRole.roleCode)) return;
    loadedRole.current = selectedRole.roleCode;
    setBaseCodes(selectedRole.permissionCodes);
    setDraftRevision(selectedRole.revision);
    setSelectedRoleCode(selectedRole.roleCode);
    setDraftCodes(selectedRole.permissionCodes);
    setReason('');
    setImpactPage(1);
  }, [selectedRole]);

  const catalogGroups = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return (catalogQuery.data?.groups ?? [])
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => (
          !query
          || item.permissionCode.toLowerCase().includes(query)
          || item.permissionName.toLowerCase().includes(query)
        )),
      }))
      .filter((group) => group.items.length > 0);
  }, [catalogQuery.data, searchText]);

  const isDirty = selectedRole
    ? [...draftCodes].sort().join('|') !== [...baseCodes].sort().join('|')
    : false;

  const addedCodes = draftCodes.filter(code => !baseCodes.includes(code));
  const removedCodes = baseCodes.filter(code => !draftCodes.includes(code));
  const permissionName = (code: string) => catalogQuery.data?.groups.flatMap(group => group.items).find(item => item.permissionCode === code)?.permissionName ?? code;

  const togglePermission = (permissionCode: string, checked: boolean) => {
    edited.current = true;
    setDraftCodes((current) => (
      checked
        ? Array.from(new Set([...current, permissionCode]))
        : current.filter((code) => code !== permissionCode)
    ));
    setSuccessMessage('');
  };

  const save = async () => {
    if (!selectedRole || !isDirty || !reason.trim()) return;
    const confirmed = window.confirm(
      `${selectedRole.roleName} 역할의 권한을 ${draftCodes.length}개 항목으로 갱신할까요? 이 역할을 가진 ${selectedRole.assignedUserCount}명(활성 ${selectedRole.activeUserCount}명)에 영향을 줍니다.`,
    );
    if (!confirmed) return;
    try {
      const saved = await updateMutation.mutateAsync({
        roleCode: selectedRole.roleCode,
        permissionCodes: draftCodes,
        reason: reason.trim(),
        expectedRevision: draftRevision,
      });
      edited.current = false;
      setBaseCodes(saved.permissionCodes);
      setDraftCodes(saved.permissionCodes);
      setDraftRevision(saved.revision);
      setReason('');
      setSuccessMessage(`${selectedRole.roleName} 역할 권한을 저장했습니다.`);
    } catch {
      setSuccessMessage('');
    }
  };

  if (rolesQuery.isLoading || catalogQuery.isLoading) {
    return <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">역할 권한을 불러오는 중...</div>;
  }

  if (rolesQuery.isError || catalogQuery.isError) {
    const error = rolesQuery.error ?? catalogQuery.error;
    return (
      <SsooErrorNotice className="space-y-3 p-4">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : '역할 권한을 불러오지 못했습니다.'}
        </p>
        <Button variant="outline" onClick={() => Promise.all([rolesQuery.refetch(), catalogQuery.refetch()])}>
          <RefreshCcw className="mr-1 h-4 w-4" /> 다시 시도
        </Button>
      </SsooErrorNotice>
    );
  }

  if (initialRoleId && !selectedRole) {
    const requested = roles.find(role => role.roleId === initialRoleId);
    return <section className="space-y-3 rounded-lg border p-4" aria-label="요청한 역할 상태"><h2 className="font-semibold">{requested?.roleName ?? `역할 #${initialRoleId}`}</h2><p className="text-sm">{requested ? '비활성 역할입니다. 변경 이력은 확인할 수 있습니다.' : '요청한 역할을 찾을 수 없습니다.'}</p><div className="flex flex-wrap gap-2"><OperationHistoryButton filter={{ roleId: initialRoleId }} label="역할 변경 이력" /><Button variant="outline" onClick={() => openTab(getAdminTabOptions('/roles'))}>역할 대상 조건 해제</Button></div></section>;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-0 w-full sm:w-64 space-y-1 text-sm">
            <span className="font-medium">편집할 역할</span>
            <NativeSelect
              value={selectedRole?.roleCode ?? ''}
              disabled={updateMutation.isPending}
              onChange={(event) => { if (!isDirty || window.confirm('저장하지 않은 권한 변경을 버리고 다른 역할을 편집할까요?')) { edited.current = false; setSuccessMessage(''); updateMutation.reset(); setSelectedRoleCode(event.target.value); } }}
              className="w-full"
            >
              {roles.map((role) => (
                <option key={role.roleCode} value={role.roleCode} disabled={!role.isActive}>
                  {role.roleName} ({role.roleCode}) · {role.permissionCodes.length}개
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="min-w-0 w-full sm:w-64 flex-1 space-y-1 text-sm">
            <span className="font-medium">기능 권한 검색</span>
            <SsooSearchInput
              id="admin-permission-catalog-filter-input"
              name="admin-permission-catalog-filter-query"
              ariaLabel="Permission 코드 또는 이름 검색"
              intent="data-filter"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="기능 이름 또는 권한 코드"
            />
          </label>
          <Button onClick={save} disabled={!isDirty || !reason.trim() || updateMutation.isPending}>
            <Save className="mr-1 h-4 w-4" />
            {updateMutation.isPending ? '저장 중...' : '변경 저장'}
          </Button>
        </div>
        {isDirty && <div role="status" className="mt-3 space-y-1 rounded-md border p-3 text-sm"><p className="font-medium">저장 전 변경 확인 · 추가 {addedCodes.length}개 / 제거 {removedCodes.length}개</p>{addedCodes.length > 0 && <p>추가: {addedCodes.map(permissionName).join(", ")}</p>}{removedCodes.length > 0 && <p>제거: {removedCodes.map(permissionName).join(", ")}</p>}</div>}
        <label className="mt-3 block space-y-1 text-sm">
          <span>역할 권한 변경 사유</span>
          <Textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={1000} disabled={updateMutation.isPending} />
        </label>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>선택 {draftCodes.length}개</span>
          <span>범위 {selectedRole?.roleScopeCode === 'system' ? '플랫폼 공통' : selectedRole?.roleScopeCode ?? '-'}</span>
          <span>{selectedRole?.description ?? '설명 없음'}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => { if (!isDirty || window.confirm('저장하지 않은 권한 선택을 버리고 최신 상태를 조회할까요?')) { edited.current = false; updateMutation.reset(); void rolesQuery.refetch().then(result => { const current = result.data?.find(role => role.roleCode === selectedRole?.roleCode); if (current) { setDraftCodes(current.permissionCodes); setBaseCodes(current.permissionCodes); setDraftRevision(current.revision); setReason(''); } }); void impactUsers.refetch(); } }}>역할 권한 새로고침</Button>
          {selectedRole && <OperationHistoryButton label="역할 변경 이력" filter={{ roleId: selectedRole.roleId }} />}
        </div>
        {selectedRole?.roleCode === 'admin' && (
          <p className="mt-3 rounded-md bg-ssoo-warning-bg px-3 py-2 text-xs text-ssoo-warning">
            관리자 계정의 전체 관리 권한은 운영 복구를 위해 해제할 수 없습니다.
          </p>
        )}
        {successMessage && <p className="mt-3 text-sm text-ssoo-success">{successMessage}</p>}
        {updateMutation.isError && (
          <SsooErrorNotice as="p" compact className="mt-3" error={updateMutation.error instanceof Error ? updateMutation.error.message : '역할 권한 저장에 실패했습니다.'} />
        )}
      </section>

      <details className="space-y-3 rounded-lg border p-4" aria-label="역할 변경 영향 사용자">
        <summary className="cursor-pointer text-sm font-semibold">변경 영향: {selectedRole?.assignedUserCount ?? 0}명 · 사용자 확인</summary>
        <p className="text-xs text-muted-foreground">플랫폼 기본 역할이 같은 사용자입니다. 실제 허용 권한은 조직 권한·개인 예외·서비스 이용 자격을 함께 조회해 확인하세요.</p>
        {impactUsers.isLoading ? <p>사용자를 불러오는 중...</p> : impactUsers.isError ? <SsooErrorNotice error={impactUsers.error} ><Button variant="outline" onClick={() => impactUsers.refetch()}>사용자 다시 조회</Button></SsooErrorNotice> : <>
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>사용자</TableHead><TableHead>계정</TableHead><TableHead>확인</TableHead></TableRow></TableHeader><TableBody>
            {impactUsers.data?.data.map(user => <TableRow key={user.id}><TableCell>{user.displayName || user.userName} ({user.loginId})</TableCell><TableCell>{user.isActive ? '활성' : '중지'}</TableCell><TableCell><Button variant="outline" size="sm" onClick={() => onInspect(user.id)}>권한·이용 자격 조회</Button></TableCell></TableRow>)}
          </TableBody></Table></div>
          {!impactUsers.data?.data.length && <p className="text-sm text-muted-foreground">이 역할을 가진 사용자가 없습니다.</p>}
          <div className="flex items-center justify-end gap-2"><span className="text-xs">{impactPage}페이지 · 총 {impactUsers.data?.meta.total ?? 0}명</span><Button variant="outline" size="sm" disabled={impactPage === 1} onClick={() => setImpactPage(page => page - 1)}>영향 사용자 이전</Button><Button variant="outline" size="sm" disabled={impactPage * 20 >= (impactUsers.data?.meta.total ?? 0)} onClick={() => setImpactPage(page => page + 1)}>영향 사용자 다음</Button></div>
        </>}
      </details>

      {catalogGroups.map((group) => (
        <section key={group.owner} className="rounded-lg border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold">{OWNER_LABELS[group.owner].title}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{OWNER_LABELS[group.owner].description}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={updateMutation.isPending}
                onClick={() => { edited.current = true; setDraftCodes((current) => Array.from(new Set([
                  ...current,
                  ...group.items.map((item) => item.permissionCode),
                ]))); }}
              >
                표시 항목 전체 선택
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={updateMutation.isPending}
                onClick={() => {
                  edited.current = true;
                  const removable = new Set(group.items
                    .map((item) => item.permissionCode)
                    .filter((code) => !(selectedRole?.roleCode === 'admin' && code === 'system.override')));
                  setDraftCodes((current) => current.filter((code) => !removable.has(code)));
                }}
              >
                표시 항목 해제
              </Button>
            </div>
          </div>
          <div className="grid gap-2 p-4 lg:grid-cols-2">
            {group.items.map((item) => {
              const locked = selectedRole?.roleCode === 'admin' && item.permissionCode === 'system.override';
              return (
                <label key={item.permissionCode} className="flex gap-3 rounded-md border p-3 text-sm">
                  <Checkbox
                    checked={draftCodes.includes(item.permissionCode)}
                    disabled={locked || updateMutation.isPending}
                    onCheckedChange={(checked) => togglePermission(item.permissionCode, checked === true)}
                    aria-label={`${item.permissionCode} 권한`}
                  />
                  <span className="min-w-0">
                    <span className="block font-medium">{item.permissionCode === 'system.override' ? '플랫폼 전체 관리' : item.permissionName}</span>
                    <span title={item.permissionCode} className="block text-xs text-muted-foreground">{CATALOG_STATUS_LABELS[item.status]}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ────────────── Audit Tab ────────────── */
export function AuditTab() {
  const auditQuery = useAccessAudit(100);
  const events = auditQuery.data ?? [];

  return (
    <div className="space-y-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">플랫폼 운영 감사 이벤트</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">사용자·로그인·세션·조직·역할 권한 이력의 최신 100건</p>
          <div className="mt-2"><OperationHistoryButton label="기간·대상별 이력 조회" /></div>
        </div>
        <Button variant="outline" size="sm" onClick={() => auditQuery.refetch()} disabled={auditQuery.isFetching}>
          <RefreshCcw className={`mr-1 h-4 w-4 ${auditQuery.isFetching ? 'animate-spin' : ''}`} /> 새로고침
        </Button>
      </div>
      {auditQuery.isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">감사 이벤트를 불러오는 중...</div>
      ) : auditQuery.isError ? (
        <SsooErrorNotice as="p" compact className="p-4" error={auditQuery.error instanceof Error ? auditQuery.error.message : '감사 이벤트 조회에 실패했습니다.'} />
      ) : events.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">기록된 감사 이벤트가 없습니다.</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">시각</TableHead>
                <TableHead className="text-xs">분류/이벤트</TableHead>
                <TableHead className="text-xs">대상</TableHead>
                <TableHead className="text-xs">요약</TableHead>
                <TableHead className="text-xs">운영자</TableHead>
                <TableHead className="text-xs">출처/활동</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="whitespace-nowrap text-xs">{formatDateTime(event.eventAt)}</TableCell>
                  <TableCell>
                    <div className="text-xs font-medium">{event.category}</div>
                    <div className="text-xs text-muted-foreground">{event.eventType}</div>
                  </TableCell>
                  <TableCell className="text-xs">{event.subjectId}</TableCell>
                  <TableCell className="min-w-72 text-xs">{event.summary}</TableCell>
                  <TableCell className="text-xs">{event.operatorUserId ?? '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div>{event.source ?? '-'}</div>
                    <div>{event.activity ?? '-'}</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/* ────────────── Main Page ────────────── */
export function AccessManagementPage({ path = '/roles', section = 'grants' }: { path?: string; section?: TabId }) {
  const openTab = useTabStore(state => state.openTab);
  const requestedTab = new URLSearchParams(path.split('?')[1] ?? '').get('tab');
  const context = readProgramContext(path);
  const inspectUserId = new URLSearchParams(path.split('?')[1] ?? '').get('userId') ?? '';
  const requestedSection = ['approval-authorities', 'grants', 'catalog', 'inspect', 'exceptions', 'audit', 'organization-permissions', 'user-permissions'].includes(requestedTab ?? '') ? requestedTab as TabId : null;
  const [activeTab, setActiveTab] = useState<TabId>(requestedSection ?? section);
  useEffect(() => { setActiveTab(requestedSection ?? section); }, [requestedSection, section]);

  const tabItems: Array<{ id: TabId; label: string; icon: typeof Shield }> = [
    { id: 'grants', label: '역할 권한 편집', icon: Shield },
    { id: 'organization-permissions', label: '조직 공통 권한', icon: Users },
    { id: 'user-permissions', label: '사용자 공통 예외', icon: Users },
    { id: 'approval-authorities', label: '승인 권한 위임', icon: Users },
    { id: 'catalog', label: '권한 기능 명세', icon: Shield },
    { id: 'inspect', label: '권한 조회', icon: Search },
    { id: 'exceptions', label: '예외 내역', icon: Users },
    { id: 'audit', label: '감사 이벤트', icon: ScrollText },
  ];

  const visibleTabs = tabItems.filter(item => item.id === section
    || (section === 'grants' && item.id === 'catalog')
    || (section === 'user-permissions' && item.id === 'exceptions')
    || item.id === requestedSection);
  const titles: Record<TabId, string> = {
    grants: '역할·기능 권한', catalog: '권한 기능 명세',
    'organization-permissions': '조직 공통 권한', 'user-permissions': '사용자 권한 예외',
    'approval-authorities': '승인 담당자·위임', inspect: '유효 권한 진단',
    exceptions: '예외 내역', audit: '감사 이벤트',
  };
  if (activeTab === 'organization-permissions' || activeTab === 'user-permissions') {
    return <CommonPermissionsPanel key={`${activeTab}:${path}`} fixedTargetId={activeTab === 'organization-permissions' ? context.organizationId : context.userId} standalone kind={activeTab === 'organization-permissions' ? 'organization' : 'user'}
      viewActions={activeTab === 'user-permissions' ? [
        { label: '사용자 공통 예외', onClick: () => setActiveTab('user-permissions') },
        { label: '예외 내역', variant: 'outline', onClick: () => setActiveTab('exceptions') },
      ] : []} />;
  }
  return (
    <SsooWorkspacePage compact
      title={titles[section]}
      description={section === 'inspect' ? '사용자를 선택해 앱 이용 자격과 실제 권한의 판정 근거를 확인합니다.' : section === 'grants' ? '역할별 허용 기능을 편집하고 변경 영향과 이력을 확인합니다.' : section === 'approval-authorities' ? '승인 담당자의 조직·서비스 범위와 위임 기간을 관리합니다.' : '공통 권한의 적용 대상·효과·기간과 변경 이력을 관리합니다.'}
      breadcrumbItems={getAdminBreadcrumb(path)}
      scrollBody

    >
      {visibleTabs.length > 1 ? <div className="flex flex-wrap gap-2">
        {visibleTabs.map((item) => {
          const Icon = item.icon;
          return (
            <Button variant={activeTab === item.id ? 'default' : 'outline'}
              key={item.id} type="button" aria-pressed={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Button>
          );
        })}
      </div> : null}

      <div id={`admin-roles-${activeTab}`} className="scroll-mt-4">
        {activeTab === 'grants'
          ? <RoleGrantsTab key={path} initialRoleId={new URLSearchParams(path.split('?')[1]).get('roleId') ?? undefined} onInspect={userId => { openTab(getAdminTabOptions(`/access-diagnosis?userId=${encodeURIComponent(userId)}`)); }} />
        : activeTab === 'approval-authorities'
          ? <ApprovalAuthoritiesTab key={path} organizationFilter={context.organizationId} />
        : activeTab === 'catalog'
          ? <CatalogTab />
        : activeTab === 'inspect'
          ? <InspectTab initialUserId={inspectUserId} />
        : activeTab === 'exceptions'
          ? <ExceptionsTab key={context.userId} userId={context.userId} />
          : <AuditTab />}
      </div>
    </SsooWorkspacePage>
  );
}
