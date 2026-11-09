'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePlatformAccess } from '@ssoo/web-auth';
import { useAuthStore } from '@/stores/auth.store';
import { participationApi, type ReviewQuery } from '@/lib/api/endpoints/participation';

export function useParticipationMutation<T>(mutationFn: (input: T) => Promise<unknown>) {
  const client = useQueryClient();
  const access = usePlatformAccess();
  return useMutation({ mutationFn, onSuccess: async () => {
    await Promise.all([access?.refresh(), client.invalidateQueries({ queryKey: ['participation'] }),
      client.invalidateQueries({ queryKey: ['organizations'] }), client.invalidateQueries({ queryKey: ['users'] }),
      client.invalidateQueries({ queryKey: ['participation-management'] })]);
  } });
}
export function useCreateParticipationRequest() { return useParticipationMutation(participationApi.createRequest); }
export function useCancelParticipationRequest() { return useParticipationMutation(participationApi.cancelRequest); }
export function useDecideParticipationRequest() { return useParticipationMutation(participationApi.decide); }
export function useDelegateApproval() { return useParticipationMutation(participationApi.delegate); }
export function useRevokeApprovalAuthority() { return useParticipationMutation(participationApi.revokeAuthority); }

export function useApprovalReviews(query: ReviewQuery) {
  const userId = useAuthStore((state) => state.user?.userId);
  const access = usePlatformAccess();
  return useQuery({ queryKey: ['participation', userId, 'reviews', query], queryFn: () => participationApi.reviews(query),
    enabled: !!access?.snapshot.canReview, staleTime: 0 });
}
export function useApprovalAuthorities() {
  const userId = useAuthStore((state) => state.user?.userId);
  const access = usePlatformAccess();
  return useQuery({ queryKey: ['participation', userId, 'authorities'], queryFn: participationApi.authorities,
    enabled: !!access?.snapshot.isPlatformAdmin, staleTime: 0 });
}
export function useApprovalCandidates(params: { organizationId?: string; search?: string; page: number }, enabled: boolean) {
  const userId = useAuthStore((state) => state.user?.userId);
  const access = usePlatformAccess();
  return useQuery({ queryKey: ['participation', userId, 'candidates', params], queryFn: () => participationApi.candidates(params),
    enabled: enabled && !!access?.snapshot.isPlatformAdmin, staleTime: 0 });
}
