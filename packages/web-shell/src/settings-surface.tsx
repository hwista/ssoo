import type { ComponentType, ReactNode } from 'react';
import { cn } from './cn';

export type SsooSettingsIcon = ComponentType<{ className?: string }>;
export type SsooSettingsBannerTone = 'danger' | 'success' | 'warning' | 'neutral';

export interface SsooSettingsNavigationGroup<ItemId extends string = string, GroupId extends string = string> {
  id: GroupId;
  label: string;
  items: Array<{
    id: ItemId;
    label: string;
    description?: string;
    icon?: SsooSettingsIcon;
    disabled?: boolean;
  }>;
}

export interface SsooSettingsSurfaceProps {
  navigationSlot: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SsooSettingsSurface({
  navigationSlot,
  children,
  className,
  contentClassName,
}: SsooSettingsSurfaceProps) {
  return (
    <section className={cn('flex h-full min-h-0 gap-4 overflow-hidden font-sans', className)}>
      {navigationSlot}
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

export interface SsooSettingsNavigationProps<ItemId extends string = string, GroupId extends string = string> {
  title: string;
  groups: Array<SsooSettingsNavigationGroup<ItemId, GroupId>>;
  activeItemId: ItemId;
  onSelect: (itemId: ItemId) => void;
  className?: string;
}

export function SsooSettingsNavigation<ItemId extends string = string, GroupId extends string = string>({
  title,
  groups,
  activeItemId,
  onSelect,
  className,
}: SsooSettingsNavigationProps<ItemId, GroupId>) {
  return (
    <aside className={cn('flex h-full w-[280px] shrink-0 flex-col border-r border-ssoo-content-border bg-ssoo-content-bg', className)}>
      <nav aria-label={`${title} 세부 메뉴`} className="min-h-0 flex-1 overflow-y-auto py-2">
        {groups.map((group) => (
          <section key={group.id} className="pb-2">
            <p className="px-3 pb-1 pt-2 text-badge text-ssoo-primary/50">{group.label}</p>
            <div role="group" aria-label={`${group.label} 메뉴`}>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === activeItemId;

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={item.disabled}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => onSelect(item.id)}
                    className={cn(
                      'mx-2 flex w-[calc(100%-1rem)] items-center rounded-md py-2 text-left transition-colors',
                      'gap-3 px-3',
                      isActive ? 'bg-ssoo-sitemap-bg text-ssoo-primary' : 'text-gray-600 hover:bg-white hover:text-ssoo-primary',
                      item.disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent hover:text-gray-600'
                    )}
                  >
                    {Icon ? <Icon className="h-5 w-5 shrink-0" /> : null}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.label}</span>
                      {item.description ? <span className="block truncate text-xs text-gray-500">{item.description}</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
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
        tone === 'neutral' && 'border-ssoo-content-border bg-ssoo-content-bg/50 text-ssoo-primary',
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
    <section className={cn('mb-3 rounded-md border border-ssoo-content-border bg-ssoo-content-bg/50 px-3 py-2', className)}>
      <p className="text-badge text-ssoo-primary">{title}</p>
      <p className="mt-1 text-caption text-ssoo-primary/80">{labels.join(', ')}</p>
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
    <div className={cn('flex items-center gap-2', className)}>
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            disabled={option.disabled}
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-control-h items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors',
              isActive
                ? 'border-ssoo-primary bg-ssoo-primary text-white'
                : 'border-ssoo-content-border bg-white text-ssoo-primary hover:bg-ssoo-content-bg',
              option.disabled && 'cursor-not-allowed opacity-50 hover:bg-white'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
