'use client';

import { useEffect, useMemo, useState } from 'react';
import type { StoreApi, UseBoundStore } from 'zustand';
import { AuthLoadingScreen, AuthPageShell, AuthStandardLoginCard } from './ui';
import type { AuthIdentityProviderAction, AuthLoginActionLink } from './ui';
import { useLoginPageBootstrap } from './login-bootstrap';
import type { AuthIdentity, AuthPublicLoginConfig } from '@ssoo/types/common';
import type { AuthStore } from './store';

export interface SharedAuthLoginPageProps<TUser extends AuthIdentity = AuthIdentity> {
  appName?: string;
  appDescription?: string;
  homePath: string;
  authStore: UseBoundStore<StoreApi<AuthStore<TUser>>>;
  navigate: (path: string) => void;
  beforeSubmit?: () => void | Promise<void>;
  loadingMessage?: string;
  returnTo?: string | null;
  passwordResetHref?: string;
  passwordLoginEnabled?: boolean;
  registrationLink?: AuthLoginActionLink;
  identityProviders?: AuthIdentityProviderAction[];
}

function isSafeRelativeReturnPath(value: string | null | undefined): value is string {
  return Boolean(
    value
      && value.startsWith('/')
      && !value.startsWith('//')
      && !value.includes('://'),
  );
}

export function resolveAuthReturnPath(
  returnTo: string | null | undefined,
  fallbackPath: string,
): string {
  return isSafeRelativeReturnPath(returnTo) ? returnTo : fallbackPath;
}

function readPublicHref(value: string | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : undefined;
}

function resolveDefaultRegistrationLink(): AuthLoginActionLink | undefined {
  const signupRequestHref = readPublicHref(process.env.NEXT_PUBLIC_AUTH_SIGNUP_REQUEST_URL);
  if (signupRequestHref) {
    return {
      href: signupRequestHref,
      label: '가입 요청',
    };
  }

  const signupHref = readPublicHref(process.env.NEXT_PUBLIC_AUTH_SIGNUP_URL);
  if (signupHref) {
    return {
      href: signupHref,
      label: '회원가입',
    };
  }

  return undefined;
}

function createIdentityProvider(
  key: string,
  label: string,
  href: string | undefined,
): AuthIdentityProviderAction | null {
  const resolvedHref = readPublicHref(href);

  return resolvedHref
    ? {
        key,
        label,
        href: resolvedHref,
      }
    : null;
}

function resolveDefaultIdentityProviders(): AuthIdentityProviderAction[] {
  return [
    createIdentityProvider('sso', 'SSO 로그인', process.env.NEXT_PUBLIC_AUTH_SSO_URL),
    createIdentityProvider('microsoft', 'Microsoft 365 로그인', process.env.NEXT_PUBLIC_AUTH_OAUTH_MICROSOFT_URL),
  ].filter((provider): provider is AuthIdentityProviderAction => provider !== null);
}

function resolvePublicConfigUrl(): string | null {
  const apiBaseUrl = readPublicHref(process.env.NEXT_PUBLIC_API_URL);
  if (!apiBaseUrl) {
    return null;
  }

  return `${apiBaseUrl.replace(/\/+$/, '')}/auth/public-config`;
}

async function fetchPublicLoginConfig(): Promise<AuthPublicLoginConfig | null> {
  const configUrl = resolvePublicConfigUrl();
  if (!configUrl) {
    return null;
  }

  const response = await fetch(configUrl, {
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null) as {
    success?: boolean;
    data?: AuthPublicLoginConfig;
  } | null;

  return payload?.success && payload.data ? payload.data : null;
}

export function SharedAuthLoginPage<TUser extends AuthIdentity = AuthIdentity>({
  homePath,
  authStore,
  navigate,
  beforeSubmit,
  loadingMessage,
  returnTo,
  passwordResetHref,
  passwordLoginEnabled,
  registrationLink,
  identityProviders,
}: SharedAuthLoginPageProps<TUser>) {
  const [publicConfig, setPublicConfig] = useState<AuthPublicLoginConfig | null>(null);
  const login = authStore((state) => state.login);
  const checkAuth = authStore((state) => state.checkAuth);
  const isLoading = authStore((state) => state.isLoading);
  const isAuthenticated = authStore((state) => state.isAuthenticated);
  const hasHydrated = authStore((state) => state._hasHydrated);
  const effectiveReturnTo = returnTo ?? (
    typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search).get('returnTo')
  );
  const postLoginPath = useMemo(
    () => resolveAuthReturnPath(effectiveReturnTo, homePath),
    [effectiveReturnTo, homePath],
  );
  const resolvedPasswordResetHref = passwordResetHref
    ?? publicConfig?.passwordResetHref
    ?? readPublicHref(process.env.NEXT_PUBLIC_AUTH_PASSWORD_RESET_URL);
  const resolvedPasswordLoginEnabled = passwordLoginEnabled ?? publicConfig?.passwordLoginEnabled ?? true;
  const resolvedRegistrationLink = registrationLink ?? publicConfig?.registrationLink ?? resolveDefaultRegistrationLink();
  const resolvedIdentityProviders = identityProviders ?? publicConfig?.identityProviders ?? resolveDefaultIdentityProviders();

  useEffect(() => {
    let isMounted = true;

    fetchPublicLoginConfig()
      .then((config) => {
        if (isMounted && config) {
          setPublicConfig(config);
        }
      })
      .catch(() => {
        if (isMounted) {
          setPublicConfig(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const { showLoading, shouldRenderLogin } = useLoginPageBootstrap({
    hasHydrated,
    isAuthenticated,
    authIsLoading: isLoading,
    checkAuth,
    onAuthenticated: () => navigate(resolveAuthReturnPath(effectiveReturnTo, homePath)),
  });

  if (showLoading) {
    return <AuthLoadingScreen message={loadingMessage} />;
  }

  if (!shouldRenderLogin) {
    return null;
  }

  return (
    <AuthPageShell>
      <AuthStandardLoginCard
        isLoading={isLoading}
        passwordLoginEnabled={resolvedPasswordLoginEnabled}
        passwordResetHref={resolvedPasswordResetHref}
        registrationLink={resolvedRegistrationLink}
        identityProviders={resolvedIdentityProviders}
        onSubmit={async ({ loginId, password }) => {
          await beforeSubmit?.();
          await login(loginId, password);
          navigate(postLoginPath);
        }}
      />
    </AuthPageShell>
  );
}
