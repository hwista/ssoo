'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleHelp, CircleSlash2, HeartPulse } from 'lucide-react';
import type { DmsRuntimeReadinessClient } from '@/lib/api/endpoints/settings';

const CHECK_LABELS: Record<string, string> = {
  database: '데이터베이스',
  'settings-persistence': '설정 저장',
  'git-binding': '문서 저장소 연결·게시 정합성',
  'control-plane': '문서 목록 연동',
  'markdown-root': '문서 저장 폴더',
  'ingest-queue': '수집 작업 저장 폴더',
  'storage-local': '로컬 첨부 저장소',
  'storage-nas': '공유 첨부 저장소',
  'template-root': '서식 저장 폴더',
};

function getReadinessPresentation(status: DmsRuntimeReadinessClient['status']) {
  switch (status) {
    case 'ready':
      return {
        label: '운영 연결 정상',
        className: 'ssoo-tone-success-surface',
        icon: <CheckCircle2 className="h-4 w-4" />,
      };
    case 'degraded':
      return {
        label: '확인 필요',
        className: 'ssoo-tone-warning-surface',
        icon: <AlertTriangle className="h-4 w-4" />,
      };
    case 'blocked':
      return {
        label: '운영 연결 차단',
        className: 'ssoo-tone-danger-surface',
        icon: <CircleSlash2 className="h-4 w-4" />,
      };
    case 'unknown':
      return {
        label: '확인 불가',
        className: 'ssoo-tone-warning-surface',
        icon: <CircleHelp className="h-4 w-4" />,
      };
  }
}

function getCheckTone(status: DmsRuntimeReadinessClient['checks'][number]['status']) {
  switch (status) {
    case 'ready':
      return 'ssoo-tone-success-surface';
    case 'degraded':
      return 'ssoo-tone-warning-surface';
    case 'blocked':
      return 'ssoo-tone-danger-surface';
  }
}

export function RuntimeReadinessSurface({ readiness }: { readiness: DmsRuntimeReadinessClient | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!readiness) {
    return null;
  }

  const isStale = !readiness.expiresAt || Date.parse(readiness.expiresAt) <= now;
  const effectiveStatus = isStale ? 'unknown' : readiness.status;
  const presentation = getReadinessPresentation(effectiveStatus);
  return (
    <section className="mb-3 space-y-3">
      <article className="rounded-lg border border-ssoo-content-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-badge text-ssoo-primary/70">
              <HeartPulse className="h-4 w-4" />
              문서 운영 연결 상태
            </div>
            <h3 className="mt-1 text-label-strong text-ssoo-primary">데이터베이스 · 설정 저장 · 문서 저장소 · 문서 목록 연동 · 저장 경로</h3>
            <p className="mt-2 text-body-sm text-ssoo-primary/80">
              문서 운영에 필요한 연결과 저장 경로를 확인합니다. 전체 서비스의 출시 준비 상태를 뜻하지 않습니다.
            </p>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-badge ${presentation.className}`}>
            {presentation.icon}
            {presentation.label}
          </span>
        </div>
        <p className="mt-3 text-caption text-ssoo-primary/60">
          마지막 확인 {readiness.checkedAt ? new Date(readiness.checkedAt).toLocaleString('ko-KR') : '없음'} · 확인 번호 {readiness.snapshotId ?? '없음'}
        </p>
        <p className="mt-1 text-caption text-ssoo-primary/60">
          {isStale ? '스냅샷 유효 시간이 지나 상태를 확인 불가로 전환했습니다. 새로고침하세요.' : readiness.reason}
        </p>
      </article>

      {!isStale ? <div className="grid gap-2 lg:grid-cols-2">
        {readiness.checks.map((check) => (
          <article key={check.key} className="rounded-lg border border-ssoo-content-border bg-card px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-label-strong text-ssoo-primary">{CHECK_LABELS[check.key] ?? check.label}</p>
              <span className={`rounded-full border px-2 py-0.5 text-badge ${getCheckTone(check.status)}`}>
                {check.status === 'ready' ? '정상' : check.status === 'degraded' ? '확인 필요' : '차단'}
              </span>
            </div>
            <p className="mt-2 break-all text-caption text-ssoo-primary/75">{check.reason}</p>
          </article>
        ))}
      </div> : null}
    </section>
  );
}
