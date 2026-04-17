'use client';

import { useEffect, useState } from 'react';
import { RefreshCcw, Search, Shield } from 'lucide-react';
import type {
  AccessInspectionResult,
  PermissionExceptionRecord,
  PermissionResolutionTrace,
} from '@ssoo/types/common';
import { useInspectAccess } from '@/hooks/queries';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { InspectAccessParams } from '@/lib/api/endpoints/accessOps';
import type { UserItem } from '@/lib/api/endpoints/users';

interface AccessInspectDialogProps {
  user: UserItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AccessInspectDraft {
  targetObjectType: string;
  targetObjectId: string;
  domainPermissionCodes: string;
  includeInactive: boolean;
}

const INITIAL_DRAFT: AccessInspectDraft = {
  targetObjectType: '',
  targetObjectId: '',
  domainPermissionCodes: '',
  includeInactive: false,
};

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

function buildInspectParams(user: UserItem, draft: AccessInspectDraft): InspectAccessParams {
  return {
    userId: user.id,
    ...(draft.targetObjectType ? { targetObjectType: draft.targetObjectType } : {}),
    ...(draft.targetObjectId ? { targetObjectId: draft.targetObjectId } : {}),
    ...(draft.domainPermissionCodes ? { domainPermissionCodes: draft.domainPermissionCodes } : {}),
    ...(draft.includeInactive ? { includeInactive: true } : {}),
  };
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
        {('targetObjectType' in snapshot && snapshot.targetObjectType) ? (
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

function PermissionExceptionSection({
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
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-2 py-2 font-medium">Permission</th>
                <th className="px-2 py-2 font-medium">효과</th>
                <th className="px-2 py-2 font-medium">대상</th>
                <th className="px-2 py-2 font-medium">사유</th>
                <th className="px-2 py-2 font-medium">만료</th>
                <th className="px-2 py-2 font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b align-top last:border-b-0">
                  <td className="px-2 py-2">
                    <div className="font-medium">{item.permissionCode}</div>
                    <div className="text-xs text-muted-foreground">{item.permissionName}</div>
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={
                        item.effectType === 'grant'
                          ? 'text-emerald-600'
                          : 'text-destructive'
                      }
                    >
                      {item.effectType}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">
                    {item.targetObjectType && item.targetObjectId
                      ? `${item.targetObjectType}:${item.targetObjectId}`
                      : item.targetOrgName ?? '-'}
                  </td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">
                    {item.reason ?? item.memo ?? '-'}
                  </td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">
                    {formatDateTime(item.expiresAt)}
                  </td>
                  <td className="px-2 py-2 text-xs">
                    {item.isActive ? 'active' : 'inactive'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function AccessInspectDialog({
  user,
  open,
  onOpenChange,
}: AccessInspectDialogProps) {
  const [draft, setDraft] = useState<AccessInspectDraft>(INITIAL_DRAFT);
  const [inspectParams, setInspectParams] = useState<InspectAccessParams | null>(null);

  useEffect(() => {
    if (!open || !user) {
      return;
    }

    setDraft(INITIAL_DRAFT);
    setInspectParams({ userId: user.id });
  }, [open, user]);

  const inspectQuery = useInspectAccess(inspectParams, open && !!inspectParams && !!user);
  const result = inspectQuery.data;

  const applyInspect = () => {
    if (!user) {
      return;
    }

    setInspectParams(buildInspectParams(user, draft));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl overflow-hidden p-0">
        <div className="flex max-h-[85vh] flex-col">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              권한 inspect
            </DialogTitle>
            <DialogDescription>
              {user
                ? `${user.userName} (${user.loginId}) 사용자의 foundation policy 와 permission exception 을 확인합니다.`
                : '대상 사용자를 선택하세요.'}
            </DialogDescription>
          </DialogHeader>

          {user ? (
            <>
              <div className="space-y-4 border-b bg-muted/20 px-6 py-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-md border bg-background p-3">
                    <div className="text-xs text-muted-foreground">Role</div>
                    <div className="mt-1 text-sm font-medium">{user.roleCode}</div>
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <div className="text-xs text-muted-foreground">활성 상태</div>
                    <div className="mt-1 text-sm font-medium">{user.isActive ? '활성' : '비활성'}</div>
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <div className="text-xs text-muted-foreground">최종 로그인</div>
                    <div className="mt-1 text-sm font-medium">{formatDateTime(user.lastLoginAt)}</div>
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <div className="text-xs text-muted-foreground">대상 userId</div>
                    <div className="mt-1 font-mono text-sm">{user.id}</div>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.4fr_auto]">
                  <div className="grid gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Object type</label>
                    <Input
                      value={draft.targetObjectType}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, targetObjectType: e.target.value }))
                      }
                      placeholder="예: pms.project"
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
                      <Checkbox
                        checked={draft.includeInactive}
                        onCheckedChange={(checked) =>
                          setDraft((prev) => ({ ...prev, includeInactive: checked === true }))
                        }
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

              <div className="flex-1 overflow-auto px-6 py-4">
                {inspectQuery.isLoading ? (
                  <div className="flex h-40 items-center justify-center text-muted-foreground">
                    권한 정보를 불러오는 중...
                  </div>
                ) : inspectQuery.isError ? (
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
                ) : result ? (
                  <div className="space-y-4">
                    <section className="grid gap-3 lg:grid-cols-4">
                      <div className="rounded-lg border p-4">
                        <div className="text-xs text-muted-foreground">Subject</div>
                        <div className="mt-1 text-sm font-medium">{result.subject.userName}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{result.subject.loginId}</div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-xs text-muted-foreground">조직 수</div>
                        <div className="mt-1 text-sm font-medium">{result.organizationIds.length}개</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {result.organizationIds.join(', ') || '-'}
                        </div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-xs text-muted-foreground">Role baseline</div>
                        <div className="mt-1 text-sm font-medium">
                          {result.subject.roleCode}
                        </div>
                      </div>
                      <div className="rounded-lg border p-4">
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
                      <PermissionExceptionSection
                        title="Action exceptions"
                        items={result.permissionExceptions.action}
                      />
                      <PermissionExceptionSection
                        title="Object exceptions"
                        items={result.permissionExceptions.object}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex h-40 items-center justify-center text-muted-foreground">
                    조회 결과가 없습니다.
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
