import { NextRequest, NextResponse } from 'next/server';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  login,
  getActivityLogs
} from '@/lib/users';

// 사용자 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    const activity = searchParams.get('activity');

    // 활동 로그 조회
    if (activity === 'true') {
      const limit = parseInt(searchParams.get('limit') || '50');
      const logs = await getActivityLogs(limit);
      return NextResponse.json({
        success: true,
        logs
      });
    }

    // 특정 사용자 조회
    if (userId) {
      const user = await getUserById(userId);
      if (!user) {
        return NextResponse.json(
          { error: '사용자를 찾을 수 없습니다' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        user
      });
    }

    // 전체 사용자 목록
    const users = await getAllUsers();
    return NextResponse.json({
      success: true,
      users,
      totalUsers: users.length
    });

  } catch (error) {
    console.error('사용자 조회 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '사용자 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 사용자 생성 / 로그인
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, username, displayName, email, role } = body;

    // 로그인
    if (action === 'login') {
      if (!username) {
        return NextResponse.json(
          { error: '사용자명이 필요합니다' },
          { status: 400 }
        );
      }

      const user = await login(username);

      if (!user) {
        return NextResponse.json(
          { error: '사용자를 찾을 수 없습니다' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '로그인 성공',
        user
      });
    }

    // 사용자 생성
    if (!username || !displayName) {
      return NextResponse.json(
        { error: '사용자명과 표시 이름이 필요합니다' },
        { status: 400 }
      );
    }

    const user = await createUser(username, displayName, role || 'editor', email);

    return NextResponse.json({
      success: true,
      message: '사용자가 생성되었습니다',
      user
    });

  } catch (error) {
    console.error('사용자 생성 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '사용자 생성 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 사용자 업데이트
export async function PUT(request: NextRequest) {
  try {
    const { id, ...updates } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: '사용자 ID가 필요합니다' },
        { status: 400 }
      );
    }

    const user = await updateUser(id, updates);

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '사용자 정보가 업데이트되었습니다',
      user
    });

  } catch (error) {
    console.error('사용자 업데이트 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '사용자 업데이트 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 사용자 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '사용자 ID가 필요합니다' },
        { status: 400 }
      );
    }

    const success = await deleteUser(id);

    if (!success) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '사용자가 삭제되었습니다'
    });

  } catch (error) {
    console.error('사용자 삭제 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '사용자 삭제 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
