import { forwardRef, useEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, FocusEventHandler, KeyboardEventHandler, ReactNode } from 'react';
import { cn } from './cn';
import { Button, Input } from '@ssoo/web-ui';

export type SsooHeaderMode = 'primary' | 'neutral' | 'transparent';

export interface SsooHeaderProps {
  mode?: SsooHeaderMode;
  leadingSlot?: ReactNode;
  searchSlot?: ReactNode;
  centerSlot?: ReactNode;
  actionsSlot?: ReactNode;
  className?: string;
  leadingClassName?: string;
  searchClassName?: string;
  centerClassName?: string;
  actionsClassName?: string;
}

export function SsooHeader({
  mode = 'primary',
  leadingSlot,
  searchSlot,
  centerSlot,
  actionsSlot,
  className,
  leadingClassName,
  searchClassName,
  centerClassName,
  actionsClassName,
}: SsooHeaderProps) {
  return (
    <header
      data-ssoo-header-mode={mode}
      className={cn(
        'flex h-header-h shrink-0 items-center justify-between px-4',
        mode === 'primary' && 'bg-ssoo-primary',
        mode === 'neutral' && 'border-b border-ssoo-content-border bg-ssoo-content-bg',
        mode === 'transparent' && 'bg-transparent',
        className
      )}
    >
      <div className={cn('flex min-w-0 flex-1 items-center gap-3', leadingClassName)}>
        {leadingSlot}
        {searchSlot && <div className={cn('flex w-full max-w-md items-center', searchClassName)}>{searchSlot}</div>}
      </div>
      {centerSlot && <div className={cn('min-w-0 flex-1', centerClassName)}>{centerSlot}</div>}
      {actionsSlot && <div className={cn('flex shrink-0 items-center gap-2', actionsClassName)}>{actionsSlot}</div>}
    </header>
  );
}

export interface SsooHeaderActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tone?: 'primary-on-color' | 'ghost-on-color' | 'disabled-on-color' | 'neutral';
}

export function SsooHeaderActionButton({
  children,
  tone = 'primary-on-color',
  className,
  disabled,
  type = 'button',
  ...props
}: SsooHeaderActionButtonProps) {
  return (
    <Button variant="plain" size="plain"
      type={type}
      disabled={disabled}
      className={cn(
        'flex h-control-h items-center gap-1 rounded-md px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0',
        tone === 'primary-on-color' && 'bg-white text-ssoo-primary hover:bg-gray-100 disabled:bg-white/70 disabled:opacity-70',
        tone === 'ghost-on-color' && 'bg-white/10 text-white hover:bg-white/15 disabled:text-white/70 disabled:opacity-70',
        tone === 'disabled-on-color' && 'bg-white/10 text-white/70 opacity-70',
        tone === 'neutral' && 'border border-ssoo-content-border bg-white text-ssoo-primary hover:bg-ssoo-sitemap-bg disabled:opacity-60',
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

export interface SsooHeaderIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tone?: 'ghost-on-color' | 'disabled-on-color' | 'neutral';
}

export const SsooHeaderIconButton = forwardRef<HTMLButtonElement, SsooHeaderIconButtonProps>(function SsooHeaderIconButton({
  children,
  tone = 'ghost-on-color',
  className,
  disabled,
  type = 'button',
  ...props
}, ref) {
  return (
    <Button variant="plain" size="plain"
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(
        'relative flex h-control-h w-control-h items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed [&>svg]:h-5 [&>svg]:w-5 [&>svg]:shrink-0',
        tone === 'ghost-on-color' && 'text-white hover:bg-white/10 disabled:opacity-60',
        tone === 'disabled-on-color' && 'text-white opacity-60',
        tone === 'neutral' && 'border border-ssoo-content-border bg-white text-ssoo-primary hover:bg-ssoo-sitemap-bg disabled:opacity-60',
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
});

export interface SsooHeaderSearchBoxProps {
  placeholder?: string;
  iconSlot?: ReactNode;
  disabled?: boolean;
  readOnly?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  className?: string;
  inputClassName?: string;
}

export const SSOO_HEADER_SEARCH_PLACEHOLDER = '무엇이든 찾아드릴게요! 무엇이 필요하신가요?';

export function SsooHeaderSearchBox({
  placeholder = SSOO_HEADER_SEARCH_PLACEHOLDER,
  iconSlot,
  disabled = false,
  readOnly = false,
  value,
  onChange,
  onFocus,
  onKeyDown,
  className,
  inputClassName,
}: SsooHeaderSearchBoxProps) {
  return (
    <div className={cn('relative w-full', className)}>
      {iconSlot ? (
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50 [&>svg]:h-4 [&>svg]:w-4">
          {iconSlot}
        </div>
      ) : null}
      <Input
        type="text"
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        className={cn(
          'h-control-h w-full rounded-lg border border-white/20 bg-white/10 pl-9 pr-4 text-sm text-white placeholder-white/50',
          disabled && 'cursor-not-allowed',
          inputClassName
        )}
      />
    </div>
  );
}

export type SsooHeaderNotificationBadge = boolean | number | string | null | undefined;

export interface SsooHeaderNotificationButtonProps extends Omit<SsooHeaderIconButtonProps, 'children'> {
  iconSlot: ReactNode;
  badge?: SsooHeaderNotificationBadge;
}

export const SsooHeaderNotificationButton = forwardRef<HTMLButtonElement, SsooHeaderNotificationButtonProps>(
  function SsooHeaderNotificationButton({ iconSlot, badge, ...props }, ref) {
    return (
      <SsooHeaderIconButton ref={ref} {...props}>
        {iconSlot}
        <SsooHeaderNotificationBadgeView badge={badge} />
      </SsooHeaderIconButton>
    );
  }
);

export interface SsooHeaderLeadingDescriptor {
  title: ReactNode;
  subtitle?: ReactNode;
}

export interface SsooAppHeaderActionDescriptor
  extends Omit<SsooHeaderActionButtonProps, 'children'> {
  label: ReactNode;
  iconSlot?: ReactNode;
}

export interface SsooAppHeaderNotificationDescriptor
  extends Omit<SsooHeaderNotificationButtonProps, 'iconSlot'> {
  iconSlot: ReactNode;
}

export interface SsooAppHeaderUserMenuContext {
  actionsWidth: number;
  dropdownWidth: number;
}

export type SsooAppHeaderUserMenuSlot = ReactNode | ((context: SsooAppHeaderUserMenuContext) => ReactNode);

export const SSOO_HEADER_USER_MENU_DROPDOWN_WIDTH = 256;
export const SSOO_HEADER_PRIMARY_ACTION_MIN_WIDTH = 118;

export interface SsooHeaderUserMenuLoadingStateProps {
  label?: ReactNode;
}

export function SsooHeaderUserMenuLoadingState({
  label = '로딩 중...',
}: SsooHeaderUserMenuLoadingStateProps) {
  return (
    <span className="text-sm text-white/70">{label}</span>
  );
}

export interface SsooAppHeaderProps {
  mode?: SsooHeaderMode;
  leading?: SsooHeaderLeadingDescriptor;
  leadingSlot?: ReactNode;
  search?: SsooHeaderSearchBoxProps | null;
  searchSlot?: ReactNode;
  primaryAction?: SsooAppHeaderActionDescriptor | null;
  secondaryActions?: SsooAppHeaderActionDescriptor[];
  notification?: SsooAppHeaderNotificationDescriptor | null;
  notificationSlot?: ReactNode;
  userMenuSlot?: SsooAppHeaderUserMenuSlot;
  centerSlot?: ReactNode;
  className?: string;
}

export function SsooAppHeader({
  mode = 'primary',
  leading,
  leadingSlot,
  search,
  searchSlot,
  primaryAction,
  secondaryActions = [],
  notification,
  notificationSlot,
  userMenuSlot,
  centerSlot,
  className,
}: SsooAppHeaderProps) {
  const actionsRef = useRef<HTMLDivElement>(null);
  const [actionsWidth, setActionsWidth] = useState(0);

  useEffect(() => {
    const element = actionsRef.current;
    if (!element) return;

    const update = () => setActionsWidth(element.getBoundingClientRect().width);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const resolvedLeadingSlot = leadingSlot ?? (
    leading ? (
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-white">{leading.title}</div>
        {leading.subtitle ? <div className="truncate text-xs text-white/60">{leading.subtitle}</div> : null}
      </div>
    ) : null
  );
  const resolvedSearchSlot = searchSlot ?? (search ? <SsooHeaderSearchBox {...search} /> : null);
  const resolvedUserMenuSlot =
    typeof userMenuSlot === 'function'
      ? userMenuSlot({
        actionsWidth,
        dropdownWidth: SSOO_HEADER_USER_MENU_DROPDOWN_WIDTH,
      })
      : userMenuSlot;
  const actionNodes = [
    primaryAction ? <SsooAppHeaderAction key="primary" action={primaryAction} primary /> : null,
    ...secondaryActions.map((action, index) => (
      <SsooAppHeaderAction key={`secondary-${index}`} action={action} />
    )),
    notification ? <SsooHeaderNotificationButton key="notification" {...notification} /> : null,
    notificationSlot ? <div key="notification-slot" className="contents">{notificationSlot}</div> : null,
    resolvedUserMenuSlot ? <div key="user-menu" className="contents">{resolvedUserMenuSlot}</div> : null,
  ].filter(Boolean);

  return (
    <SsooHeader
      mode={mode}
      leadingSlot={resolvedLeadingSlot}
      searchSlot={resolvedSearchSlot}
      centerSlot={centerSlot}
      actionsSlot={actionNodes.length > 0 ? <div ref={actionsRef} className="flex items-center gap-2">{actionNodes}</div> : null}
      actionsClassName="gap-0"
      className={className}
    />
  );
}

function SsooAppHeaderAction({
  action,
  primary = false,
}: {
  action: SsooAppHeaderActionDescriptor;
  primary?: boolean;
}) {
  const { label, iconSlot, className, style, ...buttonProps } = action;
  return (
    <SsooHeaderActionButton
      {...buttonProps}
      className={cn('justify-center', className)}
      style={primary ? { ...style, minWidth: SSOO_HEADER_PRIMARY_ACTION_MIN_WIDTH } : style}
    >
      {iconSlot}
      <span>{label}</span>
    </SsooHeaderActionButton>
  );
}

function SsooHeaderNotificationBadgeView({ badge }: { badge: SsooHeaderNotificationBadge }) {
  if (!badge) return null;
  if (badge === true) {
    return <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-ls-red" />;
  }

  const label = typeof badge === 'number' && badge > 99 ? '99+' : String(badge);
  return (
    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ls-red px-1 text-[10px] font-semibold leading-none text-white">
      {label}
    </span>
  );
}
