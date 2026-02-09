'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/auth.store';
import { useMenuStore } from '@/stores/menu.store';
import { AppLayout } from '@/components/layout';

const loginSchema = z.object({
  loginId: z.string().min(1, '아이디를 입력하세요.').max(50, '아이디는 50자 이하여야 합니다.'),
  password: z.string().min(4, '비밀번호는 4자 이상이어야 합니다.').max(100, '비밀번호는 100자 이하여야 합니다.'),
});

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * 메인 레이아웃 (인증 후)
 * - 미인증 시 로그인 폼 표시
 * - 인증 후 AppLayout 적용
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading: authLoading, checkAuth, login, _hasHydrated } = useAuthStore();
  const { refreshMenu, generalMenus } = useMenuStore();
  const [isChecking, setIsChecking] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      loginId: '',
      password: '',
    },
  });

  // 인증 상태 확인 - Hydration 완료 후 서버에서 토큰 유효성 검증
  useEffect(() => {
    // Hydration이 완료되지 않았으면 대기
    if (!_hasHydrated) return;
    
    const check = async () => {
      await checkAuth();
      setIsChecking(false);
    };
    check();
  }, [_hasHydrated, checkAuth]);

  // 인증 성공 후 메뉴 로드
  useEffect(() => {
    // isChecking이 끝나고, 인증된 상태이며, 메뉴가 비어있을 때만 로드
    if (!isChecking && !authLoading && isAuthenticated && generalMenus.length === 0) {
      refreshMenu();
    }
  }, [isChecking, authLoading, isAuthenticated, generalMenus.length, refreshMenu]);

  const onSubmit = async (data: LoginFormData) => {
    setLoginError(null);
    try {
      await login(data.loginId, data.password);
      // 로그인 성공 시 메뉴도 함께 로드
      await refreshMenu();
    } catch (err) {
      const message = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      setLoginError(message);
    }
  };

  // 로딩 중 (Hydration 대기 또는 인증 확인 중)
  if (!_hasHydrated || isChecking || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  // 미인증 시 로그인 폼 표시
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-extrabold tracking-tight text-primary">
              SSOO
            </h1>
            <p className="text-muted-foreground mt-2">삼삼오오 모여서 일한다</p>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">로그인</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Error Message */}
              {loginError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                  {loginError}
                </div>
              )}

              {/* Login ID */}
              <div>
                <label htmlFor="loginId" className="block text-sm font-medium text-gray-700 mb-1">
                  아이디
                </label>
                <input
                  {...register('loginId')}
                  type="text"
                  id="loginId"
                  autoComplete="username"
                  className="w-full px-4 py-2 border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input outline-none transition-colors bg-background"
                  placeholder="아이디를 입력하세요"
                />
                {errors.loginId && (
                  <p className="mt-1 text-sm text-red-500">{errors.loginId.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호
                </label>
                <input
                  {...register('password')}
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  className="w-full px-4 py-2 border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input outline-none transition-colors bg-background"
                  placeholder="비밀번호를 입력하세요"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground font-medium py-2.5 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {authLoading ? '로그인 중...' : '로그인'}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-400 text-sm mt-6">
            © 2026 SSOO. SI/SM 업무 허브
          </p>
        </div>
      </div>
    );
  }

  return <AppLayout />;
}
