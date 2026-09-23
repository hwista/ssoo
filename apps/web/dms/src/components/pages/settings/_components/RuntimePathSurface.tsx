import { AlertTriangle, CheckCircle2, FolderOpen } from 'lucide-react';
import type { SettingsRuntimePathClient } from '@/lib/api/endpoints/settings';

interface RuntimePathEntry {
  key: string;
  label: string;
  description: string;
  binding: SettingsRuntimePathClient;
}

function PathInfoRow({
  label,
  value,
  breakAll = false,
}: {
  label: string;
  value: string;
  breakAll?: boolean;
}) {
  return (
    <div className="rounded-lg border border-ssoo-content-border bg-ssoo-content-bg/20 px-3 py-2">
      <p className="text-badge text-ssoo-primary/60">{label}</p>
      <p className={`mt-1 text-body-sm text-ssoo-primary ${breakAll ? 'break-all' : ''}`}>{value}</p>
    </div>
  );
}

function formatSource(binding: SettingsRuntimePathClient) {
  if (binding.source === 'env') {
    return binding.envVar ? `환경변수 우선 적용 (${binding.envVar})` : '환경변수 우선 적용';
  }

  return '설정값 기준';
}

export function RuntimePathSurface({
  title,
  description,
  entries,
}: {
  title: string;
  description: string;
  entries: RuntimePathEntry[];
}) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="mb-3 space-y-3">
      <article className="rounded-lg border border-ssoo-content-border bg-card px-4 py-3">
        <div className="flex items-start gap-2">
          <FolderOpen className="mt-0.5 h-4 w-4 text-ssoo-primary/70" />
          <div>
            <p className="text-badge text-ssoo-primary/70">실제 사용 중인 저장 경로</p>
            <h3 className="mt-1 text-label-strong text-ssoo-primary">{title}</h3>
            <p className="mt-2 text-body-sm text-ssoo-primary/80">{description}</p>
          </div>
        </div>
      </article>

      <div className="grid gap-3">
        {entries.map(({ key, label, description: entryDescription, binding }) => {
          const healthy = binding.status === 'ready';
          const notRequired = binding.status === 'not-required';
          return (
            <article key={key} className="rounded-lg border border-ssoo-content-border bg-card px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-label-strong text-ssoo-primary">{label}</p>
                  <p className="mt-1 text-body-sm text-ssoo-primary/75">{entryDescription}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-badge ${
                    healthy
                      ? 'ssoo-tone-success-surface'
                      : notRequired
                        ? 'border-ssoo-content-border bg-ssoo-content-bg text-ssoo-primary/80'
                        : 'ssoo-tone-danger-surface'
                  }`}
                >
                  {healthy ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  {healthy ? '읽기·쓰기 확인' : notRequired ? '사용하지 않는 저장소' : '운영 차단'}
                </span>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <PathInfoRow label="실제 경로" value={binding.resolvedPath} breakAll />
                <PathInfoRow label="적용 기준" value={formatSource(binding)} />
                <PathInfoRow label="설정된 경로" value={binding.configuredPath} breakAll />
                <PathInfoRow label="적용된 입력값" value={binding.effectiveInput} breakAll />
                <PathInfoRow
                  label="접근 확인"
                  value={`폴더 ${binding.isDirectory ? '있음' : '없음'} · 읽기 ${binding.readable ? '가능' : '불가'} · 쓰기 ${binding.writable ? '가능' : '불가'}`}
                />
              </div>

              {binding.reason && (
                <p className={`mt-3 text-caption ${binding.status === 'blocked' ? 'text-ssoo-danger' : 'text-ssoo-primary/70'}`}>
                  {binding.reason}
                </p>
              )}

              {binding.relativeToAppRoot && (
                <p className="mt-3 text-caption text-ssoo-primary/70">
                  적용된 입력값이 상대 경로이므로 앱의 기준 폴더에서 해석합니다.
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
