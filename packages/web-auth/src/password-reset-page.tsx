'use client';

import { type FormEvent, useMemo, useState } from 'react';
import { ArrowLeft, KeyRound, Mail } from 'lucide-react';
import { AuthPageShell } from './ui';
import {
  AUTH_PROXY_CSRF_HEADER_NAME,
  AUTH_PROXY_CSRF_HEADER_VALUE,
} from './auth-proxy';
import { Button, Input } from '@ssoo/web-ui';

export interface SharedPasswordResetPageProps {
  loginPath?: string;
  passwordResetApiBasePath?: string;
  navigate: (path: string) => void;
}

type ResetStep = 'request' | 'confirm' | 'done';
const DEFAULT_PASSWORD_RESET_API_BASE_PATH = '/api/auth/password-reset';

async function postJson(basePath: string, action: 'request' | 'confirm', body: unknown): Promise<void> {
  const response = await fetch(`${basePath.replace(/\/+$/, '')}/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [AUTH_PROXY_CSRF_HEADER_NAME]: AUTH_PROXY_CSRF_HEADER_VALUE,
    },
    credentials: 'include',
    cache: 'no-store',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as {
      error?: { message?: string };
      message?: string;
    } | null;
    throw new Error(payload?.error?.message || payload?.message || '요청 처리에 실패했습니다.');
  }
}

export function SharedPasswordResetPage({
  loginPath = '/login',
  passwordResetApiBasePath = DEFAULT_PASSWORD_RESET_API_BASE_PATH,
  navigate,
}: SharedPasswordResetPageProps) {
  const [step, setStep] = useState<ResetStep>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (step === 'request') {
      return Boolean(email.trim());
    }

    if (step === 'confirm') {
      return Boolean(email.trim() && code.trim() && newPassword && confirmPassword);
    }

    return false;
  }, [code, confirmPassword, email, newPassword, step]);

  const handleRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await postJson(passwordResetApiBasePath, 'request', { email: email.trim() });
      setStep('confirm');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '재설정 요청에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      await postJson(passwordResetApiBasePath, 'confirm', {
        email: email.trim(),
        code: code.trim(),
        newPassword,
      });
      setStep('done');
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : '비밀번호 재설정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageShell>
      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-7 text-center">
          <h1 className="text-5xl font-extrabold text-[#0B3B3B]">SSOT</h1>
          <h2 className="mt-6 text-2xl font-semibold text-slate-950">비밀번호 찾기</h2>
        </div>

        {error ? (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {step === 'request' ? (
          <form className="space-y-5" onSubmit={handleRequest}>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-900" htmlFor="reset-email">
                이메일
              </label>
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0B3B3B] focus:ring-2 focus:ring-[#0B3B3B]/15"
                placeholder="가입한 이메일"
              />
            </div>
            <Button variant="plain" size="plain"
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[#0B3B3B] px-4 text-sm font-medium text-white transition hover:bg-[#114F4F] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Mail aria-hidden className="h-4 w-4" />
              {isSubmitting ? '요청 중...' : '코드 받기'}
            </Button>
          </form>
        ) : null}

        {step === 'confirm' ? (
          <form className="space-y-5" onSubmit={handleConfirm}>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-900" htmlFor="reset-code">
                재설정 코드
              </label>
              <Input
                id="reset-code"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0B3B3B] focus:ring-2 focus:ring-[#0B3B3B]/15"
                placeholder="메일로 받은 코드"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-900" htmlFor="new-password">
                새 비밀번호
              </label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0B3B3B] focus:ring-2 focus:ring-[#0B3B3B]/15"
                placeholder="새 비밀번호"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-900" htmlFor="confirm-password">
                새 비밀번호 확인
              </label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0B3B3B] focus:ring-2 focus:ring-[#0B3B3B]/15"
                placeholder="새 비밀번호 확인"
              />
            </div>
            <Button variant="plain" size="plain"
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[#0B3B3B] px-4 text-sm font-medium text-white transition hover:bg-[#114F4F] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <KeyRound aria-hidden className="h-4 w-4" />
              {isSubmitting ? '변경 중...' : '비밀번호 재설정'}
            </Button>
          </form>
        ) : null}

        {step === 'done' ? (
          <Button variant="plain" size="plain"
            type="button"
            onClick={() => navigate(loginPath)}
            className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[#0B3B3B] px-4 text-sm font-medium text-white transition hover:bg-[#114F4F]"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            로그인으로 이동
          </Button>
        ) : null}

        {step !== 'done' ? (
          <Button variant="plain" size="plain"
            type="button"
            onClick={() => navigate(loginPath)}
            className="mt-5 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-[#0B3B3B] hover:bg-slate-50"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            로그인으로 돌아가기
          </Button>
        ) : null}

        <p className="mt-6 text-center text-sm text-slate-400">© 2026 SSOT</p>
      </div>
    </AuthPageShell>
  );
}
