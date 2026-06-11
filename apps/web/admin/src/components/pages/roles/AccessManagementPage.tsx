'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { RefreshCcw, Search, Shield, AlertTriangle, Users } from 'lucide-react';
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
import { useInspectAccess, useListExceptions, usePermissionCatalog } from '@/hooks/queries/useAccessOps';
import { useUserList } from '@/hooks/queries/useUsers';
import type { InspectAccessParams, ListExceptionsParams } from '@/lib/api/endpoints/accessOps';

type TabId = 'catalog' | 'inspect' | 'exceptions';

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

function CodeList({
  title,
  codes,
  emptyText = '적용된 항목이 없습니다.',
}: {
  title: string;
  codes: string[];
  emptyText?: string;
}) {
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
              className="rounded-full border bg-muted/50 px-2 py-0.5 text-[11px] font-medium"
            >
              {code}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      )}
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
            granted {snapshot.grantedPermissionCodes.length} / system.override{' '}
            {policy.hasSystemOverride ? '적용' : '미적용'}
          </p>
        </div>
        {'targetObjectType' in snapshot && snapshot.targetObjectType ? (
          <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
            {snapshot.targetObjectType}:{snapshot.targetObjectId}
          </span>
        ) : null}
      </div>

      <CodeList title="최종 granted permission" codes={snapshot.grantedPermissionCodes} />

      {'targetObjectType' in snapshot ? (
        <CodeList
          title="입력된 domain permission"
          codes={snapshot.domainPermissionCodes}
          emptyText="추가 domain permission 입력이 없습니다."
        />
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <CodeList title="Role baseline" codes={policy.rolePermissionCodes} />
        <CodeList title="Organization baseline" codes={policy.organizationPermissionCodes} />
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
        <div className="text-xs text-muted-foreground">{item.permissionName}</div>
      </TableCell>
      <TableCell>
        <span className="text-sm">{item.userName}</span>
        <div className="text-xs text-muted-foreground">{item.loginId}</div>
      </TableCell>
      <TableCell>
        <span
          className={
            item.effectType === 'grant'
              ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700'
              : 'rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700'
          }
        >
          {item.effectType}
        </span>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {item.exceptionAxis}
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
            item.isActive ? 'text-xs text-emerald-600' : 'text-xs text-muted-foreground'
          }
        >
          {item.isActive ? 'active' : 'inactive'}
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
                <TableHead className="text-xs">Permission</TableHead>
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
                    <div className="text-xs text-muted-foreground">{item.permissionName}</div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        item.effectType === 'grant' ? 'text-emerald-600' : 'text-destructive'
                      }
                    >
                      {item.effectType}
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
                          ? 'text-xs text-emerald-600'
                          : 'text-xs text-muted-foreground'
                      }
                    >
                      {item.isActive ? 'active' : 'inactive'}
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
          <h3 className="text-sm font-semibold">{group.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{group.responsibility}</p>
        </div>
        <span
          className={
            group.launchFocus
              ? 'rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700'
              : 'rounded-full border px-2 py-0.5 text-xs text-muted-foreground'
          }
        >
          {group.launchFocus ? 'launch 검증 대상' : '개발 진행/후순위'}
        </span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Permission</TableHead>
              <TableHead className="text-xs">기능</TableHead>
              <TableHead className="text-xs">메뉴/노출 위치</TableHead>
              <TableHead className="text-xs">운영 책임</TableHead>
              <TableHead className="text-xs">상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.items.map((item) => (
              <TableRow key={item.permissionCode}>
                <TableCell>
                  <div className="font-mono text-xs font-medium">{item.permissionCode}</div>
                  <div className="text-xs text-muted-foreground">{item.permissionName}</div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{item.capability}</TableCell>
                <TableCell className="max-w-xs text-xs text-muted-foreground">{item.menuSurface}</TableCell>
                <TableCell className="max-w-sm text-xs text-muted-foreground">{item.operationSurface}</TableCell>
                <TableCell>
                  <span
                    className={
                      item.status === 'launch-active'
                        ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700'
                        : item.status === 'foundation'
                          ? 'rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700'
                          : 'rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground'
                    }
                  >
                    {item.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
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
              Admin은 SSOT 플랫폼/base 권한을 운영하고, DMS는 문서 도메인 내부 권한·설정·운영을 소유합니다. PMS/CRM/SNS는 앱 개발 진행에 맞춰 같은 분류로 이어갑니다.
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
            <AdminSummaryCard title="런칭 검증" value={catalog.summary.launchActive} icon={<CheckIcon />} />
            <AdminSummaryCard title="Foundation" value={catalog.summary.foundation} icon={<Users className="h-4 w-4" />} />
            <AdminSummaryCard title="Planned" value={catalog.summary.planned} icon={<AlertTriangle className="h-4 w-4" />} />
          </div>
        ) : null}
      </div>

      {catalogQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">권한 명세를 불러오는 중...</p>
      ) : catalogQuery.isError ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          권한 명세를 불러오지 못했습니다.
        </div>
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
function InspectTab() {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [draft, setDraft] = useState<InspectDraft>(INITIAL_DRAFT);
  const [inspectParams, setInspectParams] = useState<InspectAccessParams | null>(null);

  const usersQuery = useUserList();
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
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">대상 사용자 선택</h3>

        {usersQuery.isLoading && (
          <p className="text-sm text-muted-foreground">사용자 목록을 불러오는 중...</p>
        )}

        {usersQuery.isError && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            사용자 목록을 불러오지 못했습니다.
            <Button variant="outline" size="sm" onClick={() => usersQuery.refetch()}>
              <RefreshCcw className="mr-1 h-3 w-3" />
              다시 시도
            </Button>
          </div>
        )}

        {!usersQuery.isLoading && !usersQuery.isError && (
          <>
            <div className="flex gap-3">
              <Input
                placeholder="이름 또는 로그인 ID 검색..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="max-w-xs"
              />
            </div>
            {filteredUsers.length > 0 && (
          <div className="mt-2 max-h-48 overflow-auto rounded-md border">
            {filteredUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelectedUserId(u.id)}
                className={`flex w-full items-center gap-3 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/50 ${
                  u.id === selectedUserId ? 'bg-primary/10 font-medium' : ''
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{u.userName}</span>
                <span className="text-xs text-muted-foreground">{u.loginId}</span>
                <span className="rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {u.roleCode}
                </span>
              </button>
            ))}
          </div>
        )}
          </>
        )}
      </div>

      {/* Inspect parameters */}
      {selectedUser && (
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">
              {selectedUser.userName} ({selectedUser.loginId})
            </h3>
            <span className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
              {selectedUser.roleCode}
            </span>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.4fr_auto]">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Object type</label>
              <Input
                value={draft.targetObjectType}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, targetObjectType: e.target.value }))
                }
                placeholder="예: dms.document"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Object id</label>
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
                Domain permission codes
              </label>
              <Input
                value={draft.domainPermissionCodes}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, domainPermissionCodes: e.target.value }))
                }
                placeholder="comma-separated"
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                <input
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
        </div>
      )}

      {/* Results */}
      {inspectQuery.isLoading && (
        <div className="flex h-40 items-center justify-center rounded-lg border text-muted-foreground">
          권한 정보를 불러오는 중...
        </div>
      )}

      {inspectQuery.isError && (
        <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">
            {inspectQuery.error instanceof Error
              ? inspectQuery.error.message
              : '권한 inspect 조회에 실패했습니다.'}
          </p>
          <Button variant="outline" onClick={() => inspectQuery.refetch()}>
            <RefreshCcw className="mr-1 h-4 w-4" />
            다시 시도
          </Button>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <section className="grid gap-3 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-xs text-muted-foreground">Subject</div>
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
              <div className="text-xs text-muted-foreground">Role baseline</div>
              <div className="mt-1 text-sm font-medium">{result.subject.roleCode}</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-xs text-muted-foreground">system.override</div>
              <div className="mt-1 text-sm font-medium">
                {result.action.policy.hasSystemOverride ? '허용' : '미허용'}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                includeInactive: {result.input.includeInactive ? 'true' : 'false'}
              </div>
            </div>
          </section>

          <PolicyTraceSection title="Action policy" snapshot={result.action} />
          {result.object ? (
            <PolicyTraceSection title="Object policy" snapshot={result.object} />
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            <ExceptionTable
              title="Action exceptions"
              items={result.permissionExceptions.action}
            />
            <ExceptionTable
              title="Object exceptions"
              items={result.permissionExceptions.object}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────── Exceptions Tab ────────────── */
function ExceptionsTab() {
  const [filters, setFilters] = useState<ListExceptionsParams>({
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
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">예외 검색</h3>
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="로그인 ID 필터..."
            value={loginIdSearch}
            onChange={(e) => setLoginIdSearch(e.target.value)}
            className="max-w-xs"
          />
          <select
            value={filters.exceptionAxis ?? ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                exceptionAxis: (e.target.value as 'action' | 'object') || undefined,
              }))
            }
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">전체 axis</option>
            <option value="action">action</option>
            <option value="object">object</option>
          </select>
          <label className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
            <input
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
        <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">
            {exceptionsQuery.error instanceof Error
              ? exceptionsQuery.error.message
              : '예외 내역 조회에 실패했습니다.'}
          </p>
          <Button variant="outline" onClick={() => exceptionsQuery.refetch()}>
            <RefreshCcw className="mr-1 h-4 w-4" />
            다시 시도
          </Button>
        </div>
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
                    <TableHead className="text-xs">Permission</TableHead>
                    <TableHead className="text-xs">사용자</TableHead>
                    <TableHead className="text-xs">효과</TableHead>
                    <TableHead className="text-xs">Axis</TableHead>
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

/* ────────────── Main Page ────────────── */
export function AccessManagementPage() {
  const [activeTab, setActiveTab] = useState<TabId>('catalog');

  const tabItems: Array<{ id: TabId; label: string; icon: typeof Shield }> = [
    { id: 'catalog', label: '권한 기능 명세', icon: Shield },
    { id: 'inspect', label: '권한 조회', icon: Search },
    { id: 'exceptions', label: '예외 내역', icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">역할 & 권한</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Admin/platform 권한과 앱별 도메인 권한을 분류하고, 사용자별 실제 해석/예외를 검증합니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1">
        {tabItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'catalog'
        ? <CatalogTab />
        : activeTab === 'inspect'
          ? <InspectTab />
          : <ExceptionsTab />}
    </div>
  );
}
