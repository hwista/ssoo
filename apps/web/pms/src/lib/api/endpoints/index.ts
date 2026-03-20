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

// Menus
export { menusApi } from './menus';
export type {
  MenuItem,
  FavoriteMenu,
  MyMenuResponse,
  MenuType,
  AccessType,
} from './menus';

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

// Users
export { usersApi } from './users';
export type {
  UserItem,
  UserListResponse,
  UserListParams,
  CreateUserRequest,
  UpdateUserRequest,
} from './users';
