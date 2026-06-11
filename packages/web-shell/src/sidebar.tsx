'use client';

import {
  useEffect,
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

export type SsooSidebarMode =
  | 'collapsible'
  | 'none';

export type SsooSidebarIcon = ComponentType<{ className?: string }>;
export type SsooSidebarBadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'muted';

export interface SsooSidebarShellProps {
  mode: SsooSidebarMode;
  expanded?: boolean;
  width?: number | string;
  collapsedWidth?: number | string;
  side?: 'left' | 'right';
  className?: string;
  contentClassName?: string;
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

export function SsooSidebarShell({
  mode,
  expanded = true,
  width,
  collapsedWidth,
  side = 'left',
  className,
  contentClassName,
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

  const expandedWidth = toCssSize(width, 340);
  const compactWidth = toCssSize(collapsedWidth, 56);
  const inlineStyle: CSSProperties = {
    [side]: 0,
  };

  if (isCollapsed) {
    Object.assign(inlineStyle, {
      '--ssoo-sidebar-collapsed-width': toCssLength(compactWidth, 56),
      '--ssoo-sidebar-expanded-width': toCssLength(expandedWidth, 340),
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
        hoverRevealEnabled && 'hover:w-[var(--ssoo-sidebar-expanded-width)] hover:shadow-xl',
        className
      )}
      style={inlineStyle}
    >
      {headerSlot}
      <div className={cn('min-h-0 flex flex-1 flex-col overflow-hidden', contentClassName)}>
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

export interface SsooSidebarBrandHeaderProps {
  mark?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  actionsSlot?: ReactNode;
  collapsed?: boolean;
  revealOnHover?: boolean;
  className?: string;
}

export function SsooSidebarBrandHeader({
  mark,
  title = 'SSOT',
  subtitle,
  actionsSlot,
  collapsed = false,
  revealOnHover = false,
  className,
}: SsooSidebarBrandHeaderProps) {
  const shouldHideBrandUntilHover = collapsed && revealOnHover;

  return (
    <div className={cn('flex h-header-h items-center justify-between bg-ssoo-primary px-3', className)}>
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
  iconSlot?: ReactNode;
  value?: string;
  disabled?: boolean;
  autoComplete?: string;
  onChange?: (value: string) => void;
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
  placeholder = '메뉴 검색...',
  iconSlot,
  value,
  disabled = false,
  autoComplete = 'off',
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  trailingSlot,
  className,
  inputClassName,
}: SsooSidebarSearchBoxProps) {
  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    onChange?.(event.target.value);
  };

  return (
    <div className={cn('relative flex-1', className)}>
      {iconSlot && <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">{iconSlot}</div>}
      <input
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
          'h-control-h w-full rounded-lg border border-ssoo-content-border bg-white pl-8 pr-3 text-sm text-gray-700 outline-none transition focus:border-transparent focus:ring-2 focus:ring-ssoo-primary disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
          inputClassName
        )}
      />
      {trailingSlot}
    </div>
  );
}

export interface SsooSidebarToolbarProps {
  children: ReactNode;
  className?: string;
}

export function SsooSidebarToolbar({ children, className }: SsooSidebarToolbarProps) {
  return <div className={cn('shrink-0 border-b border-gray-200 p-2', className)}>{children}</div>;
}

export interface SsooSidebarToolbarActionProps {
  label: string;
  icon: SsooSidebarIcon;
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  iconClassName?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

export function SsooSidebarToolbarAction({
  label,
  icon: Icon,
  active = false,
  disabled = false,
  loading = false,
  className,
  iconClassName,
  onClick,
}: SsooSidebarToolbarActionProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-control-h w-control-h shrink-0 items-center justify-center rounded-lg transition-colors',
        active ? 'bg-ssoo-sitemap-bg text-ssoo-primary' : 'text-ssoo-primary hover:bg-ssoo-sitemap-bg',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <Icon className={cn('h-4 w-4', loading && 'animate-spin', iconClassName)} />
    </button>
  );
}

export interface SsooSidebarFooterProps {
  title?: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  collapsed?: boolean;
  collapsedLabel?: ReactNode;
  revealOnHover?: boolean;
  className?: string;
}

export function SsooSidebarFooter({
  title = 'SSOT v1.0.0',
  description = '© 2026 LS ITC Co., Ltd.',
  meta = 'All rights reserved.',
  collapsed = false,
  collapsedLabel = '© LS',
  revealOnHover = false,
  className,
}: SsooSidebarFooterProps) {
  const fullContent = (
    <div className="space-y-0.5 text-xs text-gray-500">
      {title ? <div className="font-medium text-gray-600">{title}</div> : null}
      {description ? <div>{description}</div> : null}
      {meta ? <div className="text-[10px] text-gray-400">{meta}</div> : null}
    </div>
  );

  return (
    <div className={cn('shrink-0 border-t border-ssoo-content-border bg-ssoo-content-bg px-3 py-2', className)}>
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
  return <div className={cn('px-3 py-2 text-xs text-gray-400', className)}>{children}</div>;
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
  const HeaderTag = collapsible ? 'button' : 'div';

  return (
    <section className={cn('border-b border-gray-200', className)}>
      <HeaderTag
        type={collapsible ? 'button' : undefined}
        onClick={collapsible ? onToggle : undefined}
        aria-expanded={collapsible ? expanded : undefined}
        className="flex h-control-h w-full items-center px-3 text-left transition-colors hover:bg-ssoo-sitemap-bg"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-ssoo-primary" />}
          <span className="truncate text-sm font-medium text-ssoo-primary">{title}</span>
        </div>
        {actionSlot}
      </HeaderTag>
      {isOpen && <div className={cn('pb-2', contentClassName)}>{children}</div>}
    </section>
  );
}

export interface SsooSidebarSectionChevronProps {
  expanded: boolean;
  expandedIcon: SsooSidebarIcon;
  collapsedIcon: SsooSidebarIcon;
  className?: string;
}

export function SsooSidebarSectionChevron({
  expanded,
  expandedIcon: ExpandedIcon,
  collapsedIcon: CollapsedIcon,
  className,
}: SsooSidebarSectionChevronProps) {
  const Icon = expanded ? ExpandedIcon : CollapsedIcon;
  return <Icon className={cn('h-4 w-4 text-ssoo-primary', className)} />;
}

export interface SsooSidebarListProps {
  as?: 'div' | 'nav';
  ariaLabel?: string;
  className?: string;
  padded?: boolean;
  children: ReactNode;
}

export function SsooSidebarList({
  as = 'div',
  ariaLabel,
  className,
  padded = true,
  children,
}: SsooSidebarListProps) {
  const classes = cn('space-y-0.5', padded && 'py-1', className);

  if (as === 'nav') {
    return (
      <nav aria-label={ariaLabel} className={classes}>
        {children}
      </nav>
    );
  }

  return <div className={classes}>{children}</div>;
}

export interface SsooSidebarListItemProps {
  icon?: SsooSidebarIcon;
  label: ReactNode;
  description?: ReactNode;
  title?: string;
  active?: boolean;
  disabled?: boolean;
  onSelect?: MouseEventHandler<HTMLButtonElement>;
  leadingSlot?: ReactNode;
  trailingAction?: ReactNode;
  containerClassName?: string;
  buttonClassName?: string;
  labelClassName?: string;
}

export function SsooSidebarListItem({
  icon: Icon,
  label,
  description,
  title,
  active = false,
  disabled = false,
  onSelect,
  leadingSlot,
  trailingAction,
  containerClassName,
  buttonClassName,
  labelClassName,
}: SsooSidebarListItemProps) {
  const hasDescription = Boolean(description);
  const rowClassName = cn(
    'group flex w-full min-w-0 items-center gap-2 rounded-md px-3 text-sm transition-colors',
    hasDescription ? 'min-h-control-h py-2' : 'h-control-h',
    active ? 'bg-ssoo-content-border font-medium text-ssoo-primary' : 'text-gray-700 hover:bg-ssoo-sitemap-bg',
    disabled && 'cursor-not-allowed opacity-50',
    containerClassName
  );
  const content = (
    <>
      {leadingSlot}
      {Icon && <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-ssoo-primary' : 'text-gray-500')} />}
      {hasDescription ? (
        <span className="min-w-0 flex-1">
          <span
            title={title}
            className={cn('block truncate', active ? 'text-ssoo-primary' : 'text-gray-700', labelClassName)}
          >
            {label}
          </span>
          <span className="mt-0.5 block truncate text-xs font-normal text-gray-500">{description}</span>
        </span>
      ) : (
        <span
          title={title}
          className={cn('min-w-0 flex-1 truncate', active ? 'text-ssoo-primary' : 'text-gray-700', labelClassName)}
        >
          {label}
        </span>
      )}
    </>
  );

  if (!trailingAction) {
    return (
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className={cn(rowClassName, 'text-left', buttonClassName)}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={rowClassName}>
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className={cn(
          'flex h-full min-w-0 flex-1 items-center gap-2 text-left',
          disabled && 'cursor-not-allowed',
          buttonClassName
        )}
      >
        {content}
      </button>
      {trailingAction}
    </div>
  );
}

export interface SsooSidebarTreeNodeState {
  level: number;
  expanded: boolean;
  active: boolean;
  disabled: boolean;
  folder: boolean;
  hasChildren: boolean;
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
  indentStep?: number;
  className?: string;
  rowClassName?: string;
  buttonClassName?: string;
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
  indentStep = 16,
  rowClassName,
  buttonClassName,
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
    ?? (Icon ? <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-ssoo-primary' : 'text-gray-500')} /> : null);
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
          disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent',
          rowClassName
        )}
        style={{ paddingLeft: `${8 + level * indentStep}px` }}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={handleSelect}
          aria-current={active ? 'page' : undefined}
          aria-expanded={folder && hasChildren ? expanded : undefined}
          className={cn(
            'flex h-full min-w-0 flex-1 items-center gap-1 text-left',
            disabled && 'cursor-not-allowed',
            buttonClassName
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
        </button>
        {trailingAction ? <span className="shrink-0">{trailingAction}</span> : null}
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
              indentStep={indentStep}
              rowClassName={rowClassName}
              buttonClassName={buttonClassName}
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

export interface SsooSidebarItemProps {
  label: string;
  description?: string;
  icon?: SsooSidebarIcon;
  active?: boolean;
  disabled?: boolean;
  badge?: ReactNode;
  variant?: 'card' | 'tree';
  level?: number;
  leadingSlot?: ReactNode;
  trailingSlot?: ReactNode;
  revealTextOnHover?: boolean;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

export function SsooSidebarItem({
  label,
  description,
  icon: Icon,
  active = false,
  disabled = false,
  badge,
  variant = 'card',
  level = 0,
  leadingSlot,
  trailingSlot,
  revealTextOnHover = false,
  className,
  onClick,
}: SsooSidebarItemProps) {
  const revealClassName = revealTextOnHover ? 'opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100' : undefined;

  if (variant === 'tree') {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={cn(
          'group flex h-control-h w-full items-center gap-1 rounded-md px-2 text-left text-sm transition-colors',
          active ? 'bg-ssoo-content-border font-medium text-ssoo-primary' : 'text-gray-700 hover:bg-ssoo-sitemap-bg',
          disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent',
          className
        )}
        style={{ paddingLeft: `${8 + level * 16}px` }}
      >
        {leadingSlot}
        {Icon && <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-ssoo-primary' : 'text-gray-500')} />}
        <span className={cn('min-w-0 flex-1 truncate', active ? 'text-ssoo-primary' : 'text-gray-700', revealClassName)}>{label}</span>
        {trailingSlot ? <span className={cn('shrink-0', revealClassName)}>{trailingSlot}</span> : null}
        {badge ? <span className={cn('shrink-0', revealClassName)}>{badge}</span> : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'mx-2 flex w-[calc(100%-1rem)] items-center rounded-md py-2 text-left transition-colors',
        revealTextOnHover ? 'justify-center gap-0 px-0 group-hover/sidebar:justify-start group-hover/sidebar:gap-3 group-hover/sidebar:px-3' : 'gap-3 px-3',
        active ? 'bg-ssoo-sitemap-bg text-ssoo-primary' : 'text-gray-600 hover:bg-white hover:text-ssoo-primary',
        disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent hover:text-gray-600',
        className
      )}
    >
      {Icon && <Icon className="h-5 w-5 shrink-0" />}
      <div className={cn('min-w-0 flex-1', revealClassName)}>
        <div className="truncate text-sm font-medium">{label}</div>
        {description && <div className="truncate text-xs text-gray-500">{description}</div>}
      </div>
      {badge ? <span className={cn('shrink-0', revealClassName)}>{badge}</span> : null}
    </button>
  );
}

export interface SsooCollapsedRailButtonProps {
  label: string;
  icon: SsooSidebarIcon;
  active?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onMouseEnter?: MouseEventHandler<HTMLButtonElement>;
  onMouseLeave?: MouseEventHandler<HTMLButtonElement>;
}

export function SsooCollapsedRailButton({
  label,
  icon: Icon,
  active = false,
  disabled = false,
  className,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: SsooCollapsedRailButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        'flex h-11 w-11 items-center justify-center rounded-lg transition-colors',
        active ? 'bg-ssoo-sitemap-bg text-ssoo-primary' : 'text-ssoo-primary hover:bg-ssoo-sitemap-bg',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
