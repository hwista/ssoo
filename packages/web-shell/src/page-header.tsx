'use client';

import { useId, useState, type ReactNode } from 'react';
import { cn } from './cn';
import {
  SSOO_PAGE_CHROME_CLASSES,
  SSOO_PAGE_CHROME_METRICS,
} from './page-chrome-metrics';
import { Button } from '@ssoo/web-ui';

export type SsooPageHeaderMode = 'viewer' | 'editor' | 'create';
export type SsooPageHeaderActionVariant = 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost';

export interface SsooPageHeaderAction {
  ariaExpanded?: boolean;
  label: ReactNode;
  icon?: ReactNode;
  variant?: SsooPageHeaderActionVariant;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export interface SsooPageHeaderIconSlots {
  edit?: ReactNode;
  delete?: ReactNode;
  history?: ReactNode;
  save?: ReactNode;
  cancel?: ReactNode;
  back?: ReactNode;
  loading?: ReactNode;
}

export interface SsooPageHeaderProps {
  mode: SsooPageHeaderMode;
  title?: ReactNode;
  description?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onHistory?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onBack?: () => void;
  saving?: boolean;
  saveDisabled?: boolean;
  isPreview?: boolean;
  extraActions?: SsooPageHeaderAction[];
  extraActionsPosition?: 'left' | 'right';
  viewerRightSlot?: ReactNode;
  editorPreviewSlot?: ReactNode;
  iconSlots?: SsooPageHeaderIconSlots;
  wrapContent?: boolean;
  /** Keep operating guidance available without displacing the working area. */
  compact?: boolean;
  className?: string;
}

const pageHeaderButtonFocusClass = 'ssoo-ring-primary-30';

function IconText({
  icon,
  children,
}: {
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      {icon ? <span className="inline-flex shrink-0 items-center">{icon}</span> : null}
      {children}
    </>
  );
}

export function SsooPageHeader({
  mode,
  title,
  description,
  onEdit,
  onDelete,
  onHistory,
  onSave,
  onCancel,
  onBack,
  saving = false,
  saveDisabled = false,
  isPreview = false,
  extraActions,
  extraActionsPosition = 'left',
  viewerRightSlot,
  editorPreviewSlot,
  iconSlots,
  wrapContent = false,
  compact = false,
  className,
}: SsooPageHeaderProps) {
  const [guidanceOpen, setGuidanceOpen] = useState(false);
  const guidanceId = useId();
  const renderActionButton = (action: SsooPageHeaderAction, index: number) => {
    const variant = action.variant ?? 'ghost';
    const icon = action.loading ? iconSlots?.loading : action.icon;

    return (
      <Button
        key={index}
        type="button"
        variant={variant}
        size="pageAction"
        onClick={action.onClick}
        disabled={action.disabled || action.loading}
        aria-expanded={action.ariaExpanded}
        className={pageHeaderButtonFocusClass}
      >
        <IconText icon={icon}>{action.label}</IconText>
      </Button>
    );
  };

  return (
    <div
      className={cn(
        SSOO_PAGE_CHROME_CLASSES.header,
        wrapContent && 'flex-wrap gap-2',
        compact && 'flex-wrap gap-2 py-2',
        className
      )}
      style={{ minHeight: SSOO_PAGE_CHROME_METRICS.headerMinHeightPx }}
      data-ssoo-page-header
    >
      <div className={cn("flex min-w-0 flex-1 items-center gap-3", wrapContent && !compact && "basis-full sm:basis-0", compact && "basis-full sm:basis-0 sm:min-w-64")}>
        {title || description ? (
          <div className={cn("min-w-0", compact && 'flex-1')}>
            {title ? (
              <h1 className={cn("text-title-card text-ssoo-primary", wrapContent ? "break-words" : "truncate")}>{title}</h1>
            ) : null}
            {description && !compact ? (
              <p className={cn(title ? (wrapContent ? 'mt-0.5 break-words' : 'mt-0.5 truncate') : '', 'text-body-sm ssoo-text-primary-70')}>
                {description}
              </p>
            ) : null}
          </div>
        ) : null}

        {compact && description ? <Button type="button" variant="ghost" size="pageAction" aria-expanded={guidanceOpen} aria-controls={guidanceId} onClick={() => setGuidanceOpen(open => !open)}>사용 안내</Button> : null}

        {mode === 'viewer' && onEdit ? (
          <Button variant="default" size="pageAction" type="button" onClick={onEdit} className={pageHeaderButtonFocusClass}>
            <IconText icon={iconSlots?.edit}>편집</IconText>
          </Button>
        ) : null}

        {(mode === 'editor' || mode === 'create') ? (
          <>
            {onBack ? (
              <Button variant="ghost" size="pageAction" type="button" onClick={onBack} className={pageHeaderButtonFocusClass}>
                <IconText icon={iconSlots?.back}>뒤로가기</IconText>
              </Button>
            ) : onCancel ? (
              <Button
                type="button"
                variant="ghost"
                size="pageAction"
                onClick={onCancel}
                disabled={saving}
                className={pageHeaderButtonFocusClass}
              >
                <IconText icon={iconSlots?.cancel}>{mode === 'create' ? '작성취소' : '편집종료'}</IconText>
              </Button>
            ) : null}
            {editorPreviewSlot}
          </>
        ) : null}

        {extraActionsPosition === 'left' ? extraActions?.map(renderActionButton) : null}
      </div>

      <div className={cn("flex shrink-0 items-center gap-3", wrapContent && "max-w-full flex-wrap")}>
        {mode === 'viewer' ? (
          <>
            {viewerRightSlot}
            {onHistory ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onHistory}
                className={pageHeaderButtonFocusClass}
                aria-label="이력"
              >
                {iconSlots?.history}
              </Button>
            ) : null}
          </>
        ) : null}

        {(mode === 'editor' || mode === 'create') && !isPreview ? (
          <>
            {onSave ? (
              <Button
                type="button"
                variant="default"
                size="pageAction"
                onClick={onSave}
                disabled={saving || saveDisabled}
                className={pageHeaderButtonFocusClass}
              >
                <IconText icon={saving ? iconSlots?.loading : iconSlots?.save}>저장</IconText>
              </Button>
            ) : null}
            {onDelete ? (
              <Button
                type="button"
                variant="destructive"
                size="pageAction"
                onClick={onDelete}
                disabled={saving}
                className={pageHeaderButtonFocusClass}
              >
                <IconText icon={iconSlots?.delete}>삭제</IconText>
              </Button>
            ) : null}
          </>
        ) : null}

        {extraActionsPosition === 'right' ? extraActions?.map(renderActionButton) : null}
      </div>
      {compact && description && guidanceOpen ? <p id={guidanceId} className="w-full border-t pt-2 text-body-sm ssoo-text-primary-70">{description}</p> : null}
    </div>
  );
}
