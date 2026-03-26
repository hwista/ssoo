'use client';

import { useAuthStore } from '@/stores/auth.store';
import type { UserRole } from '@ssoo/types';

/**
 * 인증 및 권한 관련 훅
 *
 * @example
 * const { user, hasRole, isAdmin, isAuthenticated } = useAuth();
 *
 * if (hasRole('admin', 'manager')) {
 *   // admin 또는 manager만 볼 수 있는 컨텐츠
 * }
 */
export function useAuth() {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  /**
   * 현재 사용자가 지정된 역할 중 하나를 가지고 있는지 확인
   *
   * @param roles - 허용할 역할 목록 (OR 조건)
   * @returns 역할 중 하나라도 가지고 있으면 true
   *
   * @example
   * hasRole('admin') // admin만
   * hasRole('admin', 'manager', 'user') // admin, manager, user 중 하나
   */
  const hasRole = (...roles: UserRole[]): boolean => {
    if (!user?.roleCode) return false;
    return roles.includes(user.roleCode as UserRole);
  };

  /**
   * admin 역할 확인
   */
  const isAdmin = user?.roleCode === 'admin';

  /**
   * 관리자급 역할 확인 (admin, manager)
   */
  const isManager = hasRole('admin', 'manager');

  return {
    user,
    isAuthenticated,
    isLoading,
    hasRole,
    isAdmin,
    isManager,
    roleCode: user?.roleCode as UserRole | undefined,
  };
}
