/**
 * Validations Module
 *
 * Zod 스키마 중앙 관리
 *
 * 사용 예시:
 * ```tsx
 * import { createProjectSchema, type CreateProjectInput } from '@/lib/validations';
 *
 * const form = useForm<CreateProjectInput>({
 *   resolver: zodResolver(createProjectSchema),
 * });
 * ```
 */

// 공통 필드 스키마
export {
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
} from './common';

// 인증 스키마
export {
  loginSchema,
  changePasswordSchema,
  acceptInvitationSchema,
} from './auth';
export type {
  LoginInput,
  ChangePasswordInput,
  AcceptInvitationInput,
} from './auth';

// 프로젝트 스키마
export {
  projectStatusCodeSchema,
  projectStageCodeSchema,
  projectDoneResultCodeSchema,
  createProjectSchema,
  updateProjectSchema,
  createCustomerRequestSchema,
} from './project';
export type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateCustomerRequestInput,
} from './project';

// 추후 추가
// export { customerSchema } from './customer';
// export { userSchema } from './user';
