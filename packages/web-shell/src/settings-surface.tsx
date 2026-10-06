import { SsooErrorNotice } from './error-recovery';
import type { ReactNode } from 'react';
import { cn } from './cn';

export type SsooSettingsBannerTone = 'danger' | 'success' | 'warning' | 'neutral';

export interface SsooSettingsSurfaceProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SsooSettingsSurface({
  children,
  className,
  contentClassName,
}: SsooSettingsSurfaceProps) {
  return (
    <section className={cn('flex h-full min-h-0 overflow-hidden font-sans', className)}>
      <div className={cn('min-h-0 flex-1 overflow-hidden rounded-lg border border-ssoo-content-border bg-card', contentClassName)}>
        {children}
      </div>
    </section>
  );
}

export interface SsooSettingsMainPanelProps {
  children: ReactNode;
  className?: string;
}

export function SsooSettingsMainPanel({ children, className }: SsooSettingsMainPanelProps) {
  return <main className={cn('h-full min-h-0 overflow-y-auto p-3', className)}>{children}</main>;
}

export interface SsooSettingsBannerProps {
  tone: SsooSettingsBannerTone;
  children: ReactNode;
  leadingSlot?: ReactNode;
  className?: string;
}

export function SsooSettingsBanner({
  tone,
  children,
  leadingSlot,
  className,
}: SsooSettingsBannerProps) {
  if (tone === 'danger') return <SsooErrorNotice className={cn('mb-3', className)}>{leadingSlot}{children}</SsooErrorNotice>;
  return (
    <div
      className={cn(
        'mb-3 flex items-center gap-2 rounded-md border px-3 py-2 text-body-sm',
        tone === 'success' && 'ssoo-tone-success-surface',
        tone === 'warning' && 'ssoo-tone-warning-surface',
        tone === 'neutral' && 'border-ssoo-content-border ssoo-settings-subtle-surface text-ssoo-primary',
        className
      )}
    >
      {leadingSlot ? <span className="shrink-0">{leadingSlot}</span> : null}
      <span>{children}</span>
    </div>
  );
}

export interface SsooSettingsPendingSummaryProps {
  title?: ReactNode;
  labels: string[];
  className?: string;
}

export function SsooSettingsPendingSummary({
  title = '저장 예정 항목',
  labels,
  className,
}: SsooSettingsPendingSummaryProps) {
  if (labels.length === 0) {
    return null;
  }

  return (
    <section className={cn('mb-3 rounded-md border border-ssoo-content-border ssoo-settings-subtle-surface px-3 py-2', className)}>
      <p className="text-badge text-ssoo-primary">{title}</p>
      <p className="mt-1 text-caption ssoo-text-primary-80">{labels.join(', ')}</p>
    </section>
  );
}
