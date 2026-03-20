/**
 * React Query Hooks
 *
 * 데이터 페칭 및 캐싱을 위한 커스텀 훅
 *
 * 사용 예시:
 * ```tsx
 * import { useProjectList, useCreateProject } from '@/hooks/queries';
 *
 * function ProjectListPage() {
 *   const { data, isLoading, error } = useProjectList({ status: 'active' });
 *   const createMutation = useCreateProject();
 *
 *   if (isLoading) return <LoadingState />;
 *   if (error) return <ErrorState message={error.message} />;
 *
 *   return <DataTable data={data?.data?.items ?? []} />;
 * }
 * ```
 */

// Projects
export {
  projectKeys,
  useProjectList,
  useProjectDetail,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useUpsertRequestDetail,
  useUpsertProposalDetail,
  useUpsertExecutionDetail,
  useUpsertTransitionDetail,
} from './useProjects';

// Menus
export {
  menuKeys,
  useMyMenus,
  useAddFavorite,
  useRemoveFavorite,
} from './useMenus';

// 추후 추가
// export { customerKeys, useCustomerList, ... } from './useCustomers';
// export { userKeys, useUserList, ... } from './useUsers';
