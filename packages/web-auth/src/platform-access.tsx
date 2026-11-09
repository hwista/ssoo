'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { StoreApi, UseBoundStore } from 'zustand';
import type { AuthIdentity, OnboardingSnapshot, OnboardingServiceCode } from '@ssoo/types/common';
import { Button } from '@ssoo/web-ui';
import { SsooErrorNotice, SsooErrorPage } from '@ssoo/web-shell';
import type { AuthStore } from './store';
import { createSharedAxiosApiClient } from './axios-api-client';
import { getCommonSearchApiBaseUrl, resolveCommonSearchResultHref } from './search-routing';
import { getPlatformAccessHref, PLATFORM_ACCESS_PATHS } from './platform-access-routing';

interface PlatformAccessState {
  snapshot: OnboardingSnapshot;
  refresh: () => Promise<void>;
  refreshing: boolean;
}

const PlatformAccessContext = createContext<PlatformAccessState | null>(null);
export function usePlatformAccess() { return useContext(PlatformAccessContext); }

export interface SharedPlatformAccessBoundaryProps<TUser extends AuthIdentity = AuthIdentity> {
  authStore: UseBoundStore<StoreApi<AuthStore<TUser>>>;
  app: 'admin' | OnboardingServiceCode;
  pathname: string;
  children: ReactNode;
}

export function SharedPlatformAccessBoundary<TUser extends AuthIdentity = AuthIdentity>({
  authStore, app, pathname, children,
}: SharedPlatformAccessBoundaryProps<TUser>) {
  const authenticated = authStore((state) => state.isAuthenticated);
  const accessToken = authStore((state) => state.accessToken);
  const identity = authStore((state) => state.user?.userId ?? '');
  const logout = authStore((state) => state.logout);
  const [result, setResult] = useState<{ identity: string; snapshot: OnboardingSnapshot } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [refreshing, setRefreshing] = useState(false);
  const generation = useRef(0);
  const publicSurface = /^\/(login|password-reset|setup|recovery)(\/|$)/.test(pathname) || pathname.startsWith('/auth/');
  const refresh = useCallback(async () => {
    if (!authenticated || !accessToken || !identity || publicSurface) return;
    const version = ++generation.current;
    setRefreshing(true);
    try {
      const response = await createSharedAxiosApiClient({ baseURL: getCommonSearchApiBaseUrl() })
        .get<{ success: boolean; data: OnboardingSnapshot }>('/onboarding');
      if (!response.data.success) throw new Error('소속·서비스 상태를 확인하지 못했습니다.');
      if (version === generation.current) { setResult({ identity, snapshot: response.data.data }); setError(null); }
    } catch (cause) { if (version === generation.current) setError(cause); }
    finally { if (version === generation.current) setRefreshing(false); }
  }, [authenticated, accessToken, identity, publicSurface]);
  useEffect(() => {
    void refresh();
    const focus = () => { void refresh(); };
    window.addEventListener('focus', focus);
    return () => { generation.current++; window.removeEventListener('focus', focus); };
  }, [refresh, pathname]);
  if (publicSurface || !authenticated || !accessToken) return children;
  if (error) return <SsooErrorPage error={error} title="접근 상태를 확인하지 못했습니다" onRetry={refresh} retrying={refreshing}
    actions={[{ label: '로그아웃', onClick: logout, intent: 'exit' }]} />;
  if (!result || result.identity !== identity) return <main className="grid min-h-screen place-items-center"><p role="status">접근 상태를 확인하고 있습니다…</p></main>;
  const { snapshot } = result;
  // Admin owns the personal and review routes as well as management routes.
  // Its layout/registry authorizes each function; server permissions stay authoritative.
  const allowed = app === 'admin' || (snapshot.status === 'active' && snapshot.availableServices.includes(app));
  return <PlatformAccessContext.Provider value={{ snapshot, refresh, refreshing }}>
    {allowed ? children : <ServiceAccessRequired app={app} snapshot={snapshot} refresh={refresh} refreshing={refreshing} logout={logout} />}
  </PlatformAccessContext.Provider>;
}

function ServiceAccessRequired({ app, snapshot, refresh, refreshing, logout }: {
  app: 'admin' | OnboardingServiceCode; snapshot: OnboardingSnapshot;
  refresh: () => Promise<void>; refreshing: boolean; logout: () => Promise<void>;
}) {
  const [error, setError] = useState<unknown>(null);
  return <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-5 px-6 py-8">
    <h1 className="text-2xl font-semibold">{app.toUpperCase()} 이용 권한이 필요합니다</h1>
    <p className="text-sm text-muted-foreground">{snapshot.status === 'suspended'
      ? '플랫폼 이용이 정지된 계정입니다. 플랫폼 관리자에게 문의해 주세요.'
      : '내 소속과 서비스 이용 메뉴에서 현재 상태를 확인하고 필요한 권한을 신청할 수 있습니다.'}</p>
    {error ? <SsooErrorNotice error={error} /> : null}
    <nav aria-label="접근 권한 관련 메뉴" className="flex flex-wrap gap-2">
      <Button asChild variant="outline"><a href={getPlatformAccessHref(PLATFORM_ACCESS_PATHS.organizations)}>내 소속</a></Button>
      <Button asChild><a href={getPlatformAccessHref(PLATFORM_ACCESS_PATHS.services)}>서비스 이용</a></Button>
      {snapshot.canReview ? <Button asChild variant="outline"><a href={getPlatformAccessHref(PLATFORM_ACCESS_PATHS.approvals)}>신청 승인</a></Button> : null}
      {snapshot.availableServices.map((code) => <Button key={code} asChild variant="outline"><a href={resolveCommonSearchResultHref({ sourceApp: code, target: { sourceApp: code, path: '/' } }) ?? '/'}>{code.toUpperCase()} 열기</a></Button>)}
    </nav>
    <div className="flex gap-2"><Button variant="outline" disabled={refreshing} onClick={() => void refresh()}>상태 다시 확인</Button>
      <Button variant="ghost" onClick={() => { void logout().catch(setError); }}>로그아웃</Button></div>
  </main>;
}
