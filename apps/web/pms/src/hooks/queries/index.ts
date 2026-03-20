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
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useUpsertRequestDetail,
  useUpsertProposalDetail,
  useUpsertExecutionDetail,
  useUpsertTransitionDetail,
} from './useProjects';

// Users
export {
  userKeys,
  useUserList,
  useCreateUser,
  useUpdateUser,
  useDeactivateUser,
} from './useUsers';
