import type { ReactNode } from 'react';
import { cn } from './cn';
import { SegmentedControl, SegmentedControlItem } from '@ssoo/web-ui';

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
    <section className={cn('flex h-full min-h-0 gap-4 overflow-hidden font-sans', className)}>
      <div className={cn('min-h-0 flex-1 overflow-hidden rounded-lg border border-ssoo-content-border bg-white', contentClassName)}>
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
  return <main className={cn('h-full min-h-0 overflow-y-auto p-4', className)}>{children}</main>;
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
  return (
    <div
      className={cn(
        'mb-3 flex items-center gap-2 rounded-md border px-3 py-2 text-body-sm',
        tone === 'danger' && 'border-destructive/30 bg-destructive/10 text-destructive',
        tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
        tone === 'warning' && 'border-amber-200 bg-amber-50 text-amber-800',
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

export interface SsooSettingsViewModeOption<Value extends string = string> {
  value: Value;
  label: string;
  disabled?: boolean;
}

export interface SsooSettingsViewModeTabsProps<Value extends string = string> {
  options: Array<SsooSettingsViewModeOption<Value>>;
  value: Value;
  onChange: (value: Value) => void;
  className?: string;
}

export function SsooSettingsViewModeTabs<Value extends string = string>({
  options,
  value,
  onChange,
  className,
}: SsooSettingsViewModeTabsProps<Value>) {
  return (
    <SegmentedControl className={cn('items-center gap-2', className)}>
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <SegmentedControlItem
            key={option.value}
            disabled={option.disabled}
            selected={isActive}
            size="default"
            surface="white"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </SegmentedControlItem>
        );
      })}
    </SegmentedControl>
  );
}
