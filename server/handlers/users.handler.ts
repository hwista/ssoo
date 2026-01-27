/**
 * 사용자 핸들러
 * @description 사용자 관리 (조회, 생성, 수정, 삭제, 로그인)
 */

import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  login,
  getActivityLogs
} from '@/lib/users';

// ============================================================================
// Types
// ============================================================================

export type HandlerResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status: number };

interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  role: string;
  [key: string]: unknown;
}

interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  [key: string]: unknown;
}

interface UserListResponse {
  users: User[];
  totalUsers: number;
}

interface SingleUserResponse {
  user: User;
}

interface ActivityLogsResponse {
  logs: ActivityLog[];
}

interface UserActionResponse {
  message: string;
  user?: User;
}

// ============================================================================
// GET Handler - 사용자 목록 조회
// ============================================================================

export async function getUsers(params: {
  id?: string;
  activity?: string;
  limit?: string;
}): Promise<HandlerResult<unknown>> {
  try {
    const { id, activity, limit } = params;

    // 활동 로그 조회
    if (activity === 'true') {
      const logLimit = parseInt(limit || '50');
      const logs = await getActivityLogs(logLimit);
      return {
        success: true,
        data: { logs }
      };
    }

    // 특정 사용자 조회
    if (id) {
      const user = await getUserById(id);
      if (!user) {
        return {
          success: false,
          error: '사용자를 찾을 수 없습니다',
          status: 404
        };
      }
      return {
        success: true,
        data: { user }
      };
    }

    // 전체 사용자 목록
    const users = await getAllUsers();
    return {
      success: true,
      data: {
        users,
        totalUsers: users.length
      }
    };

  } catch (error) {
    console.error('사용자 조회 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '사용자 조회 중 오류가 발생했습니다',
      status: 500
    };
  }
}

// ============================================================================
// POST Handler - 사용자 생성 / 로그인
// ============================================================================

export async function createOrLoginUser(body: {
  action?: string;
  username: string;
  displayName?: string;
  email?: string;
  role?: string;
}): Promise<HandlerResult<unknown>> {
  try {
    const { action, username, displayName, email, role } = body;

    // 로그인
    if (action === 'login') {
      if (!username) {
        return {
          success: false,
          error: '사용자명이 필요합니다',
          status: 400
        };
      }

      const user = await login(username);

      if (!user) {
        return {
          success: false,
          error: '사용자를 찾을 수 없습니다',
          status: 404
        };
      }

      return {
        success: true,
        data: {
          message: '로그인 성공',
          user
        }
      };
    }

    // 사용자 생성
    if (!username || !displayName) {
      return {
        success: false,
        error: '사용자명과 표시 이름이 필요합니다',
        status: 400
      };
    }

    const roleTyped = (role || 'editor') as 'admin' | 'editor' | 'viewer';
    const user = await createUser(username, displayName, roleTyped, email);

    return {
      success: true,
      data: {
        message: '사용자가 생성되었습니다',
        user
      }
    };

  } catch (error) {
    console.error('사용자 생성 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '사용자 생성 중 오류가 발생했습니다',
      status: 500
    };
  }
}

// ============================================================================
// PUT Handler - 사용자 업데이트
// ============================================================================

export async function editUser(body: {
  id: string;
  displayName?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}): Promise<HandlerResult<unknown>> {
  try {
    const { id, displayName, email, role } = body;

    if (!id) {
      return {
        success: false,
        error: '사용자 ID가 필요합니다',
        status: 400
      };
    }

    const updates = {
      displayName,
      email,
      role: role as 'admin' | 'editor' | 'viewer' | undefined
    };
    const user = await updateUser(id, updates);

    if (!user) {
      return {
        success: false,
        error: '사용자를 찾을 수 없습니다',
        status: 404
      };
    }

    return {
      success: true,
      data: {
        message: '사용자 정보가 업데이트되었습니다',
        user
      }
    };

  } catch (error) {
    console.error('사용자 업데이트 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '사용자 업데이트 중 오류가 발생했습니다',
      status: 500
    };
  }
}

// ============================================================================
// DELETE Handler - 사용자 삭제
// ============================================================================

export async function removeUser(params: {
  id?: string;
}): Promise<HandlerResult<{ message: string }>> {
  try {
    const { id } = params;

    if (!id) {
      return {
        success: false,
        error: '사용자 ID가 필요합니다',
        status: 400
      };
    }

    const success = await deleteUser(id);

    if (!success) {
      return {
        success: false,
        error: '사용자를 찾을 수 없습니다',
        status: 404
      };
    }

    return {
      success: true,
      data: {
        message: '사용자가 삭제되었습니다'
      }
    };

  } catch (error) {
    console.error('사용자 삭제 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '사용자 삭제 중 오류가 발생했습니다',
      status: 500
    };
  }
}
