import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { KeyRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
  passwordResetHref?: string;
  registrationLink?: AuthLoginActionLink;
  identityProviders?: AuthIdentityProviderAction[];
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
  appName?: string;
  appDescription?: string;
  title?: string;
  passwordResetHref?: string;
  registrationLink?: AuthLoginActionLink;
  identityProviders?: AuthIdentityProviderAction[];
  onSubmit: (credentials: LoginRequest) => Promise<void>;
}

export interface AuthLoginActionLink {
  href: string;
  label: string;
  external?: boolean;
}

export interface AuthIdentityProviderAction {
  key: string;
  href: string;
  label: string;
  external?: boolean;
  icon?: LucideIcon;
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

function AuthStandardLoginHeader({
  title = '로그인',
}: Pick<AuthStandardLoginCardProps, 'title'>) {
  return (
    <div className="text-center">
      <h1 className="text-5xl font-extrabold text-[#0B3B3B]">
        SSOT
      </h1>
      <h2 className="mt-6 text-2xl font-semibold text-slate-950">{title}</h2>
    </div>
  );
}

function isExternalHref(href: string) {
  return /^https?:\/\//.test(href) || href.startsWith('mailto:');
}

function actionLinkProps(link: AuthLoginActionLink | AuthIdentityProviderAction) {
  const external = link.external ?? isExternalHref(link.href);

  return external
    ? { target: '_blank', rel: 'noreferrer' }
    : {};
}

function AuthStandardLoginFooter() {
  return (
    <p className="text-center text-sm text-slate-400">
      © 2026 SSOT
    </p>
  );
}

export function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </main>
  );
}

export function AuthLoadingScreen({
  message = '로딩 중...',
}: AuthLoadingScreenProps) {
  return (
    <AuthPageShell>
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#0B3B3B] border-t-transparent" />
        <p className="text-slate-600">{message}</p>
      </div>
    </AuthPageShell>
  );
}

export function AuthLoginCard({
  header,
  footer,
  isLoading = false,
  passwordResetHref,
  registrationLink,
  identityProviders = [],
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
    <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-7">{header}</div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        {formError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-900" htmlFor="loginId">
            {loginIdLabel}
          </label>
          <input
            id="loginId"
            type="text"
            autoComplete="username"
            value={loginId}
            onChange={(event) => setLoginId(event.target.value)}
            className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0B3B3B] focus:ring-2 focus:ring-[#0B3B3B]/15"
            placeholder={loginIdPlaceholder}
          />
          {fieldErrors.loginId && (
            <p className="text-sm text-red-700">{fieldErrors.loginId}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label className="block text-sm font-medium text-slate-900" htmlFor="password">
              {passwordLabel}
            </label>
            {passwordResetHref ? (
              <a
                href={passwordResetHref}
                className="text-sm font-medium text-[#0B3B3B] underline-offset-4 transition-colors hover:text-[#114F4F] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B3B3B]/20"
                {...actionLinkProps({ href: passwordResetHref, label: '비밀번호 찾기' })}
              >
                비밀번호 찾기
              </a>
            ) : null}
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0B3B3B] focus:ring-2 focus:ring-[#0B3B3B]/15"
            placeholder={passwordPlaceholder}
          />
          {fieldErrors.password && (
            <p className="text-sm text-red-700">{fieldErrors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="h-11 w-full cursor-pointer rounded-md bg-[#0B3B3B] px-4 text-sm font-medium text-white transition hover:bg-[#114F4F] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? loadingLabel : submitLabel}
        </button>
      </form>

      {identityProviders.length > 0 ? (
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-500">또는</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="grid gap-2">
            {identityProviders.map((provider) => {
              const Icon = provider.icon ?? KeyRound;

              return (
                <a
                  key={provider.key}
                  href={provider.href}
                  className="flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 transition-colors hover:border-[#0B3B3B] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B3B3B]/20"
                  {...actionLinkProps(provider)}
                >
                  <Icon aria-hidden className="h-4 w-4 text-slate-600" />
                  {provider.label}
                </a>
              );
            })}
          </div>
        </div>
      ) : null}

      {registrationLink ? (
        <div className="mt-5 rounded-md bg-slate-50 px-4 py-3 text-center text-sm text-slate-600">
          계정이 필요하신가요?
          {' '}
          <a
            href={registrationLink.href}
            className="font-medium text-[#0B3B3B] underline-offset-4 transition-colors hover:text-[#114F4F] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B3B3B]/20"
            {...actionLinkProps(registrationLink)}
          >
            {registrationLink.label}
          </a>
        </div>
      ) : null}

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
  title,
  passwordResetHref,
  registrationLink,
  identityProviders,
  onSubmit,
}: AuthStandardLoginCardProps) {
  return (
    <AuthLoginCard
      header={(
        <AuthStandardLoginHeader
          title={title}
        />
      )}
      footer={<AuthStandardLoginFooter />}
      isLoading={isLoading}
      passwordResetHref={passwordResetHref}
      registrationLink={registrationLink}
      identityProviders={identityProviders}
      onSubmit={onSubmit}
      validate={validateStandardLogin}
    />
  );
}
