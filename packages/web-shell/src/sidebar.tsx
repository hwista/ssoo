'use client';

import {
  createContext,
  useEffect,
  useContext,
  useMemo,
  useRef,
  useState,
  type ChangeEventHandler,
  type ComponentType,
  type CSSProperties,
  type FocusEventHandler,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type ReactNode,
} from 'react';
import { cn } from './cn';
import { SSOO_SHELL_METRICS } from './shell-metrics';
import { Button, Input } from '@ssoo/web-ui';

export type SsooSidebarMode =
  | 'collapsible'
  | 'none';

export type SsooSidebarIcon = ComponentType<{ className?: string }>;
export type SsooSidebarBadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'muted';
export type SsooSidebarStateVariant = 'empty' | 'loading' | 'error' | 'notice';

const SSOO_SIDEBAR_TREE_INDENT_STEP = 16;
export const SSOO_SIDEBAR_SEARCH_PLACEHOLDER = '목록 내 검색..';
export const SSOO_SIDEBAR_SEARCH_RAIL_LABEL = '목록 내 검색';
export const SSOO_SIDEBAR_SEARCH_CLEAR_LABEL = '목록 내 검색 초기화';

interface SsooSidebarSearchContextValue {
  query: string;
}

const SsooSidebarSearchContext = createContext<SsooSidebarSearchContextValue>({ query: '' });

export function useSsooSidebarSearchQuery(): string {
  return useContext(SsooSidebarSearchContext).query;
}

interface SsooSidebarShellProps {
  mode: SsooSidebarMode;
  expanded?: boolean;
  width?: number | string;
  collapsedWidth?: number | string;
  side?: 'left' | 'right';
  headerSlot?: ReactNode;
  railSlot?: ReactNode;
  beforeContentSlot?: ReactNode;
  contentSlot?: ReactNode;
  afterContentSlot?: ReactNode;
  footerSlot?: ReactNode;
  disabled?: boolean;
}

function toCssSize(value: number | string | undefined, fallback: number): number | string {
  return value ?? fallback;
}

function toCssLength(value: number | string | undefined, fallback: number): string {
  const size = toCssSize(value, fallback);
  return typeof size === 'number' ? `${size}px` : size;
}

function SsooSidebarShell({
  mode,
  expanded = true,
  width,
  collapsedWidth,
  side = 'left',
  headerSlot,
  railSlot,
  beforeContentSlot,
  contentSlot,
  afterContentSlot,
  footerSlot,
  disabled = false,
}: SsooSidebarShellProps) {
  const isCollapsed = !expanded;
  const previousExpandedRef = useRef(expanded);
  const [hoverRevealLocked, setHoverRevealLocked] = useState(false);
  const hoverRevealEnabled = isCollapsed && !hoverRevealLocked;

  useEffect(() => {
    const wasExpanded = previousExpandedRef.current;
    previousExpandedRef.current = expanded;

    if (wasExpanded && !expanded) {
      setHoverRevealLocked(true);
      const unlockTimer = window.setTimeout(() => {
        setHoverRevealLocked(false);
      }, 350);

      return () => {
        window.clearTimeout(unlockTimer);
      };
    }

    if (expanded) {
      setHoverRevealLocked(false);
    }

    return undefined;
  }, [expanded]);

  if (mode === 'none') {
    return null;
  }

  const expandedWidth = toCssSize(width, SSOO_SHELL_METRICS.sidebar.expandedWidth);
  const compactWidth = toCssSize(collapsedWidth, SSOO_SHELL_METRICS.sidebar.collapsedWidth);
  const inlineStyle: CSSProperties = {
    [side]: 0,
  };

  if (isCollapsed) {
    Object.assign(inlineStyle, {
      '--ssoo-sidebar-collapsed-width': toCssLength(compactWidth, SSOO_SHELL_METRICS.sidebar.collapsedWidth),
      '--ssoo-sidebar-expanded-width': toCssLength(expandedWidth, SSOO_SHELL_METRICS.sidebar.expandedWidth),
    } as CSSProperties);
  } else {
    inlineStyle.width = expandedWidth;
  }

  return (
    <aside
      data-sidebar-mode={mode}
      data-sidebar-expanded={expanded ? 'true' : 'false'}
      aria-disabled={disabled || undefined}
      className={cn(
        hoverRevealEnabled && 'group/sidebar',
        'fixed top-0 z-40 flex h-full flex-col overflow-hidden border-r border-ssoo-content-border bg-ssoo-content-bg transition-[width,box-shadow,transform] duration-300',
        side === 'right' && 'border-l border-r-0',
        disabled && 'pointer-events-none opacity-60',
        isCollapsed && 'w-[var(--ssoo-sidebar-collapsed-width)]',
        hoverRevealEnabled && 'hover:w-[var(--ssoo-sidebar-expanded-width)] hover:shadow-xl'
      )}
      style={inlineStyle}
    >
      {headerSlot}
      <div className="min-h-0 flex flex-1 flex-col overflow-hidden">
        {isCollapsed && railSlot ? (
          <div className={cn('flex min-h-0 flex-1 flex-col', hoverRevealEnabled && 'group-hover/sidebar:hidden')}>
            {railSlot}
          </div>
        ) : null}
        <div
          className={cn(
            'min-h-0 flex flex-1 flex-col',
            isCollapsed && railSlot && 'hidden',
            isCollapsed && railSlot && hoverRevealEnabled && 'group-hover/sidebar:flex'
          )}
        >
          {beforeContentSlot}
          {contentSlot}
          {afterContentSlot}
        </div>
      </div>
      {footerSlot}
    </aside>
  );
}

interface SsooSidebarBrandHeaderProps {
  mark?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  actionsSlot?: ReactNode;
  collapsed?: boolean;
  revealOnHover?: boolean;
}

function SsooSidebarBrandHeader({
  mark,
  title = 'SSOT',
  subtitle,
  actionsSlot,
  collapsed = false,
  revealOnHover = false,
}: SsooSidebarBrandHeaderProps) {
  const shouldHideBrandUntilHover = collapsed && revealOnHover;

  return (
    <div className="flex h-header-h items-center justify-between bg-ssoo-primary px-3">
      {(!collapsed || revealOnHover) && (
        <div className={cn('min-w-0 items-center gap-2', shouldHideBrandUntilHover ? 'hidden group-hover/sidebar:flex' : 'flex')}>
          {mark ?? (
            <div className={cn('flex shrink-0 items-center justify-center rounded bg-white', revealOnHover ? 'h-8 w-8' : 'h-9 w-9')}>
              <span className={cn('font-bold text-ssoo-primary', revealOnHover ? 'text-sm' : 'text-base')}>S</span>
            </div>
          )}
          <div className={cn('min-w-0 leading-5 transition-opacity duration-200', revealOnHover && 'opacity-0 group-hover/sidebar:opacity-100')}>
            <div className="truncate text-lg font-semibold text-white">{title}</div>
            {subtitle ? <div className="truncate text-xs text-white/60">{subtitle}</div> : null}
          </div>
        </div>
      )}
      {actionsSlot}
    </div>
  );
}

export interface SsooSidebarSearchBoxProps {
  id?: string;
  ariaLabel?: string;
  placeholder?: string;
  icon?: SsooSidebarIcon;
  iconSlot?: ReactNode;
  value?: string;
  disabled?: boolean;
  autoComplete?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  clearable?: boolean;
  clearIcon?: SsooSidebarIcon;
  clearLabel?: string;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  trailingSlot?: ReactNode;
  className?: string;
  inputClassName?: string;
}

export function SsooSidebarSearchBox({
  id,
  ariaLabel,
  placeholder = SSOO_SIDEBAR_SEARCH_PLACEHOLDER,
  icon: Icon,
  iconSlot,
  value,
  disabled = false,
  autoComplete = 'off',
  onChange,
  onClear,
  clearable = true,
  clearIcon: ClearIcon,
  clearLabel = SSOO_SIDEBAR_SEARCH_CLEAR_LABEL,
  onFocus,
  onBlur,
  onKeyDown,
  trailingSlot,
  className,
  inputClassName,
}: SsooSidebarSearchBoxProps) {
  const hasIcon = Boolean(iconSlot || Icon);
  const showClearButton = clearable && Boolean(value) && Boolean(onClear) && !disabled;
  const hasTrailingControl = Boolean(showClearButton || trailingSlot);
  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    onChange?.(event.target.value);
  };

  return (
    <div className={cn('relative flex-1', className)}>
      {hasIcon ? (
        <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
          {iconSlot ?? (Icon ? <Icon className="h-4 w-4 text-gray-400" /> : null)}
        </div>
      ) : null}
      <Input
        id={id}
        type="text"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        autoComplete={autoComplete}
        onChange={handleChange}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className={cn(
          'h-control-h w-full rounded-lg border border-ssoo-content-border bg-white text-sm text-gray-700 outline-none transition focus:border-transparent focus:ring-2 focus:ring-ssoo-primary disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
          hasIcon ? 'pl-8' : 'pl-3',
          hasTrailingControl ? 'pr-8' : 'pr-3',
          inputClassName
        )}
      />
      {showClearButton ? (
        <Button variant="plain" size="plain"
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClear}
          className="absolute right-2 top-1/2 flex h-control-h-sm w-control-h-sm -translate-y-1/2 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label={clearLabel}
        >
          {ClearIcon ? <ClearIcon className="h-3.5 w-3.5" /> : <span aria-hidden className="text-sm leading-none">×</span>}
        </Button>
      ) : trailingSlot}
    </div>
  );
}

interface SsooSidebarToolbarProps {
  children: ReactNode;
}

function SsooSidebarToolbar({ children }: SsooSidebarToolbarProps) {
  return <div className="shrink-0 border-b border-gray-200 p-2">{children}</div>;
}

interface SsooSidebarToolbarActionProps {
  label: string;
  icon: SsooSidebarIcon;
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

function SsooSidebarToolbarAction({
  label,
  icon: Icon,
  active = false,
  disabled = false,
  loading = false,
  onClick,
}: SsooSidebarToolbarActionProps) {
  return (
    <Button variant="plain" size="plain"
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-control-h w-control-h shrink-0 items-center justify-center rounded-lg transition-colors',
        active ? 'bg-ssoo-sitemap-bg text-ssoo-primary' : 'text-ssoo-primary hover:bg-ssoo-sitemap-bg',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <Icon className={cn('h-4 w-4', loading && 'animate-spin')} />
    </Button>
  );
}

interface SsooSidebarFooterProps extends SsooSidebarSurfaceFooterConfig {
  collapsed?: boolean;
  revealOnHover?: boolean;
}

export interface SsooSidebarSurfaceFooterConfig {
  title?: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  collapsedLabel?: ReactNode;
}

function SsooSidebarFooter({
  title = 'SSOT v1.0.0',
  description = '© 2026 LS ITC Co., Ltd.',
  meta = 'All rights reserved.',
  collapsed = false,
  collapsedLabel = '© LS',
  revealOnHover = false,
}: SsooSidebarFooterProps) {
  const fullContent = (
    <div className="space-y-0.5 text-xs text-gray-500">
      {title ? <div className="font-medium text-gray-600">{title}</div> : null}
      {description ? <div>{description}</div> : null}
      {meta ? <div className="text-[10px] text-gray-400">{meta}</div> : null}
    </div>
  );

  return (
    <div className="shrink-0 border-t border-ssoo-content-border bg-ssoo-content-bg px-3 py-2">
      {revealOnHover ? (
        <>
          <div className="text-center text-[10px] text-gray-400 group-hover/sidebar:hidden">{collapsedLabel}</div>
          <div className="hidden group-hover/sidebar:block">{fullContent}</div>
        </>
      ) : collapsed ? (
        <div className="text-center text-[10px] text-gray-400">{collapsedLabel}</div>
      ) : (
        fullContent
      )}
    </div>
  );
}

export interface SsooSidebarSurfaceSearchConfig {
  placeholder?: string;
  value?: string;
  disabled?: boolean;
  ariaLabel?: string;
  icon?: SsooSidebarIcon;
  iconSlot?: ReactNode;
  clearable?: boolean;
  clearIcon?: SsooSidebarIcon;
  clearLabel?: string;
  onClear?: () => void;
  trailingSlot?: ReactNode;
  railIcon?: SsooSidebarIcon;
  railLabel?: string;
  railActive?: boolean;
  railDisabled?: boolean;
  onChange?: (value: string) => void;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  onRailSelect?: MouseEventHandler<HTMLButtonElement>;
}

export interface SsooSidebarSurfaceActionConfig {
  label: string;
  icon: SsooSidebarIcon;
  disabled?: boolean;
  loading?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

export interface SsooSidebarSurfaceBrandActionConfig {
  label: string;
  icon: SsooSidebarIcon;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

export interface SsooSidebarSurfaceSection {
  id: string;
  title: string;
  icon: SsooSidebarIcon;
  children?: ReactNode;
  expanded?: boolean;
  collapsible?: boolean;
  hidden?: boolean;
  railLabel?: string;
  railIcon?: SsooSidebarIcon;
  railActive?: boolean;
  railDisabled?: boolean;
  onToggle?: () => void;
  onRailSelect?: MouseEventHandler<HTMLButtonElement>;
}

export interface SsooSidebarSurfaceProps {
  expanded: boolean;
  onToggleCollapse: () => void;
  toggleIcon: SsooSidebarIcon;
  width?: number | string;
  collapsedWidth?: number | string;
  brandTitle?: ReactNode;
  brandSubtitle?: ReactNode;
  brandAction?: SsooSidebarSurfaceBrandActionConfig;
  search?: SsooSidebarSurfaceSearchConfig;
  refreshAction?: SsooSidebarSurfaceActionConfig;
  sections: readonly SsooSidebarSurfaceSection[];
  expandedIcon: SsooSidebarIcon;
  collapsedIcon: SsooSidebarIcon;
  footerProps?: SsooSidebarSurfaceFooterConfig;
}

export function SsooSidebarSurface({
  expanded,
  onToggleCollapse,
  toggleIcon: ToggleIcon,
  width,
  collapsedWidth,
  brandTitle = 'SSOT',
  brandSubtitle,
  brandAction,
  search,
  refreshAction,
  sections,
  expandedIcon,
  collapsedIcon,
  footerProps,
}: SsooSidebarSurfaceProps) {
  const isCollapsed = !expanded;
  const visibleSections = sections.filter((section) => !section.hidden);
  const BrandActionIcon = brandAction?.icon;
  const brandActionMark = brandAction && BrandActionIcon ? (
    <Button variant="plain" size="plain"
      type="button"
      onClick={brandAction.onClick}
      disabled={brandAction.disabled}
      aria-label={brandAction.label}
      title={brandAction.label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-white text-ssoo-primary transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <BrandActionIcon className="h-4 w-4" />
    </Button>
  ) : null;

  const railSlot = (
    <nav className="flex flex-col items-center gap-1 py-2">
      {search?.railIcon ? (
        <SsooCollapsedRailButton
          label={search.railLabel ?? SSOO_SIDEBAR_SEARCH_RAIL_LABEL}
          icon={search.railIcon}
          active={search.railActive}
          disabled={search.railDisabled ?? search.disabled}
          onClick={search.onRailSelect}
        />
      ) : null}
      {visibleSections.map((section) => (
        <SsooCollapsedRailButton
          key={section.id}
          label={section.railLabel ?? section.title}
          icon={section.railIcon ?? section.icon}
          active={section.railActive ?? Boolean(section.expanded)}
          disabled={section.railDisabled}
          onClick={section.onRailSelect ?? (() => section.onToggle?.())}
        />
      ))}
    </nav>
  );

  const beforeContentSlot = search || refreshAction ? (
    <SsooSidebarToolbar>
      <div className="flex items-center gap-1">
        {search ? (() => {
          const handleClear = search.onClear ?? (search.onChange ? () => search.onChange?.('') : undefined);
          return (
          <SsooSidebarSearchBox
            placeholder={search.placeholder ?? SSOO_SIDEBAR_SEARCH_PLACEHOLDER}
            value={search.value}
            disabled={search.disabled}
            ariaLabel={search.ariaLabel}
            icon={search.icon ?? search.railIcon}
            iconSlot={search.iconSlot}
            clearable={search.clearable}
            clearIcon={search.clearIcon}
            clearLabel={search.clearLabel ?? SSOO_SIDEBAR_SEARCH_CLEAR_LABEL}
            onClear={handleClear}
            trailingSlot={search.trailingSlot}
            onChange={search.onChange}
            onFocus={search.onFocus}
            onBlur={search.onBlur}
            onKeyDown={search.onKeyDown}
          />
          );
        })() : null}
        {refreshAction ? (
          <SsooSidebarToolbarAction
            label={refreshAction.label}
            icon={refreshAction.icon}
            disabled={refreshAction.disabled}
            loading={refreshAction.loading}
            onClick={refreshAction.onClick}
          />
        ) : null}
      </div>
    </SsooSidebarToolbar>
  ) : null;

  const contentSlot = (
    <SsooSidebarSearchContext.Provider value={{ query: search?.value ?? '' }}>
      <nav className="min-h-0 flex-1 overflow-auto">
        {visibleSections.map((section) => {
          const isSectionCollapsible = section.collapsible ?? true;
          const sectionExpanded = section.expanded ?? true;
          return (
            <SsooSidebarSection
              key={section.id}
              title={section.title}
              icon={section.icon}
              collapsible={isSectionCollapsible}
              expanded={sectionExpanded}
              onToggle={section.onToggle}
              actionSlot={
                isSectionCollapsible ? (
                  <SsooSidebarSectionChevron
                    expanded={sectionExpanded}
                    expandedIcon={expandedIcon}
                    collapsedIcon={collapsedIcon}
                  />
                ) : null
              }
            >
              {section.children}
            </SsooSidebarSection>
          );
        })}
      </nav>
    </SsooSidebarSearchContext.Provider>
  );

  return (
    <SsooSidebarShell
      mode="collapsible"
      expanded={expanded}
      width={width}
      collapsedWidth={collapsedWidth}
      headerSlot={
        <SsooSidebarBrandHeader
          mark={brandActionMark}
          title={brandTitle}
          subtitle={brandSubtitle}
          collapsed={isCollapsed}
          revealOnHover={isCollapsed}
          actionsSlot={
            <Button variant="plain" size="plain"
              type="button"
              onClick={onToggleCollapse}
              className="rounded-lg p-2 transition-colors hover:bg-white/10"
              title={isCollapsed ? '펼치기' : '접기'}
            >
              <ToggleIcon className="h-5 w-5 text-white" />
            </Button>
          }
        />
      }
      railSlot={railSlot}
      beforeContentSlot={beforeContentSlot}
      contentSlot={contentSlot}
      footerSlot={<SsooSidebarFooter collapsed={isCollapsed} revealOnHover={isCollapsed} {...footerProps} />}
    />
  );
}

export interface SsooSidebarDividerProps {
  className?: string;
}

export function SsooSidebarDivider({ className }: SsooSidebarDividerProps) {
  return <div role="separator" className={cn('h-px bg-gray-200', className)} />;
}

export interface SsooSidebarEmptyStateProps {
  children?: ReactNode;
  className?: string;
}

export function SsooSidebarEmptyState({ children = '표시할 항목이 없습니다.', className }: SsooSidebarEmptyStateProps) {
  return (
    <SsooSidebarState variant="empty" className={className}>
      {children}
    </SsooSidebarState>
  );
}

export interface SsooSidebarBadgeProps {
  children: ReactNode;
  tone?: SsooSidebarBadgeTone;
  className?: string;
}

export function SsooSidebarBadge({ children, tone = 'neutral', className }: SsooSidebarBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none',
        tone === 'neutral' && 'bg-gray-100 text-gray-600',
        tone === 'primary' && 'bg-ssoo-primary/10 text-ssoo-primary',
        tone === 'success' && 'bg-green-100 text-green-700',
        tone === 'warning' && 'bg-amber-100 text-amber-700',
        tone === 'danger' && 'bg-ls-red/10 text-ls-red',
        tone === 'muted' && 'bg-transparent text-gray-400',
        className
      )}
    >
      {children}
    </span>
  );
}

export interface SsooSidebarStateProps {
  variant?: SsooSidebarStateVariant;
  children?: ReactNode;
  className?: string;
}

export function SsooSidebarState({
  variant = 'empty',
  children,
  className,
}: SsooSidebarStateProps) {
  const content = children ?? (
    variant === 'loading'
      ? '불러오는 중...'
      : variant === 'error'
        ? '불러오지 못했습니다.'
        : '표시할 항목이 없습니다.'
  );

  return (
    <div
      className={cn(
        'px-3 py-4 text-center text-sm',
        variant === 'error' ? 'text-red-500' : 'text-gray-400',
        className
      )}
    >
      {variant === 'loading' ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span
            aria-hidden
            className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-ssoo-primary"
          />
          <span>{content}</span>
        </span>
      ) : (
        content
      )}
    </div>
  );
}

export interface SsooSidebarSectionNoteProps {
  children: ReactNode;
  tone?: SsooSidebarBadgeTone;
  className?: string;
}

export function SsooSidebarSectionNote({
  children,
  tone = 'muted',
  className,
}: SsooSidebarSectionNoteProps) {
  return (
    <div
      className={cn(
        'px-3 pb-1 text-caption',
        tone === 'danger' && 'text-red-600',
        tone === 'warning' && 'text-amber-600',
        tone === 'primary' && 'text-ssoo-primary',
        tone === 'success' && 'text-green-700',
        (tone === 'neutral' || tone === 'muted') && 'text-gray-500',
        className
      )}
    >
      {children}
    </div>
  );
}

export interface SsooSidebarSectionProps {
  title: string;
  icon?: SsooSidebarIcon;
  children?: ReactNode;
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  actionSlot?: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SsooSidebarSection({
  title,
  icon: Icon,
  children,
  collapsible = false,
  expanded = true,
  onToggle,
  actionSlot,
  className,
  contentClassName,
}: SsooSidebarSectionProps) {
  const isOpen = !collapsible || expanded;
  const headerClassName = 'flex h-control-h w-full items-center px-3 text-left transition-colors hover:bg-ssoo-sitemap-bg';
  const headerContent = (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-ssoo-primary" />}
        <span className="truncate text-sm font-medium text-ssoo-primary">{title}</span>
      </div>
      {actionSlot}
    </>
  );

  return (
    <section className={cn('border-b border-gray-200', className)}>
      {collapsible ? (
        <Button
          variant="plain"
          size="plain"
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className={cn(headerClassName, 'justify-between gap-0 whitespace-normal rounded-none')}
        >
          {headerContent}
        </Button>
      ) : (
        <div className={headerClassName}>{headerContent}</div>
      )}
      {isOpen && <div className={cn('pb-2', contentClassName)}>{children}</div>}
    </section>
  );
}

interface SsooSidebarSectionChevronProps {
  expanded: boolean;
  expandedIcon: SsooSidebarIcon;
  collapsedIcon: SsooSidebarIcon;
}

function SsooSidebarSectionChevron({
  expanded,
  expandedIcon: ExpandedIcon,
  collapsedIcon: CollapsedIcon,
}: SsooSidebarSectionChevronProps) {
  const Icon = expanded ? ExpandedIcon : CollapsedIcon;
  return <Icon className="h-4 w-4 text-ssoo-primary" />;
}

export interface SsooSidebarTreeNodeState {
  level: number;
  expanded: boolean;
  active: boolean;
  disabled: boolean;
  folder: boolean;
  hasChildren: boolean;
}

export interface SsooSidebarTreeNodeIconProps {
  icon: SsooSidebarIcon;
  active?: boolean;
  tone?: SsooSidebarBadgeTone;
  filled?: boolean;
  loading?: boolean;
  className?: string;
}

function getSidebarIconToneClass(tone: SsooSidebarBadgeTone, active: boolean, filled: boolean): string {
  if (tone === 'primary') return cn('text-ssoo-primary', filled && 'fill-ssoo-primary');
  if (tone === 'success') return cn('text-green-700', filled && 'fill-green-600');
  if (tone === 'warning') return cn('text-yellow-400', filled && 'fill-yellow-400');
  if (tone === 'danger') return cn('text-red-500', filled && 'fill-red-500');
  if (tone === 'muted') return cn('text-gray-400', filled && 'fill-gray-400');
  return cn(active ? 'text-ssoo-primary' : 'text-gray-500', filled && 'fill-current');
}

export function SsooSidebarTreeNodeIcon({
  icon: Icon,
  active = false,
  tone = 'neutral',
  filled = false,
  loading = false,
  className,
}: SsooSidebarTreeNodeIconProps) {
  return (
    <Icon
      className={cn(
        'h-4 w-4 shrink-0',
        getSidebarIconToneClass(tone, active, filled),
        loading && 'animate-spin',
        className
      )}
    />
  );
}

export interface SsooSidebarTreeActionButtonProps {
  label: string;
  icon: SsooSidebarIcon;
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  tone?: SsooSidebarBadgeTone;
  title?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
}

export function SsooSidebarTreeActionButton({
  label,
  icon: Icon,
  active = false,
  disabled = false,
  loading = false,
  tone = 'neutral',
  title,
  onClick,
  className,
}: SsooSidebarTreeActionButtonProps) {
  return (
    <Button variant="plain" size="plain"
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title ?? label}
      className={cn(
        'flex h-control-h-sm w-control-h-sm items-center justify-center rounded opacity-0 transition-opacity hover:bg-gray-200 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-60',
        active && 'opacity-100',
        className
      )}
    >
      <Icon
        className={cn(
          'h-3.5 w-3.5',
          getSidebarIconToneClass(active ? tone : 'neutral', active, active),
          loading && 'animate-spin'
        )}
      />
    </Button>
  );
}

export interface SsooSidebarTreeStatusBadgeProps {
  children: ReactNode;
  tone?: SsooSidebarBadgeTone;
  className?: string;
}

export function SsooSidebarTreeStatusBadge({
  children,
  tone = 'muted',
  className,
}: SsooSidebarTreeStatusBadgeProps) {
  return (
    <span
      className={cn(
        'max-w-16 truncate text-[10px] font-medium',
        tone === 'danger' && 'text-red-600',
        tone === 'warning' && 'text-amber-600',
        tone === 'primary' && 'text-ssoo-primary',
        tone === 'success' && 'text-green-700',
        tone === 'neutral' && 'text-gray-600',
        tone === 'muted' && 'text-gray-400',
        className
      )}
    >
      {children}
    </span>
  );
}

export interface SsooSidebarTreeProps<TNode> {
  nodes: readonly TNode[];
  getNodeId: (node: TNode) => string;
  getNodeLabel: (node: TNode) => ReactNode;
  getNodeTitle?: (node: TNode) => string | undefined;
  getNodeChildren?: (node: TNode) => readonly TNode[] | undefined;
  isNodeFolder?: (node: TNode) => boolean;
  isNodeExpanded?: (node: TNode) => boolean;
  isNodeActive?: (node: TNode) => boolean;
  isNodeDisabled?: (node: TNode) => boolean;
  getNodeIcon?: (node: TNode, state: SsooSidebarTreeNodeState) => SsooSidebarIcon | undefined;
  renderNodeIcon?: (node: TNode, state: SsooSidebarTreeNodeState) => ReactNode;
  renderNodeTrailingAction?: (node: TNode, state: SsooSidebarTreeNodeState) => ReactNode;
  onNodeSelect?: (node: TNode, state: SsooSidebarTreeNodeState) => void | Promise<void>;
  sortChildren?: (children: readonly TNode[]) => readonly TNode[];
  disclosureIcon?: SsooSidebarIcon;
  className?: string;
}

export interface SsooSidebarSearchableTreeProps<TNode> extends SsooSidebarTreeProps<TNode> {
  searchQuery?: string;
  getNodeSearchText: (node: TNode) => string | readonly string[];
  cloneNodeWithChildren?: (node: TNode, children: TNode[]) => TNode;
  emptyState?: ReactNode;
  searchEmptyState?: ReactNode;
}

interface SsooSidebarTreeNodeProps<TNode> extends Omit<SsooSidebarTreeProps<TNode>, 'nodes' | 'className'> {
  node: TNode;
  level: number;
}

function getTreeChildren<TNode>(
  node: TNode,
  getNodeChildren: SsooSidebarTreeProps<TNode>['getNodeChildren'],
  sortChildren: SsooSidebarTreeProps<TNode>['sortChildren']
): readonly TNode[] {
  const children = getNodeChildren?.(node) ?? [];
  return sortChildren ? sortChildren(children) : children;
}

function SsooSidebarTreeNode<TNode>({
  node,
  level,
  getNodeId,
  getNodeLabel,
  getNodeTitle,
  getNodeChildren,
  isNodeFolder,
  isNodeExpanded,
  isNodeActive,
  isNodeDisabled,
  getNodeIcon,
  renderNodeIcon,
  renderNodeTrailingAction,
  onNodeSelect,
  sortChildren,
  disclosureIcon: DisclosureIcon,
}: SsooSidebarTreeNodeProps<TNode>) {
  const children = getTreeChildren(node, getNodeChildren, sortChildren);
  const folder = isNodeFolder?.(node) ?? children.length > 0;
  const hasChildren = children.length > 0;
  const expanded = Boolean(folder && hasChildren && isNodeExpanded?.(node));
  const active = Boolean(isNodeActive?.(node));
  const disabled = Boolean(isNodeDisabled?.(node));
  const state: SsooSidebarTreeNodeState = {
    level,
    expanded,
    active,
    disabled,
    folder,
    hasChildren,
  };
  const Icon = getNodeIcon?.(node, state);
  const nodeIcon = renderNodeIcon?.(node, state)
    ?? (Icon ? <SsooSidebarTreeNodeIcon icon={Icon} active={active} /> : null);
  const trailingAction = renderNodeTrailingAction?.(node, state);

  const handleSelect: MouseEventHandler<HTMLButtonElement> = () => {
    if (!disabled) {
      void onNodeSelect?.(node, state);
    }
  };

  return (
    <div>
      <div
        className={cn(
          'group flex h-control-h w-full min-w-0 items-center gap-1 rounded-md pr-2 text-sm transition-colors',
          active ? 'bg-ssoo-content-border font-medium text-ssoo-primary' : 'text-gray-700 hover:bg-ssoo-sitemap-bg',
          disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent'
        )}
        style={{ paddingLeft: `${8 + level * SSOO_SIDEBAR_TREE_INDENT_STEP}px` }}
      >
        <Button variant="plain" size="plain"
          type="button"
          disabled={disabled}
          onClick={handleSelect}
          aria-current={active ? 'page' : undefined}
          aria-expanded={folder && hasChildren ? expanded : undefined}
          className={cn(
            'flex h-full min-w-0 flex-1 items-center gap-1 text-left',
            disabled && 'cursor-not-allowed'
          )}
        >
          {folder && hasChildren && DisclosureIcon ? (
            <DisclosureIcon
              className={cn(
                'h-4 w-4 shrink-0 text-gray-400 transition-transform',
                expanded && 'rotate-90'
              )}
            />
          ) : (
            <span className="h-4 w-4 shrink-0" />
          )}
          {nodeIcon}
          <span
            title={getNodeTitle?.(node)}
            className={cn('min-w-0 flex-1 truncate', active ? 'text-ssoo-primary' : 'text-gray-700')}
          >
            {getNodeLabel(node)}
          </span>
        </Button>
        {trailingAction ? <span className="flex shrink-0 items-center gap-1">{trailingAction}</span> : null}
      </div>
      {expanded ? (
        <div>
          {children.map((child) => (
            <SsooSidebarTreeNode
              key={getNodeId(child)}
              node={child}
              level={level + 1}
              getNodeId={getNodeId}
              getNodeLabel={getNodeLabel}
              getNodeTitle={getNodeTitle}
              getNodeChildren={getNodeChildren}
              isNodeFolder={isNodeFolder}
              isNodeExpanded={isNodeExpanded}
              isNodeActive={isNodeActive}
              isNodeDisabled={isNodeDisabled}
              getNodeIcon={getNodeIcon}
              renderNodeIcon={renderNodeIcon}
              renderNodeTrailingAction={renderNodeTrailingAction}
              onNodeSelect={onNodeSelect}
              sortChildren={sortChildren}
              disclosureIcon={DisclosureIcon}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SsooSidebarTree<TNode,>({
  nodes,
  className,
  ...props
}: SsooSidebarTreeProps<TNode>) {
  return (
    <div className={cn('py-1', className)}>
      {nodes.map((node) => (
        <SsooSidebarTreeNode
          key={props.getNodeId(node)}
          node={node}
          level={0}
          {...props}
        />
      ))}
    </div>
  );
}

export function SsooSidebarSearchableTree<TNode,>({
  nodes,
  searchQuery,
  getNodeSearchText,
  getNodeChildren,
  cloneNodeWithChildren,
  emptyState,
  searchEmptyState,
  isNodeExpanded,
  ...props
}: SsooSidebarSearchableTreeProps<TNode>) {
  const contextQuery = useSsooSidebarSearchQuery();
  const activeQuery = searchQuery ?? contextQuery;
  const hasSearchQuery = activeQuery.trim().length > 0;
  const displayNodes = useMemo(() => (
    hasSearchQuery
      ? filterSsooSidebarTree(nodes, activeQuery, {
          getNodeSearchText,
          getNodeChildren,
          cloneNodeWithChildren,
        })
      : [...nodes]
  ), [activeQuery, cloneNodeWithChildren, getNodeChildren, getNodeSearchText, hasSearchQuery, nodes]);

  if (displayNodes.length === 0) {
    return (
      <>
        {hasSearchQuery
          ? searchEmptyState ?? <SsooSidebarEmptyState>검색 결과가 없습니다.</SsooSidebarEmptyState>
          : emptyState ?? <SsooSidebarEmptyState />}
      </>
    );
  }

  return (
    <SsooSidebarTree<TNode>
      nodes={displayNodes}
      getNodeChildren={getNodeChildren}
      isNodeExpanded={(node) => {
        if (hasSearchQuery) {
          return (getNodeChildren?.(node) ?? []).length > 0;
        }
        return Boolean(isNodeExpanded?.(node));
      }}
      {...props}
    />
  );
}

export interface SsooSidebarTreeFilterOptions<TNode> {
  getNodeSearchText: (node: TNode) => string | readonly string[];
  getNodeChildren?: (node: TNode) => readonly TNode[] | undefined;
  cloneNodeWithChildren?: (node: TNode, children: TNode[]) => TNode;
}

export function filterSsooSidebarTree<TNode>(
  nodes: readonly TNode[],
  query: string,
  options: SsooSidebarTreeFilterOptions<TNode>
): TNode[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [...nodes];
  }

  return nodes.reduce<TNode[]>((acc, node) => {
    const searchText = options.getNodeSearchText(node);
    const searchableValues = Array.isArray(searchText) ? searchText : [searchText];
    const matchesNode = searchableValues.some((value) => value.toLowerCase().includes(normalizedQuery));
    const children = options.getNodeChildren?.(node) ?? [];
    const filteredChildren = filterSsooSidebarTree(children, query, options);

    if (matchesNode || filteredChildren.length > 0) {
      if (filteredChildren.length > 0 && options.cloneNodeWithChildren) {
        acc.push(options.cloneNodeWithChildren(node, filteredChildren));
      } else {
        acc.push(node);
      }
    }

    return acc;
  }, []);
}

interface SsooCollapsedRailButtonProps {
  label: string;
  icon: SsooSidebarIcon;
  active?: boolean;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

function SsooCollapsedRailButton({
  label,
  icon: Icon,
  active = false,
  disabled = false,
  onClick,
}: SsooCollapsedRailButtonProps) {
  return (
    <Button variant="plain" size="plain"
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-11 w-11 items-center justify-center rounded-lg transition-colors',
        active ? 'bg-ssoo-sitemap-bg text-ssoo-primary' : 'text-ssoo-primary hover:bg-ssoo-sitemap-bg',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <Icon className="h-5 w-5" />
    </Button>
  );
}
