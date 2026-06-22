import type { CSSProperties, ReactNode, Ref } from 'react';
import { cn } from './cn';
import { Button, SegmentedControl, SegmentedControlItem } from '@ssoo/web-ui';

export type SsooNotificationPanelTone = 'info' | 'success' | 'warning' | 'error';
export type SsooNotificationPanelActionVariant = 'primary' | 'secondary' | 'danger';

export interface SsooNotificationPanelItem {
  id: string;
  title: string;
  message?: string | null;
  severity?: SsooNotificationPanelTone;
  reference?: {
    id?: string | null;
    path?: string | null;
  } | null;
  action?: {
    label?: string | null;
  } | null;
}

export interface SsooNotificationPanelCategory {
  label: ReactNode;
  iconSlot?: ReactNode;
  tone?: SsooNotificationPanelTone;
}

export interface SsooNotificationPanelAction {
  label: ReactNode;
  iconSlot?: ReactNode;
  iconSpinning?: boolean;
  variant?: SsooNotificationPanelActionVariant;
  disabled?: boolean;
  title?: string;
  onSelect: () => void;
}

export interface SsooNotificationPanelFilter {
  key: string;
  label: ReactNode;
  badge?: number | null;
  selected?: boolean;
  disabled?: boolean;
  title?: string;
  onSelect: () => void;
}

export interface SsooNotificationPanelProps<TItem extends SsooNotificationPanelItem = SsooNotificationPanelItem> {
  id?: string;
  panelRef?: Ref<HTMLDivElement>;
  role?: 'dialog' | 'region';
  ariaLabel?: string;
  title?: ReactNode;
  className?: string;
  style?: CSSProperties;
  loadingSlot?: ReactNode;
  emptyIconSlot?: ReactNode;
  emptyTitle?: ReactNode;
  emptyDescription?: ReactNode;
  unreadTitle?: ReactNode;
  readTitle?: ReactNode;
  unreadItems: TItem[];
  readItems: TItem[];
  unreadTotal: number;
  readTotal: number;
  filters?: SsooNotificationPanelFilter[];
  hasLoaded: boolean;
  isFetching?: boolean;
  unreadIsFetching?: boolean;
  readIsFetching?: boolean;
  isReadStateChanging?: boolean;
  markReadIconSlot?: ReactNode;
  markUnreadIconSlot?: ReactNode;
  markAllUnreadIconSlot?: ReactNode;
  getCategory?: (item: TItem) => SsooNotificationPanelCategory;
  getReferenceLabel?: (item: TItem) => ReactNode;
  getPrimaryActionLabel?: (item: TItem) => ReactNode;
  getPrimaryActionIconSlot?: (item: TItem) => ReactNode;
  getPrimaryActionIconSpinning?: (item: TItem) => boolean;
  getPrimaryActionVariant?: (item: TItem) => SsooNotificationPanelActionVariant;
  isPrimaryActionDisabled?: (item: TItem) => boolean;
  getSecondaryActions?: (item: TItem) => SsooNotificationPanelAction[];
  onPrimaryAction: (item: TItem) => void;
  onMarkRead: (item: TItem) => void;
  onMarkUnread: (item: TItem) => void;
  onMarkAllUnreadRead?: () => void;
  onShowMoreUnread: () => void;
  onShowMoreRead: () => void;
}

interface SsooNotificationPanelActionButtonProps {
  action: SsooNotificationPanelAction;
}

function SsooNotificationPanelActionButton({ action }: SsooNotificationPanelActionButtonProps) {
  const variant = action.variant ?? 'secondary';

  return (
    <Button variant="plain" size="plain"
      type="button"
      title={action.title}
      onClick={(event) => {
        event.stopPropagation();
        action.onSelect();
      }}
      disabled={action.disabled}
      className={cn(
        'inline-flex h-7 items-center justify-center gap-1 rounded border px-2 text-xs font-normal leading-4 transition-colors disabled:cursor-not-allowed disabled:opacity-60 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:shrink-0',
        action.iconSpinning && '[&>svg]:animate-spin',
        variant === 'primary' && 'border-ssoo-primary bg-ssoo-primary text-white hover:bg-ssoo-primary-hover',
        variant === 'secondary' && 'border-ssoo-content-border bg-background text-ssoo-primary hover:bg-muted/50',
        variant === 'danger' && 'border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15',
      )}
    >
      {action.iconSlot}
      {action.label}
    </Button>
  );
}

interface SsooNotificationPanelIconButtonProps {
  title: string;
  iconSlot?: ReactNode;
  fallbackLabel: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  variant?: 'secondary' | 'primary';
}

function SsooNotificationPanelIconButton({
  title,
  iconSlot,
  fallbackLabel,
  onSelect,
  disabled = false,
  variant = 'secondary',
}: SsooNotificationPanelIconButtonProps) {
  return (
    <Button
      variant={variant === 'primary' ? 'default' : 'outline'}
      size={iconSlot ? 'xsIcon' : 'xs'}
      type="button"
      title={title}
      aria-label={title}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      disabled={disabled}
      className={cn(
        'shrink-0',
        iconSlot && 'w-7 px-0',
      )}
    >
      {iconSlot ?? fallbackLabel}
    </Button>
  );
}

function getDefaultCategory(item: SsooNotificationPanelItem): SsooNotificationPanelCategory {
  return {
    label: '알림',
    tone: item.severity === 'error' ? 'error' : item.severity === 'warning' ? 'warning' : item.severity === 'success' ? 'success' : 'info',
  };
}

function getDefaultReferenceLabel(item: SsooNotificationPanelItem): ReactNode {
  return item.reference?.path ?? item.reference?.id ?? null;
}

function getDefaultPrimaryActionLabel(item: SsooNotificationPanelItem): ReactNode {
  return item.action?.label?.trim() || '확인';
}

function formatNotificationPanelBadge(badge?: number | null): string | null {
  if (typeof badge !== 'number' || !Number.isFinite(badge) || badge < 0) {
    return null;
  }
  return badge > 99 ? '99+' : String(badge);
}

interface SsooNotificationPanelFiltersProps {
  filters: SsooNotificationPanelFilter[];
}

function SsooNotificationPanelFilters({ filters }: SsooNotificationPanelFiltersProps) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-ssoo-content-border bg-background px-3 py-2">
      <SegmentedControl>
        {filters.map((filter) => {
          const badge = formatNotificationPanelBadge(filter.badge);

          return (
            <SegmentedControlItem
              key={filter.key}
              title={filter.title}
              selected={filter.selected}
              disabled={filter.disabled}
              onClick={(event) => {
                event.stopPropagation();
                filter.onSelect();
              }}
              badge={badge}
            >
              {filter.label}
            </SegmentedControlItem>
          );
        })}
      </SegmentedControl>
    </div>
  );
}

interface SsooNotificationPanelCardProps<TItem extends SsooNotificationPanelItem = SsooNotificationPanelItem> {
  item: TItem;
  read: boolean;
  isReadStateChanging: boolean;
  markReadIconSlot?: ReactNode;
  markUnreadIconSlot?: ReactNode;
  getCategory?: (item: TItem) => SsooNotificationPanelCategory;
  getReferenceLabel?: (item: TItem) => ReactNode;
  getPrimaryActionLabel?: (item: TItem) => ReactNode;
  getPrimaryActionIconSlot?: (item: TItem) => ReactNode;
  getPrimaryActionIconSpinning?: (item: TItem) => boolean;
  getPrimaryActionVariant?: (item: TItem) => SsooNotificationPanelActionVariant;
  isPrimaryActionDisabled?: (item: TItem) => boolean;
  getSecondaryActions?: (item: TItem) => SsooNotificationPanelAction[];
  onPrimaryAction: (item: TItem) => void;
  onMarkRead: (item: TItem) => void;
  onMarkUnread: (item: TItem) => void;
}

function SsooNotificationPanelCard<TItem extends SsooNotificationPanelItem>({
  item,
  read,
  isReadStateChanging,
  markReadIconSlot,
  markUnreadIconSlot,
  getCategory,
  getReferenceLabel,
  getPrimaryActionLabel,
  getPrimaryActionIconSlot,
  getPrimaryActionIconSpinning,
  getPrimaryActionVariant,
  isPrimaryActionDisabled,
  getSecondaryActions,
  onPrimaryAction,
  onMarkRead,
  onMarkUnread,
}: SsooNotificationPanelCardProps<TItem>) {
  const category = getCategory?.(item) ?? getDefaultCategory(item);
  const referenceLabel = getReferenceLabel?.(item) ?? getDefaultReferenceLabel(item);
  const secondaryActions = getSecondaryActions?.(item) ?? [];
  const primaryAction: SsooNotificationPanelAction = {
    label: getPrimaryActionLabel?.(item) ?? getDefaultPrimaryActionLabel(item),
    iconSlot: getPrimaryActionIconSlot?.(item),
    iconSpinning: getPrimaryActionIconSpinning?.(item),
    variant: getPrimaryActionVariant?.(item) ?? 'primary',
    disabled: isPrimaryActionDisabled?.(item) ?? false,
    onSelect: () => onPrimaryAction(item),
  };

  return (
    <article
      className={cn(
        'rounded-lg border px-3 py-2 transition-colors',
        read
          ? 'border-ssoo-content-border/70 bg-background/70 text-ssoo-primary/70'
          : 'border-ssoo-primary/15 bg-background text-ssoo-primary shadow-sm',
        'hover:bg-background',
      )}
    >
      <div className="flex items-start gap-2">
        <Button variant="plain" size="plain"
          type="button"
          onClick={() => onPrimaryAction(item)}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <span
            className={cn(
              'mt-1 h-2 w-2 shrink-0 rounded-full',
              read ? 'border border-ssoo-primary/25 bg-transparent' : 'bg-ssoo-primary',
            )}
            aria-hidden="true"
          />
          {category.iconSlot ? (
            <span
              className={cn(
                'mt-0.5 shrink-0 [&>svg]:h-4 [&>svg]:w-4',
                category.tone === 'error' && 'text-red-500',
                category.tone === 'warning' && 'text-amber-600',
                category.tone === 'success' && 'text-emerald-600',
                (!category.tone || category.tone === 'info') && 'text-ssoo-primary/60',
              )}
            >
              {category.iconSlot}
            </span>
          ) : null}
          <span className="min-w-0 flex-1">
            <span className="mb-1 inline-flex rounded bg-ssoo-content-bg/70 px-1.5 py-0.5 text-[10px] font-normal leading-none text-ssoo-primary/55">
              {category.label}
            </span>
            <span className={cn('block truncate text-sm font-normal leading-5', read && 'text-ssoo-primary/70')}>
              {item.title}
            </span>
            {item.message ? (
              <span className={cn('mt-0.5 line-clamp-2 text-xs font-normal leading-4 text-ssoo-primary/60', read && 'text-ssoo-primary/50')}>
                {item.message}
              </span>
            ) : null}
            {referenceLabel ? (
              <span className="mt-0.5 block truncate text-xs font-normal leading-4 text-ssoo-primary/45">
                {referenceLabel}
              </span>
            ) : null}
          </span>
        </Button>
        <SsooNotificationPanelIconButton
          title={read ? '안 읽음으로 표시' : '읽음 처리'}
          onSelect={() => {
            if (read) {
              onMarkUnread(item);
            } else {
              onMarkRead(item);
            }
          }}
          disabled={isReadStateChanging}
          variant={read ? 'secondary' : 'primary'}
          iconSlot={read ? markUnreadIconSlot : markReadIconSlot}
          fallbackLabel={read ? '안읽음' : '읽음'}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 pl-8">
        <SsooNotificationPanelActionButton action={primaryAction} />
        {secondaryActions.map((action, index) => (
          <SsooNotificationPanelActionButton
            key={`${item.id}-secondary-${index}`}
            action={action}
          />
        ))}
      </div>
    </article>
  );
}

interface SsooNotificationPanelGroupProps<TItem extends SsooNotificationPanelItem = SsooNotificationPanelItem> extends Omit<
  SsooNotificationPanelCardProps<TItem>,
  'item' | 'read'
> {
  title: ReactNode;
  items: TItem[];
  total: number;
  read: boolean;
  isFetching: boolean;
  headerAction?: ReactNode;
  onShowMore: () => void;
}

function SsooNotificationPanelGroup<TItem extends SsooNotificationPanelItem>({
  title,
  items,
  total,
  read,
  isFetching,
  headerAction,
  onShowMore,
  ...cardProps
}: SsooNotificationPanelGroupProps<TItem>) {
  if (items.length === 0 && total === 0) {
    return null;
  }

  const remainingCount = Math.max(total - items.length, 0);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <h3 className="text-xs font-medium leading-4 text-ssoo-primary/60">{title}</h3>
        <div className="flex items-center gap-1.5">
          {headerAction}
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-none text-ssoo-primary/60">
            {total}
          </span>
        </div>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <SsooNotificationPanelCard
            key={item.id}
            item={item}
            read={read}
            {...cardProps}
          />
        ))}
      </div>
      {remainingCount > 0 ? (
        <Button variant="plain" size="plain"
          type="button"
          onClick={onShowMore}
          disabled={isFetching}
          className="flex h-8 w-full items-center justify-center rounded border border-ssoo-content-border bg-background text-xs font-normal leading-4 text-ssoo-primary transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isFetching ? '불러오는 중' : `더 보기 ${remainingCount}`}
        </Button>
      ) : null}
    </section>
  );
}

export function SsooNotificationPanel<TItem extends SsooNotificationPanelItem>({
  id,
  panelRef,
  role = 'dialog',
  ariaLabel = '알림',
  title = '알림',
  className,
  style,
  loadingSlot,
  emptyIconSlot,
  emptyTitle = '확인할 알림이 없습니다.',
  emptyDescription,
  unreadTitle = '새 알림',
  readTitle = '읽은 알림',
  unreadItems,
  readItems,
  unreadTotal,
  readTotal,
  filters = [],
  hasLoaded,
  isFetching = false,
  unreadIsFetching = false,
  readIsFetching = false,
  isReadStateChanging = false,
  markReadIconSlot,
  markUnreadIconSlot,
  markAllUnreadIconSlot,
  getCategory,
  getReferenceLabel,
  getPrimaryActionLabel,
  getPrimaryActionIconSlot,
  getPrimaryActionIconSpinning,
  getPrimaryActionVariant,
  isPrimaryActionDisabled,
  getSecondaryActions,
  onPrimaryAction,
  onMarkRead,
  onMarkUnread,
  onMarkAllUnreadRead,
  onShowMoreUnread,
  onShowMoreRead,
}: SsooNotificationPanelProps<TItem>) {
  const hasNotifications = unreadTotal + readTotal > 0;

  return (
    <div
      ref={panelRef}
      id={id}
      role={role}
      aria-label={ariaLabel}
      style={style}
      className={cn(
        'fixed z-[60] flex overflow-hidden rounded-l-lg border border-ssoo-content-border bg-ssoo-content-bg text-ssoo-primary shadow-2xl',
        'flex-col',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-ssoo-content-border bg-background px-4 py-3">
        <p className="text-sm font-medium leading-5 text-ssoo-primary">{title}</p>
        {isFetching && loadingSlot ? (
          <span className="inline-flex animate-spin text-ssoo-primary/60 [&>svg]:h-4 [&>svg]:w-4">
            {loadingSlot}
          </span>
        ) : null}
      </div>

      <SsooNotificationPanelFilters filters={filters} />

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-2">
        {hasLoaded && !isFetching && !hasNotifications ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 py-8 text-center text-ssoo-primary/70">
            {emptyIconSlot ? (
              <div className="text-ssoo-primary/30 [&>svg]:h-8 [&>svg]:w-8">
                {emptyIconSlot}
              </div>
            ) : null}
            <div>
              <p className="text-sm font-normal leading-5 text-ssoo-primary">{emptyTitle}</p>
              {emptyDescription ? (
                <p className="mt-1 text-xs font-normal leading-4 text-ssoo-primary/60">{emptyDescription}</p>
              ) : null}
            </div>
          </div>
        ) : null}
        <SsooNotificationPanelGroup
          title={unreadTitle}
          items={unreadItems}
          total={unreadTotal}
          read={false}
          isFetching={unreadIsFetching}
          isReadStateChanging={isReadStateChanging}
          markReadIconSlot={markReadIconSlot}
          markUnreadIconSlot={markUnreadIconSlot}
          getCategory={getCategory}
          getReferenceLabel={getReferenceLabel}
          getPrimaryActionLabel={getPrimaryActionLabel}
          getPrimaryActionIconSlot={getPrimaryActionIconSlot}
          getPrimaryActionIconSpinning={getPrimaryActionIconSpinning}
          getPrimaryActionVariant={getPrimaryActionVariant}
          isPrimaryActionDisabled={isPrimaryActionDisabled}
          getSecondaryActions={getSecondaryActions}
          onPrimaryAction={onPrimaryAction}
          onMarkRead={onMarkRead}
          onMarkUnread={onMarkUnread}
          onShowMore={onShowMoreUnread}
          headerAction={unreadTotal > 0 && onMarkAllUnreadRead ? (
            <SsooNotificationPanelActionButton
              action={{
                label: '모두 읽음',
                iconSlot: markAllUnreadIconSlot,
                onSelect: onMarkAllUnreadRead,
                disabled: isReadStateChanging,
              }}
            />
          ) : null}
        />
        <SsooNotificationPanelGroup
          title={readTitle}
          items={readItems}
          total={readTotal}
          read
          isFetching={readIsFetching}
          isReadStateChanging={isReadStateChanging}
          markReadIconSlot={markReadIconSlot}
          markUnreadIconSlot={markUnreadIconSlot}
          getCategory={getCategory}
          getReferenceLabel={getReferenceLabel}
          getPrimaryActionLabel={getPrimaryActionLabel}
          getPrimaryActionIconSlot={getPrimaryActionIconSlot}
          getPrimaryActionIconSpinning={getPrimaryActionIconSpinning}
          getPrimaryActionVariant={getPrimaryActionVariant}
          isPrimaryActionDisabled={isPrimaryActionDisabled}
          getSecondaryActions={getSecondaryActions}
          onPrimaryAction={onPrimaryAction}
          onMarkRead={onMarkRead}
          onMarkUnread={onMarkUnread}
          onShowMore={onShowMoreRead}
        />
      </div>
    </div>
  );
}
