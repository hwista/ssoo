import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@ssoo/types';

export const ROLES_KEY = 'roles';

/**
 * 역할 기반 접근 제어 데코레이터
 *
 * @example
 * // 단일 역할
 * @Roles('admin')
 *
 * // 복수 역할 (OR 조건)
 * @Roles('admin', 'manager')
 *
 * // 컨트롤러 전체 적용
 * @Controller('admin')
 * @Roles('admin')
 * export class AdminController { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
