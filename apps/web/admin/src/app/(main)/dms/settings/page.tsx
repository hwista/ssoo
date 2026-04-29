'use client';

import { useDmsAdminSettings } from '@/hooks/queries/useDmsAdmin';

export default function DmsSettingsPage() {
  const { data: response, isLoading, error, refetch, isFetching } = useDmsAdminSettings();
  const settings = response?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">DMS 설정 inspector</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            런타임 경로 바인딩 / Git 메타 / 정규화된 설정. 민감 필드는 자동 마스킹됩니다.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="rounded-md border bg-card px-3 py-1.5 text-xs hover:bg-accent"
          disabled={isFetching}
        >
          {isFetching ? '갱신 중…' : '새로고침'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          설정을 불러오지 못했습니다.
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">로딩 중…</p>
      ) : settings ? (
        <div className="space-y-6">
          <Section title="경로 바인딩">
            <KV label="appRoot" value={settings.paths.appRoot} mono />
            <KV label="docDir" value={settings.paths.docDir} mono />
            <KV label="templateDir" value={settings.paths.templateDir} mono />
            <KV label="ingestQueueDir" value={settings.paths.ingestQueueDir} mono />
          </Section>

          <Section title="Document root binding">
            <Json value={settings.paths.documentRoot} />
          </Section>

          <Section title="Ingest queue binding">
            <Json value={settings.paths.ingestQueue} />
          </Section>

          <Section title="Storage (local)">
            <Json value={settings.paths.storageLocal} />
          </Section>

          <Section title="Git">
            <KV label="author.name" value={settings.git.author.name} />
            <KV label="author.email" value={settings.git.author.email} />
            <KV label="autoInit" value={String(settings.git.autoInit)} />
            <KV label="bootstrapBranch" value={settings.git.bootstrapBranch ?? '—'} />
            <KV label="bootstrapRemoteUrl" value={settings.git.bootstrapRemoteUrl ?? '—'} mono />
          </Section>

          <Section title="정규화된 설정 (redacted)">
            <Json value={settings.config} />
          </Section>
        </div>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      <div className="rounded-lg border bg-card p-4 text-sm">{children}</div>
    </section>
  );
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 border-b py-1.5 last:border-b-0">
      <span className="w-48 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <span className={mono ? 'break-all font-mono text-xs' : 'text-sm'}>{value}</span>
    </div>
  );
}

function Json({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-background p-3 font-mono text-xs">
      {value ? JSON.stringify(value, null, 2) : '—'}
    </pre>
  );
}
