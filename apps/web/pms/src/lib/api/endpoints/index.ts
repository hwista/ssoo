/**
 * API Endpoints
 *
 * 도메인별 API 함수 모음
 */

// Codes
export { codesApi } from './codes';
export type {
  CodeGroup,
  CodeItem,
  CreateCodeRequest,
  UpdateCodeRequest,
} from './codes';

// Customers
export { customersApi } from './customers';
export type {
  CustomerItem,
  CustomerFilters,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from './customers';

// System Catalogs
export { systemCatalogsApi } from './systemCatalogs';
export type {
  SystemCatalogItem,
  SystemCatalogFilters,
  CreateSystemCatalogRequest,
  UpdateSystemCatalogRequest,
} from './systemCatalogs';

// Sites
export { sitesApi } from './sites';
export type {
  SiteItem,
  SiteFilters,
  CreateSiteRequest,
  UpdateSiteRequest,
} from './sites';

// System Instances
export { systemInstancesApi } from './systemInstances';
export type {
  SystemInstanceItem,
  SystemInstanceFilters,
  CreateSystemInstanceRequest,
  UpdateSystemInstanceRequest,
} from './systemInstances';

// Menus
export { menusApi } from './menus';
export type {
  MenuItem,
  FavoriteMenu,
  MyMenuResponse,
  MenuType,
  AccessType,
} from './menus';

// Menu Admin
export { menusAdminApi } from './menusAdmin';
export type {
  MenuAdminItem,
  CreateMenuAdminRequest,
  UpdateMenuAdminRequest,
} from './menusAdmin';

// Projects
export { projectsApi } from './projects';
export type {
  Project,
  ProjectFilters,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectStatusCode,
  ProjectStageCode,
  ProjectDoneResultCode,
} from './projects';

// Roles
export { rolesApi } from './roles';
export type {
  RoleItem,
  RoleMenuPermission,
  UpdateRolePermissionsRequest,
} from './roles';

// Users
export { usersApi } from './users';
export type {
  UserItem,
  UserListResponse,
  UserListParams,
  CreateUserRequest,
  UpdateUserRequest,
} from './users';
