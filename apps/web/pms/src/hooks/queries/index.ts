/**
 * React Query Hooks
 *
 * 데이터 페칭 및 캐싱을 위한 커스텀 훅
 */

// Codes
export {
  codeKeys,
  useCodeGroups,
  useCodesByGroup,
  useCreateCode,
  useUpdateCode,
  useDeactivateCode,
} from './useCodes';

// Customers
export {
  customerKeys,
  useCustomerList,
  useCustomerDetail,
  useCreateCustomer,
  useUpdateCustomer,
  useDeactivateCustomer,
} from './useCustomers';

// Menus
export {
  menuKeys,
  useMyMenus,
  useAddFavorite,
  useRemoveFavorite,
} from './useMenus';

// Projects
export {
  projectKeys,
  useProjectList,
  useProjectDetail,
  useProjectAccess,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useCreateProjectOrg,
  useRemoveProjectOrg,
  useProjectOrgs,
  useCreateProjectRelation,
  useRemoveProjectRelation,
  useProjectRelations,
  useProjectRequirements,
  useCreateRequirement,
  useUpdateRequirement,
  useDeleteRequirement,
  useProjectRisks,
  useCreateRisk,
  useUpdateRisk,
  useDeleteRisk,
  useProjectChangeRequests,
  useCreateChangeRequest,
  useUpdateChangeRequest,
  useDeleteChangeRequest,
  useProjectEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useUpsertRequestDetail,
  useUpsertProposalDetail,
  useUpsertExecutionDetail,
  useUpsertTransitionDetail,
} from './useProjects';

// Roles
export {
  roleKeys,
  useRoleList,
  useRoleMenuPermissions,
  useUpdateRolePermissions,
} from './useRoles';
