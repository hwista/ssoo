'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuthIdentity } from '@ssoo/types/common';
import type { StoreApi, UseBoundStore } from 'zustand';
import { Button } from '@ssoo/web-ui';
import { SsooErrorPage, SsooErrorNotice, type SsooErrorKind, type SsooRecoveryAction } from '@ssoo/web-shell';
import { loadAccessibleSsooServices, type SsooServiceAccessResult, type SsooRecoveryApp } from './service-access';
import type { AuthStore } from './store';

export interface SharedAppRecoveryProps<TUser extends AuthIdentity> {
  authStore: UseBoundStore<StoreApi<AuthStore<TUser>>>;
  kind?: SsooErrorKind;
  title?: string;
  description?: string;
  error?: unknown;
  excludeApp?: SsooRecoveryApp;
  onRetry?: () => void | Promise<unknown>;
  retrying?: boolean;
  restoreSession?: boolean;
}

export function SharedAppRecovery<TUser extends AuthIdentity>({ authStore, kind, title, description, error, excludeApp, onRetry, retrying, restoreSession = false }: SharedAppRecoveryProps<TUser>) {
  const userId = authStore(state => state.user?.userId);
  const hydrated = authStore(state => state._hasHydrated);
  const authenticated = authStore(state => state.isAuthenticated);
  const accessToken = authStore(state => state.accessToken);
  const authLoading = authStore(state => state.isLoading);
  const checkAuth = authStore(state => state.checkAuth);
  const sessionError = authStore(state => state.sessionError);
  const [result, setResult] = useState<{ userId: string; data: SsooServiceAccessResult } | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const sequence = useRef(0);
  const attemptedRestore = useRef(false);
  const refreshServices = useCallback(async () => {
    const ticket = ++sequence.current;
    if (!userId || !authenticated || !accessToken) { setResult(null); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await loadAccessibleSsooServices(excludeApp);
      if (ticket === sequence.current) setResult({ userId, data });
    } catch {
      if (ticket === sequence.current) setResult({ userId, data: { services: [], hasUnverifiedServices: true } });
    } finally {
      if (ticket === sequence.current) setLoading(false);
    }
  }, [accessToken, authenticated, excludeApp, userId]);

  useEffect(() => {
    if (restoreSession && hydrated && !attemptedRestore.current) {
      attemptedRestore.current = true;
      void checkAuth().catch(() => setActionError('로그인 상태를 확인하지 못했습니다. 다시 시도해 주세요.'));
    }
  }, [checkAuth, hydrated, restoreSession]);
  useEffect(() => { void refreshServices(); return () => { sequence.current++; }; }, [refreshServices]);

  const data = result && result.userId === userId ? result.data : undefined;
  const actions: SsooRecoveryAction[] = authenticated ? [{
    label: '로그아웃 후 다른 계정으로 로그인', intent: 'exit', disabled: authLoading,
    onClick: async () => {
      setActionError(null);
      try {
        await authStore.getState().logout();
        window.location.replace('/login');
      } catch { setActionError('로그아웃하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.'); }
    },
  }] : [{ label: '로그인 화면으로 이동', href: '/login' }];
  if (onRetry || authenticated || restoreSession) actions.push({
    label: retrying || loading ? '확인 중...' : '접근 권한 다시 확인', intent: 'retry', disabled: retrying || loading,
    onClick: async () => {
      setActionError(null);
      if (restoreSession) await checkAuth();
      await Promise.all([onRetry?.(), refreshServices()]);
    },
  });
  if (kind !== 'forbidden') actions.push({ label: '홈으로 이동', href: '/' });

  return <SsooErrorPage kind={kind} title={title} description={description} error={error} actions={actions}>
    {authenticated ? <nav aria-label="이용 가능한 서비스" className="space-y-3">
      <h2 className="text-body-sm font-semibold">이용 가능한 서비스</h2>
      {loading && !data ? <p role="status" className="text-body-sm text-muted-foreground">서비스 접근 권한을 확인하고 있습니다.</p> : <>
        <div className="grid gap-2 sm:grid-cols-2">{data?.services.map(service => <Button key={service.code} variant="outline" asChild><a href={service.href}>{service.label}로 이동</a></Button>)}</div>
        {data?.hasUnverifiedServices ? <SsooErrorNotice message="일부 서비스의 접근 권한을 확인하지 못했습니다. 다시 확인해 주세요." />
          : data && data.services.length === 0 ? <p role="status" className="text-body-sm text-muted-foreground">이용 가능한 서비스가 없습니다. 관리자에게 권한을 요청하거나 다른 계정으로 로그인해 주세요.</p> : null}
      </>}
    </nav> : null}
    {sessionError ? <SsooErrorNotice message={sessionError} /> : null}
    {actionError ? <SsooErrorNotice message={actionError} /> : null}
  </SsooErrorPage>;
}
