'use client';

import { Children, type ReactNode } from 'react';
import type { AuthIdentity } from '@ssoo/types/common';
import type { StoreApi, UseBoundStore } from 'zustand';
import { SsooErrorNotice, SsooErrorPage } from '@ssoo/web-shell';
import type { AuthStore } from './store';

export function SharedSessionRecovery<TUser extends AuthIdentity>({ authStore, children }: {
  authStore: UseBoundStore<StoreApi<AuthStore<TUser>>>;
  children?: ReactNode;
}) {
  const error = authStore(state => state.sessionError);
  const accessToken = authStore(state => state.accessToken);
  const checkAuth = authStore(state => state.checkAuth);
  const loading = authStore(state => state.isLoading);
  if (error && (!accessToken || children === undefined)) return <SsooErrorPage kind="network" title="로그인 상태를 확인하지 못했습니다"
    description={error} onRetry={() => checkAuth()} retrying={loading}
    actions={[{ label: '로그인 화면으로 이동', href: '/login' }, { label: '서비스 복귀 안내', href: '/recovery' }]} />;
  return <div className="flex min-h-0 flex-1 flex-col">
    {error ? <SsooErrorNotice message={error} actions={[{ label: '로그인 상태 다시 확인', onClick: () => checkAuth({ mode: 'background' }) }, { label: '서비스 복귀 안내', href: '/recovery' }]} /> : null}
    {Children.toArray(children)}
  </div>;
}
