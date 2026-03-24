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

// System Catalogs
export {
  systemCatalogKeys,
  useSystemCatalogList,
  useSystemCatalogTree,
  useSystemCatalogDetail,
  useCreateSystemCatalog,
  useUpdateSystemCatalog,
  useDeactivateSystemCatalog,
} from './useSystemCatalogs';

// Sites
export {
  siteKeys,
  useSiteList,
  useSiteTree,
  useSiteDetail,
  useCreateSite,
  useUpdateSite,
  useDeactivateSite,
} from './useSites';

// System Instances
export {
  systemInstanceKeys,
  useSystemInstanceList,
  useSystemInstanceTree,
  useSystemInstanceDetail,
  useCreateSystemInstance,
  useUpdateSystemInstance,
  useDeactivateSystemInstance,
} from './useSystemInstances';

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
  useCreateHandoff,
  useConfirmHandoff,
  useCompleteHandoff,
} from './useProjects';

// Roles
export {
  roleKeys,
  useRoleList,
  useRoleMenuPermissions,
  useUpdateRolePermissions,
} from './useRoles';

// Users
export {
  userKeys,
  useUserList,
  useCreateUser,
  useUpdateUser,
  useDeactivateUser,
} from './useUsers';
