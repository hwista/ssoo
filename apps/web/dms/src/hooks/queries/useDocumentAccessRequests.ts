'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ApproveDmsDocumentAccessRequestPayload,
  CreateDmsDocumentAccessRequestPayload,
  DmsDocumentAccessRequestListQuery,
  DmsDocumentAccessRequestStatusFilter,
  DmsDocumentAccessRequestSummary,
  DmsManagedDocumentSummary,
  RejectDmsDocumentAccessRequestPayload,
  TransferDocumentOwnershipPayload,
  TransferDocumentOwnershipResult,
  UpdateDocumentVisibilityPayload,
} from '@ssoo/types/dms';
import { accessApi } from '@/lib/api/access';
import { getErrorMessage } from '@/lib/api/core';
import { aiSearchKeys } from './useAiSearch';

export const accessRequestKeys = {
  all: ['dms-access-requests'] as const,
  managedDocuments: ['dms-managed-documents'] as const,
  my: (query: DmsDocumentAccessRequestListQuery = {}) => [
    ...accessRequestKeys.all,
    'my',
    query.status ?? 'all',
    query.path ?? '',
  ] as const,
  inbox: (query: DmsDocumentAccessRequestListQuery = {}) => [
    ...accessRequestKeys.all,
    'inbox',
    query.status ?? 'all',
    query.path ?? '',
  ] as const,
};

async function unwrap<T>(promise: Promise<{ success: boolean; data?: T; error?: string; message?: string }>): Promise<T> {
  const response = await promise;
  if (!response.success || response.data === undefined) {
    throw new Error(getErrorMessage(response));
  }
  return response.data;
}

async function invalidateRequestQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: accessRequestKeys.all }),
    queryClient.invalidateQueries({ queryKey: accessRequestKeys.managedDocuments }),
    queryClient.invalidateQueries({ queryKey: aiSearchKeys.results() }),
  ]);
}

export function useManageableDocumentsQuery() {
  return useQuery({
    queryKey: accessRequestKeys.managedDocuments,
    queryFn: () => unwrap<DmsManagedDocumentSummary[]>(accessApi.listManageableDocuments()),
  });
}

export function useMyDocumentAccessRequestsQuery(
  status: DmsDocumentAccessRequestStatusFilter = 'all',
) {
  return useQuery({
    queryKey: accessRequestKeys.my({ status }),
    queryFn: () => unwrap(accessApi.listMyRequests({ status })),
  });
}

export function useDocumentAccessInboxQuery(
  query: DmsDocumentAccessRequestListQuery = { status: 'pending' },
) {
  return useQuery({
    queryKey: accessRequestKeys.inbox(query),
    queryFn: () => unwrap(accessApi.listInboxRequests(query)),
  });
}

export function useCreateReadAccessRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDmsDocumentAccessRequestPayload) => (
      unwrap<DmsDocumentAccessRequestSummary>(accessApi.createReadRequest(payload))
    ),
    onSuccess: async () => {
      await invalidateRequestQueries(queryClient);
    },
  });
}

export function useApproveDocumentAccessRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      accessRequestId: string;
      payload: ApproveDmsDocumentAccessRequestPayload;
    }) => unwrap<DmsDocumentAccessRequestSummary>(
      accessApi.approveRequest(params.accessRequestId, params.payload),
    ),
    onSuccess: async () => {
      await invalidateRequestQueries(queryClient);
    },
  });
}

export function useRejectDocumentAccessRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      accessRequestId: string;
      payload: RejectDmsDocumentAccessRequestPayload;
    }) => unwrap<DmsDocumentAccessRequestSummary>(
      accessApi.rejectRequest(params.accessRequestId, params.payload),
    ),
    onSuccess: async () => {
      await invalidateRequestQueries(queryClient);
    },
  });
}

export function useUpdateDocumentVisibilityMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      documentId: string;
      payload: UpdateDocumentVisibilityPayload;
    }) => unwrap<{ documentId: string; visibilityScope: string }>(
      accessApi.updateDocumentVisibility(params.documentId, params.payload),
    ),
    onSuccess: async () => {
      await invalidateRequestQueries(queryClient);
    },
  });
}

export function useTransferDocumentOwnershipMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      documentId: string;
      payload: TransferDocumentOwnershipPayload;
    }) => unwrap<TransferDocumentOwnershipResult>(
      accessApi.transferOwnership(params.documentId, params.payload),
    ),
    onSuccess: async () => {
      await invalidateRequestQueries(queryClient);
    },
  });
}

export function useRevokeDocumentGrantMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      documentId: string;
      grantId: string;
    }) => unwrap<{ grantId: string; documentId: string }>(
      accessApi.revokeGrant(params.documentId, params.grantId),
    ),
    onSuccess: async () => {
      await invalidateRequestQueries(queryClient);
    },
  });
}
