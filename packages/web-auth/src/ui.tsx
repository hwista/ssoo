import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import type { LoginRequest } from '@ssoo/types/common';

export interface LoginValidationErrors {
  loginId?: string;
  password?: string;
  form?: string;
}

export interface AuthPageShellProps {
  children: ReactNode;
}

export interface AuthLoadingScreenProps {
  message?: string;
}

export interface AuthLoginCardProps {
  header: ReactNode;
  footer?: ReactNode;
  isLoading?: boolean;
  loginIdLabel?: string;
  passwordLabel?: string;
  loginIdPlaceholder?: string;
  passwordPlaceholder?: string;
  submitLabel?: string;
  loadingLabel?: string;
  onSubmit: (credentials: LoginRequest) => Promise<void>;
  validate?: (credentials: LoginRequest) => LoginValidationErrors;
}

export interface AuthStandardLoginCardProps {
  isLoading?: boolean;
  onSubmit: (credentials: LoginRequest) => Promise<void>;
}

function defaultValidate(credentials: LoginRequest): LoginValidationErrors {
  const errors: LoginValidationErrors = {};

  if (!credentials.loginId.trim()) {
    errors.loginId = '아이디를 입력하세요.';
  }

  if (!credentials.password.trim()) {
    errors.password = '비밀번호를 입력하세요.';
  }

  return errors;
}

function validateStandardLogin(credentials: LoginRequest): LoginValidationErrors {
  const errors: LoginValidationErrors = {};

  if (!credentials.loginId.trim()) {
    errors.loginId = '아이디를 입력하세요.';
  }

  if (!credentials.password.trim()) {
    errors.password = '비밀번호를 입력하세요.';
  } else if (credentials.password.length < 4) {
    errors.password = '비밀번호는 4자 이상이어야 합니다.';
  }

  return errors;
}

function AuthStandardLoginHeader() {
  return (
    <div className="text-center">
      <h1 className="text-5xl font-extrabold tracking-tight text-primary">
        SSOO
      </h1>
      <p className="mt-2 text-muted-foreground">삼삼오오 모여서 일한다</p>
      <h2 className="mt-6 text-h2 font-semibold text-foreground">로그인</h2>
    </div>
  );
}

function AuthStandardLoginFooter() {
  return (
    <p className="text-center text-sm text-gray-400">
      © 2026 SSOO. SI/SM 업무 허브
    </p>
  );
}

export function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-ssoo-background px-4">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}

export function AuthLoadingScreen({
  message = '로딩 중...',
}: AuthLoadingScreenProps) {
  return (
    <AuthPageShell>
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-ssoo-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </AuthPageShell>
  );
}

export function AuthLoginCard({
  header,
  footer,
  isLoading = false,
  loginIdLabel = '아이디',
  passwordLabel = '비밀번호',
  loginIdPlaceholder = '아이디를 입력하세요',
  passwordPlaceholder = '비밀번호를 입력하세요',
  submitLabel = '로그인',
  loadingLabel = '로그인 중...',
  onSubmit,
  validate,
}: AuthLoginCardProps) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LoginValidationErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const validateCredentials = useMemo(
    () => validate ?? defaultValidate,
    [validate],
  );

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    setFormError(null);
  }, [isLoading]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const credentials = {
      loginId: loginId.trim(),
      password,
    };
    const nextErrors = validateCredentials(credentials);

    setFieldErrors(nextErrors);
    if (nextErrors.loginId || nextErrors.password || nextErrors.form) {
      setFormError(nextErrors.form ?? null);
      return;
    }

    try {
      await onSubmit(credentials);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '로그인에 실패했습니다.');
    }
  };

  return (
    <div className="rounded-2xl border border-ssoo-content-border/40 bg-card p-8 shadow-sm">
      <div className="mb-8">{header}</div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        {formError && (
          <div className="rounded-lg border border-ls-red/20 bg-ls-red/10 px-4 py-3 text-sm text-ls-red">
            {formError}
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground" htmlFor="loginId">
            {loginIdLabel}
          </label>
          <input
            id="loginId"
            type="text"
            autoComplete="username"
            value={loginId}
            onChange={(event) => setLoginId(event.target.value)}
            className="h-control-h w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            placeholder={loginIdPlaceholder}
          />
          {fieldErrors.loginId && (
            <p className="text-sm text-ls-red">{fieldErrors.loginId}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground" htmlFor="password">
            {passwordLabel}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-control-h w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            placeholder={passwordPlaceholder}
          />
          {fieldErrors.password && (
            <p className="text-sm text-ls-red">{fieldErrors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="h-control-h w-full rounded-md bg-ssoo-primary px-4 text-sm font-medium text-white transition hover:bg-ssoo-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? loadingLabel : submitLabel}
        </button>
      </form>

      {footer ? (
        <div className="mt-6">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function AuthStandardLoginCard({
  isLoading = false,
  onSubmit,
}: AuthStandardLoginCardProps) {
  return (
    <AuthLoginCard
      header={<AuthStandardLoginHeader />}
      footer={<AuthStandardLoginFooter />}
      isLoading={isLoading}
      onSubmit={onSubmit}
      validate={validateStandardLogin}
    />
  );
}
