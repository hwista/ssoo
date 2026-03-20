/**
 * API Module
 *
 * 중앙화된 API 클라이언트 및 엔드포인트 관리
 */

// Core
export { apiClient } from './client';
export type {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  SortParams,
  ListParams,
} from './types';
export { ApiError } from './types';

// Auth (기존)
export { authApi } from './auth';

// Endpoints
export {
  codesApi,
  customersApi,
  menusApi,
  projectsApi,
  usersApi,
} from './endpoints';
export type {
  CodeGroup,
  CodeItem,
  CreateCodeRequest,
  UpdateCodeRequest,
  CustomerItem,
  CustomerFilters,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  MenuItem,
  FavoriteMenu,
  MyMenuResponse,
  MenuType,
  AccessType,
  Project,
  ProjectFilters,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectStatusCode,
  ProjectStageCode,
  ProjectDoneResultCode,
  UserItem,
  UserListResponse,
  UserListParams,
  CreateUserRequest,
  UpdateUserRequest,
} from './endpoints';

// 편의를 위한 통합 객체
import { authApi } from './auth';
import { codesApi, customersApi, menusApi, projectsApi, usersApi } from './endpoints';

export const api = {
  auth: authApi,
  codes: codesApi,
  customers: customersApi,
  menus: menusApi,
  projects: projectsApi,
  users: usersApi,
} as const;
