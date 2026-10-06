'use client';

import { SsooErrorNotice } from '@ssoo/web-shell';
import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowUpRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { Badge, Button } from '@ssoo/web-ui';
import type { LaunchReadinessSnapshot, LaunchReadinessStatus } from '@ssoo/types/common';
import { useAuthStore } from '@/stores/auth.store';

interface LaunchService extends LaunchReadinessSnapshot {
  label: string;
}

interface LaunchReadinessResponse {
  generatedAt: string;
  services: LaunchService[];
}

interface BackendEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: { message?: string };
}

const CRM_APP_URL = process.env.NEXT_PUBLIC_CRM_APP_URL?.replace(/\/$/, '') || 'http://localhost:3001';
const DMS_APP_URL = process.env.NEXT_PUBLIC_DMS_APP_URL?.replace(/\/$/, '') || 'http://localhost:3003';

const statusLabel: Record<LaunchReadinessStatus, string> = {
  ready: '준비',
  degraded: '주의',
  blocked: '차단',
  unknown: '확인 불가',
};

function formatDateTime(value: string | null): string {
  if (!value) return '확인 시각 없음';
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export function LaunchReadinessPanel() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [data, setData] = useState<LaunchReadinessResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/launch-readiness', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await response.json().catch(() => null) as BackendEnvelope<LaunchReadinessResponse> | null;
      if (!response.ok || payload?.success !== true || !payload.data) {
        throw new Error(payload?.error?.message || '서비스 런칭 상태를 불러오지 못했습니다.');
      }
      setData(payload.data);
      setNow(Date.now());
    } catch (cause) {
      setData(null);
      setError(cause instanceof Error ? cause.message : '서비스 런칭 상태 조회에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">동시 런칭 운영 상태</h2>
          <p className="mt-1 text-sm text-muted-foreground">Admin은 상태를 요약하고 CRM·DMS의 소유 운영 화면으로 연결합니다.</p>
        </div>
        <Button variant="outline" size="sm" type="button" onClick={() => void load()} disabled={!accessToken || isLoading}>
          <RefreshCw className="h-4 w-4" /> {isLoading ? '확인 중' : '새로고침'}
        </Button>
      </div>
      {error ? <SsooErrorNotice className="gap-2 px-5 py-3"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</SsooErrorNotice> : null}
      {isLoading && !data ? <div className="px-5 py-6 text-sm text-muted-foreground">CRM·DMS live readiness를 확인하는 중입니다.</div> : null}
      {data ? (
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          {data.services.map((service) => {
            const appUrl = service.owner === 'crm' ? CRM_APP_URL : DMS_APP_URL;
            const stale = service.expiresAt !== null && Date.parse(service.expiresAt) <= now;
            const status: LaunchReadinessStatus = stale ? 'unknown' : service.status;
            const blockerCount = stale ? null : service.blockerCount;
            const degradedCount = stale ? null : service.degradedCount;
            return (
              <article key={service.owner} className="rounded-md border bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {status === 'ready' ? <CheckCircle2 className="h-5 w-5 text-ssoo-success" /> : <AlertCircle className="h-5 w-5 text-ssoo-danger" />}
                    <h3 className="font-semibold text-foreground">{service.label}</h3>
                  </div>
                  <Badge variant={status === 'ready' ? 'default' : status === 'blocked' || status === 'unknown' ? 'destructive' : 'secondary'}>{statusLabel[status]}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md border bg-card px-3 py-2"><div className="text-xs text-muted-foreground">차단</div><div className="mt-1 text-lg font-semibold text-foreground">{blockerCount ?? '—'}</div></div>
                  <div className="rounded-md border bg-card px-3 py-2"><div className="text-xs text-muted-foreground">주의</div><div className="mt-1 text-lg font-semibold text-foreground">{degradedCount ?? '—'}</div></div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{stale ? '스냅샷 유효 시간이 지났습니다. 새로고침하세요.' : service.reason}</p>
                <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(service.checkedAt)}</p>
                <p className="mt-1 break-all text-xs text-muted-foreground">snapshot {service.snapshotId ?? '없음'} · {service.source}</p>
                <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                  <a href={`${appUrl}${service.ownerHref}`}>{service.label} 운영 화면 열기 <ArrowUpRight className="h-4 w-4" /></a>
                </Button>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
