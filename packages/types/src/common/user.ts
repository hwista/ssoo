/**
 * 사용자 역할
 */
export type UserRole = 'admin' | 'manager' | 'user' | 'viewer';

/**
 * 사용자 엔티티
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 사용자 생성 DTO
 */
export interface CreateUserDto {
  email: string;
  name: string;
  role: UserRole;
}

/**
 * 사용자 수정 DTO
 */
export interface UpdateUserDto {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
}
