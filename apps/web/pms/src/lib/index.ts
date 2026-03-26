/**
 * Library Module
 *
 * 애플리케이션 공통 유틸리티 및 설정
 */

// API 클라이언트 및 엔드포인트
export {
  apiClient,
  api,
  authApi,
  projectsApi,
  menusApi,
  ApiError,
} from './api';
export type {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  SortParams,
  ListParams,
  Project,
  ProjectFilters,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectStatusCode,
  ProjectStageCode,
  ProjectDoneResultCode,
  MenuItem,
  FavoriteMenu,
  MyMenuResponse,
  MenuType,
  AccessType,
} from './api';

// 유효성 검증 스키마
export {
  // 공통
  requiredString,
  optionalString,
  requiredStringMax,
  optionalStringMax,
  emailField,
  requiredEmail,
  phoneField,
  optionalId,
  amountField,
  dateField,
  checkboxField,
  requiredSelect,
  optionalSelect,
  // 인증
  loginSchema,
  changePasswordSchema,
  acceptInvitationSchema,
  // 프로젝트
  projectStatusCodeSchema,
  projectStageCodeSchema,
  projectDoneResultCodeSchema,
  createProjectSchema,
  updateProjectSchema,
  createCustomerRequestSchema,
} from './validations';
export type {
  LoginInput,
  ChangePasswordInput,
  AcceptInvitationInput,
  CreateProjectInput,
  UpdateProjectInput,
  CreateCustomerRequestInput,
} from './validations';

// 유틸리티 함수
export { cn, getIconComponent, hasIcon } from './utils';
