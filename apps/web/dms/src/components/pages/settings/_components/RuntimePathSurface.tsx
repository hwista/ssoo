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
    return binding.envVar ? `환경변수 override (${binding.envVar})` : '환경변수 override';
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
      <article className="rounded-lg border border-ssoo-content-border bg-white px-4 py-3">
        <div className="flex items-start gap-2">
          <FolderOpen className="mt-0.5 h-4 w-4 text-ssoo-primary/70" />
          <div>
            <p className="text-badge text-ssoo-primary/70">실제 서비스 runtime path</p>
            <h3 className="mt-1 text-label-strong text-ssoo-primary">{title}</h3>
            <p className="mt-2 text-body-sm text-ssoo-primary/80">{description}</p>
          </div>
        </div>
      </article>

      <div className="grid gap-3">
        {entries.map(({ key, label, description: entryDescription, binding }) => {
          const healthy = binding.exists;
          return (
            <article key={key} className="rounded-lg border border-ssoo-content-border bg-white px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-label-strong text-ssoo-primary">{label}</p>
                  <p className="mt-1 text-body-sm text-ssoo-primary/75">{entryDescription}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-badge ${
                    healthy
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700'
                  }`}
                >
                  {healthy ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  {healthy ? '경로 확인됨' : '경로 미존재'}
                </span>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <PathInfoRow label="Resolved path" value={binding.resolvedPath} breakAll />
                <PathInfoRow label="Source" value={formatSource(binding)} />
                <PathInfoRow label="Configured value" value={binding.configuredPath} breakAll />
                <PathInfoRow label="Effective input" value={binding.effectiveInput} breakAll />
              </div>

              {binding.relativeToAppRoot && (
                <p className="mt-3 text-caption text-ssoo-primary/70">
                  effective input 이 상대 경로라서 app root 기준으로 해석됩니다.
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
