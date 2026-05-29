'use client';

import { useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Check,
  Eye,
  Loader2,
  Pencil,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import type {
  DmsDocumentAccessRequestRole,
  DmsDocumentAccessRequestSummary,
  DocumentPermissionGrant,
} from '@ssoo/types/dms';
import { ActivityListSection } from '@/components/templates/page-frame/panel';
import type { ActivityAction, ActivityItem } from '@/components/templates/page-frame/panel';
import {
  useApproveDocumentAccessRequestMutation,
  useCreateReadAccessRequestMutation,
  useDocumentAccessInboxQuery,
  useManageableDocumentsQuery,
  useMyDocumentAccessRequestsForPathQuery,
  useRejectDocumentAccessRequestMutation,
  useRevokeDocumentGrantMutation,
  useUpdateDocumentGrantRoleMutation,
} from '@/features/access';
import {
  DMS_DOCUMENT_ACCESS_REFRESH_EVENT,
  isDmsDocumentAccessRefreshEventDetail,
} from '@/lib/notification-events';
import { toast } from '@/lib/toast';
import { normalizeDocumentPath } from '@/lib/utils/linkUtils';
import { useAuthStore, useConfirmStore } from '@/stores';

function formatRole(role: DmsDocumentAccessRequestRole) {
  return role === 'write' ? '수정' : '열람';
}

function formatCurrentPermission(role: DmsDocumentAccessRequestRole) {
  return role === 'write' ? '읽기/쓰기' : '읽기';
}

function PermissionCapabilityChip({ type }: { type: 'read' | 'write' }) {
  const isWrite = type === 'write';
  const Icon = isWrite ? Pencil : Eye;

  return (
    <span
      className={
        isWrite
          ? 'inline-flex h-6 items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 text-[11px] font-medium leading-none text-emerald-700'
          : 'inline-flex h-6 items-center gap-1 rounded border border-ssoo-content-border bg-white px-2 text-[11px] font-medium leading-none text-ssoo-primary/80'
      }
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {isWrite ? '쓰기' : '읽기'}
    </span>
  );
}

function PermissionCapabilityChips({ role }: { role: DmsDocumentAccessRequestRole }) {
  return (
    <span className="flex flex-wrap items-center gap-1">
      <PermissionCapabilityChip type="read" />
      {role === 'write' ? <PermissionCapabilityChip type="write" /> : null}
    </span>
  );
}

function isActiveUserGrant(grant: DocumentPermissionGrant): grant is DocumentPermissionGrant & {
  grantId: string;
  role: DmsDocumentAccessRequestRole;
} {
  if (
    !grant.grantId
    || grant.principalType !== 'user'
    || (grant.role !== 'read' && grant.role !== 'write')
  ) {
    return false;
  }

  return !grant.expiresAt || Date.parse(grant.expiresAt) >= Date.now();
}

function getGrantUserLabel(grant: DocumentPermissionGrant) {
  return grant.principalDisplayName || grant.principalLoginId || `사용자 ${grant.principalId}`;
}

function GrantPermissionTitle({
  userLabel,
  role,
}: {
  userLabel: string;
  role: DmsDocumentAccessRequestRole;
}) {
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <span className="truncate text-label-sm text-ssoo-primary">{userLabel}</span>
      <PermissionCapabilityChips role={role} />
    </span>
  );
}

function getGrantIdentityKey(grant: DocumentPermissionGrant) {
  return [
    grant.principalType,
    grant.principalId,
    grant.principalLoginId ?? '',
  ].join(':');
}

function getGrantRoleWeight(role: DmsDocumentAccessRequestRole) {
  return role === 'write' ? 2 : 1;
}

function preferHigherGrant(
  current: DocumentPermissionGrant & {
    grantId: string;
    role: DmsDocumentAccessRequestRole;
  },
  next: DocumentPermissionGrant & {
    grantId: string;
    role: DmsDocumentAccessRequestRole;
  },
) {
  if (getGrantRoleWeight(next.role) !== getGrantRoleWeight(current.role)) {
    return getGrantRoleWeight(next.role) > getGrantRoleWeight(current.role) ? next : current;
  }

  const currentGrantedAt = current.grantedAt ? Date.parse(current.grantedAt) : 0;
  const nextGrantedAt = next.grantedAt ? Date.parse(next.grantedAt) : 0;
  return nextGrantedAt > currentGrantedAt ? next : current;
}

function dedupeActiveUserGrants(grants: DocumentPermissionGrant[]) {
  const grantsByIdentity = new Map<
    string,
    DocumentPermissionGrant & {
      grantId: string;
      role: DmsDocumentAccessRequestRole;
    }
  >();

  for (const grant of grants) {
    if (!isActiveUserGrant(grant)) {
      continue;
    }

    const key = getGrantIdentityKey(grant);
    const current = grantsByIdentity.get(key);
    grantsByIdentity.set(key, current ? preferHigherGrant(current, grant) : grant);
  }

  return Array.from(grantsByIdentity.values())
    .sort((left, right) => getGrantUserLabel(left).localeCompare(getGrantUserLabel(right), 'ko-KR'));
}

function matchesCurrentUserGrant(
  grant: DocumentPermissionGrant,
  currentUser: { userId?: string; loginId?: string } | null | undefined,
  fallbackLoginId?: string,
) {
  const subjects = [currentUser?.userId, currentUser?.loginId, fallbackLoginId]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  if (subjects.length === 0) {
    return false;
  }

  return grant.principalType === 'user'
    && subjects.some((subject) => (
      subject === grant.principalId
      || subject === grant.principalLoginId
    ));
}

function getLatestWriteRequest(requests: DmsDocumentAccessRequestSummary[]) {
  return requests
    .filter((request) => request.requestedRole === 'write')
    .find((request) => ['pending', 'approved', 'rejected', 'expired', 'revoked'].includes(request.status));
}

function formatWriteRequestStatus(request: DmsDocumentAccessRequestSummary) {
  if (request.status === 'pending') return '쓰기 권한 요청 대기';
  if (request.status === 'approved') return '쓰기 권한 승인됨';
  if (request.status === 'rejected') return '쓰기 권한 요청 거절';
  if (request.status === 'expired') return '쓰기 권한 요청 만료';
  if (request.status === 'revoked') return '쓰기 권한 회수';
  return '쓰기 권한 요청 취소';
}

export function DocumentPermissionsSection({
  documentId,
  filePath,
  currentUserLoginId,
  currentAccessRole,
  ownerUserId,
  ownerLoginId,
  grants,
  locked = false,
}: {
  documentId?: string;
  filePath?: string;
  currentUserLoginId?: string;
  currentAccessRole?: DmsDocumentAccessRequestRole;
  ownerUserId?: string;
  ownerLoginId?: string;
  grants?: DocumentPermissionGrant[];
  locked?: boolean;
}) {
  const currentUser = useAuthStore((state) => state.user);
  const normalizedPath = filePath ? normalizeDocumentPath(filePath) : '';
  const isOwner = Boolean(
    currentUser
    && (
      (ownerUserId && currentUser.userId === ownerUserId)
      || (ownerLoginId && currentUser.loginId === ownerLoginId)
      || (ownerLoginId && currentUserLoginId === ownerLoginId)
    ),
  );
  const canManage = Boolean(
    !locked
    && documentId
    && normalizedPath
    && isOwner,
  );

  const managedDocumentsQuery = useManageableDocumentsQuery({ enabled: canManage });
  const inboxQuery = useDocumentAccessInboxQuery(
    { status: 'pending', path: normalizedPath },
    { enabled: canManage },
  );
  const myRequestsQuery = useMyDocumentAccessRequestsForPathQuery(
    { status: 'all', path: normalizedPath },
    { enabled: Boolean(!canManage && !locked && documentId && normalizedPath && currentUser) },
  );
  const createWriteRequestMutation = useCreateReadAccessRequestMutation();
  const approveMutation = useApproveDocumentAccessRequestMutation();
  const rejectMutation = useRejectDocumentAccessRequestMutation();
  const updateGrantRoleMutation = useUpdateDocumentGrantRoleMutation();
  const revokeGrantMutation = useRevokeDocumentGrantMutation();
  const confirm = useConfirmStore((state) => state.confirm);

  const managedDocument = useMemo(() => (
    managedDocumentsQuery.data?.find((document) => (
      document.documentId === documentId
      || normalizeDocumentPath(document.path) === normalizedPath
    ))
  ), [documentId, managedDocumentsQuery.data, normalizedPath]);

  const activeGrants = useMemo(() => (
    dedupeActiveUserGrants(managedDocument?.grants ?? grants ?? [])
  ), [grants, managedDocument?.grants]);

  const currentUserGrant = useMemo(() => (
    activeGrants.find((grant) => matchesCurrentUserGrant(grant, currentUser, currentUserLoginId))
  ), [activeGrants, currentUser, currentUserLoginId]);
  const effectiveCurrentRole = currentUserGrant?.role ?? currentAccessRole;

  const canViewOwnPermission = Boolean(
    !canManage
    && !locked
    && documentId
    && normalizedPath
    && effectiveCurrentRole,
  );

  const pendingRequests = inboxQuery.data ?? [];
  const myWriteRequests = myRequestsQuery.data ?? [];
  const latestWriteRequest = getLatestWriteRequest(myWriteRequests);
  const pendingWriteRequest = latestWriteRequest?.status === 'pending' ? latestWriteRequest : undefined;
  const approvedWriteRequest = latestWriteRequest?.status === 'approved' ? latestWriteRequest : undefined;
  const canRequestWrite = Boolean(
    canViewOwnPermission
    && effectiveCurrentRole === 'read'
    && !pendingWriteRequest
    && !approvedWriteRequest,
  );
  const pendingRequestCount = pendingRequests.length;
  const activeGrantCount = activeGrants.length;
  const refetchInboxRequests = inboxQuery.refetch;
  const refetchManagedDocuments = managedDocumentsQuery.refetch;
  const refetchMyRequests = myRequestsQuery.refetch;

  useEffect(() => {
    if ((!canManage && !canViewOwnPermission) || !normalizedPath || typeof window === 'undefined') {
      return;
    }

    const handleDocumentAccessRefresh = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (
        !isDmsDocumentAccessRefreshEventDetail(detail)
        || normalizeDocumentPath(detail.path) !== normalizedPath
      ) {
        return;
      }

      void refetchInboxRequests();
      void refetchManagedDocuments();
      void refetchMyRequests();
    };

    window.addEventListener(DMS_DOCUMENT_ACCESS_REFRESH_EVENT, handleDocumentAccessRefresh);
    return () => window.removeEventListener(DMS_DOCUMENT_ACCESS_REFRESH_EVENT, handleDocumentAccessRefresh);
  }, [
    canManage,
    canViewOwnPermission,
    normalizedPath,
    refetchInboxRequests,
    refetchManagedDocuments,
    refetchMyRequests,
  ]);

  if ((!canManage && !canViewOwnPermission) || !documentId) {
    return null;
  }

  const handleApprove = async (request: DmsDocumentAccessRequestSummary) => {
    try {
      await approveMutation.mutateAsync({
        accessRequestId: request.requestId,
        payload: { grantRole: request.requestedRole },
      });
      toast.success(`${formatRole(request.requestedRole)} 권한 요청을 승인했습니다.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '권한 요청 승인에 실패했습니다.');
    }
  };

  const handleReject = async (request: DmsDocumentAccessRequestSummary) => {
    try {
      await rejectMutation.mutateAsync({
        accessRequestId: request.requestId,
        payload: {},
      });
      toast.success('권한 요청을 거절했습니다.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '권한 요청 거절에 실패했습니다.');
    }
  };

  const handleRoleChange = async (
    targetDocumentId: string,
    grantId: string,
    role: DmsDocumentAccessRequestRole,
  ) => {
    try {
      await updateGrantRoleMutation.mutateAsync({
        documentId: targetDocumentId,
        grantId,
        payload: { role },
      });
      toast.success(`${formatRole(role)} 권한으로 변경했습니다.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '권한 변경에 실패했습니다.');
    }
  };

  const handleRevoke = async (targetDocumentId: string, grantId: string) => {
    try {
      await revokeGrantMutation.mutateAsync({ documentId: targetDocumentId, grantId });
      toast.success('권한을 제거했습니다.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '권한 제거에 실패했습니다.');
    }
  };

  const handleRevokeWithConfirm = async (
    targetDocumentId: string,
    grantId: string,
    userLabel: string,
    role: DmsDocumentAccessRequestRole,
  ) => {
    const confirmed = await confirm({
      title: '권한 제거',
      description: `${userLabel}님의 현재 ${formatRole(role)} 권한을 제거하시겠습니까? 제거 후에는 이 문서에 다시 접근하려면 권한 요청이 필요합니다.`,
      confirmText: '제거',
      cancelText: '취소',
    });

    if (!confirmed) {
      return;
    }

    await handleRevoke(targetDocumentId, grantId);
  };

  const handleRequestWrite = async () => {
    if (!normalizedPath) {
      return;
    }

    try {
      await createWriteRequestMutation.mutateAsync({
        path: normalizedPath,
        requestedRole: 'write',
      });
      await refetchMyRequests();
      toast.success('쓰기 권한 요청을 보냈습니다.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '쓰기 권한 요청에 실패했습니다.');
    }
  };

  const sectionBadge = activeGrantCount > 0 || pendingRequestCount > 0 ? (
    <span className="flex shrink-0 items-center gap-1">
      {activeGrantCount > 0 ? (
        <span className="mr-1 text-caption text-gray-400">
          ({activeGrantCount})
        </span>
      ) : null}
      {pendingRequestCount > 0 ? (
        <span
          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ls-red px-1 text-[10px] font-semibold leading-none text-white"
          title={`처리 대기 권한 요청 ${pendingRequestCount}건`}
        >
          {pendingRequestCount > 99 ? '99+' : pendingRequestCount}
        </span>
      ) : null}
    </span>
  ) : undefined;
  const isLoading = canManage
    ? managedDocumentsQuery.isLoading || inboxQuery.isLoading
    : myRequestsQuery.isLoading;
  const hasError = canManage
    ? managedDocumentsQuery.isError || inboxQuery.isError
    : myRequestsQuery.isError;
  const requestItems: ActivityItem[] = pendingRequests.map((request) => {
    const requester = request.requester.displayName ?? request.requester.loginId;
    const isApproving = approveMutation.isPending
      && approveMutation.variables?.accessRequestId === request.requestId;
    const isRejecting = rejectMutation.isPending
      && rejectMutation.variables?.accessRequestId === request.requestId;
    const disabled = isApproving || isRejecting;
    const actions: ActivityAction[] = [
      {
        id: `approve-${request.requestId}`,
        kind: 'icon',
        tone: 'default',
        icon: isApproving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />,
        title: '승인',
        ariaLabel: `${requester} 권한 요청 승인`,
        onClick: () => {
          if (!disabled) {
            void handleApprove(request);
          }
        },
      },
      {
        id: `reject-${request.requestId}`,
        kind: 'icon',
        tone: 'danger',
        icon: isRejecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />,
        title: '거절',
        ariaLabel: `${requester} 권한 요청 거절`,
        onClick: () => {
          if (!disabled) {
            void handleReject(request);
          }
        },
      },
    ];

    return {
      id: `request:${request.requestId}`,
      title: requester,
      content: `요청 대기 · ${formatRole(request.requestedRole)} 요청`,
      icon: <ShieldCheck className="h-3 w-3 shrink-0 text-ssoo-primary/50" />,
      actions,
    };
  });

  const grantItems: ActivityItem[] = activeGrants.map((grant) => {
    const userLabel = getGrantUserLabel(grant);
    const nextRole: DmsDocumentAccessRequestRole = grant.role === 'read' ? 'write' : 'read';
    const isUpdating = updateGrantRoleMutation.isPending
      && updateGrantRoleMutation.variables?.grantId === grant.grantId;
    const isRevoking = revokeGrantMutation.isPending
      && revokeGrantMutation.variables?.grantId === grant.grantId;
    const disabled = isUpdating || isRevoking;
    const actions: ActivityAction[] = [
      {
        id: `role-${grant.grantId}`,
        kind: 'icon',
        tone: 'default',
        icon: isUpdating
          ? <Loader2 className="h-3 w-3 animate-spin" />
          : nextRole === 'write'
            ? <Pencil className="h-3 w-3" />
            : <Eye className="h-3 w-3" />,
        title: `${formatRole(nextRole)} 권한으로 변경`,
        ariaLabel: `${userLabel} ${formatRole(nextRole)} 권한으로 변경`,
        onClick: () => {
          if (!disabled) {
            void handleRoleChange(documentId, grant.grantId, nextRole);
          }
        },
      },
      {
        id: `revoke-${grant.grantId}`,
        kind: 'icon',
        tone: 'danger',
        icon: isRevoking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />,
        title: '권한 제거',
        ariaLabel: `${userLabel} 권한 제거`,
        onClick: () => {
          if (!disabled) {
            void handleRevokeWithConfirm(documentId, grant.grantId, userLabel, grant.role);
          }
        },
      },
    ];

    return {
      id: `grant:${grant.grantId}`,
      title: userLabel,
      titleNode: <GrantPermissionTitle userLabel={userLabel} role={grant.role} />,
      actions,
    };
  });

  const currentGrantItems: ActivityItem[] = effectiveCurrentRole ? [{
    id: `my-grant:${currentUserGrant?.grantId ?? 'effective'}`,
    title: formatCurrentPermission(effectiveCurrentRole),
    titleNode: <PermissionCapabilityChips role={effectiveCurrentRole} />,
    content: latestWriteRequest && effectiveCurrentRole === 'read'
      ? formatWriteRequestStatus(latestWriteRequest)
      : undefined,
    actions: canRequestWrite ? [
      {
        id: 'request-write',
        kind: 'text',
        tone: 'default',
        label: createWriteRequestMutation.isPending ? '요청 중' : '쓰기 권한 요청',
        title: '쓰기 권한 요청',
        ariaLabel: '쓰기 권한 요청',
        onClick: () => {
          if (!createWriteRequestMutation.isPending) {
            void handleRequestWrite();
          }
        },
      },
    ] : undefined,
  }] : [];

  const permissionItems = canManage
    ? [...requestItems, ...grantItems]
    : currentGrantItems;

  return (
    <ActivityListSection
      title="권한"
      icon={<ShieldCheck className="mr-1.5 h-4 w-4 shrink-0" />}
      badge={canManage ? sectionBadge : undefined}
      items={permissionItems}
      emptyText={canManage ? '요청/권한자 없음' : '내 권한 없음'}
      variant="compact"
      defaultOpen={canManage ? pendingRequests.length > 0 || activeGrants.length > 0 : true}
    >
      <div className="pt-2">
        {isLoading ? (
          <p className="flex items-center gap-1 text-caption text-ssoo-primary/60">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            불러오는 중
          </p>
        ) : null}

        {hasError ? (
          <p
            className="flex items-center gap-1 text-caption text-amber-700"
            title={
              managedDocumentsQuery.error?.message
              || inboxQuery.error?.message
              || myRequestsQuery.error?.message
              || '권한 정보를 불러오지 못했습니다.'
            }
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            권한 상태 확인 필요
          </p>
        ) : null}
      </div>
    </ActivityListSection>
  );
}
