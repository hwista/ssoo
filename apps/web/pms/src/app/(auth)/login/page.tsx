'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

const loginSchema = z.object({
  loginId: z.string().min(1, '아이디를 입력하세요.').max(50, '아이디는 50자 이하여야 합니다.'),
  password: z.string().min(4, '비밀번호는 4자 이상이어야 합니다.').max(100, '비밀번호는 100자 이하여야 합니다.'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

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

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    try {
      await login(data.loginId, data.password);
      router.push('/');  // 메인으로 이동
    } catch (err) {
      const message = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      setError(message);
    }
  };

  return (
    <>
      {/* Logo */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-extrabold tracking-tight text-primary">
          SSOO
        </h1>
        <p className="text-muted-foreground mt-2">삼삼오오 모여서 일한다</p>
      </div>

      {/* Login Form */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="heading-2 text-gray-900 mb-6">로그인</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-ls-red/10 border border-ls-red/20 text-ls-red px-4 py-3 rounded-md text-sm">
              {error}
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
              className="w-full h-control-h px-4 border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input outline-none transition-colors bg-background text-sm"
              placeholder="아이디를 입력하세요"
            />
            {errors.loginId && (
              <p className="mt-1 text-sm text-ls-red">{errors.loginId.message}</p>
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
              className="w-full h-control-h px-4 border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input outline-none transition-colors bg-background text-sm"
              placeholder="비밀번호를 입력하세요"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-ls-red">{errors.password.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-control-h bg-primary hover:bg-secondary disabled:bg-primary/50 text-primary-foreground font-medium px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="text-center text-gray-400 text-sm mt-6">
        © 2026 SSOO. SI/SM 업무 허브
      </p>
    </>
  );
}
