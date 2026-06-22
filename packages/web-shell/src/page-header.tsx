'use client';

import type { ReactNode } from 'react';
import { cn } from './cn';
import {
  SSOO_PAGE_CHROME_CLASSES,
  SSOO_PAGE_CHROME_METRICS,
} from './page-chrome-metrics';
import { Button } from '@ssoo/web-ui';

export type SsooPageHeaderMode = 'viewer' | 'editor' | 'create';
export type SsooPageHeaderActionVariant = 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost';

export interface SsooPageHeaderAction {
  label: string;
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
  className?: string;
}

function getButtonClass(variant: SsooPageHeaderActionVariant, iconOnly = false) {
  return cn(
    'inline-flex items-center justify-center rounded-md font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 ssoo-ring-primary-30',
    'disabled:pointer-events-none disabled:opacity-60',
    iconOnly ? 'h-control-h w-control-h' : 'h-control-h px-3 text-[0.8125rem]',
    variant === 'default' && 'bg-ssoo-primary text-white ssoo-hover-bg-primary-90',
    variant === 'secondary' && 'ssoo-bg-primary-80 text-white ssoo-hover-bg-primary-70',
    variant === 'outline' && 'border border-ssoo-content-border bg-white text-ssoo-primary hover:bg-ssoo-content-bg',
    variant === 'destructive' && 'bg-destructive text-white hover:bg-destructive/90',
    variant === 'ghost' && 'text-ssoo-primary hover:bg-ssoo-content-bg'
  );
}

function IconText({
  icon,
  children,
}: {
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      {icon ? <span className="mr-1.5 inline-flex shrink-0 items-center">{icon}</span> : null}
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
  className,
}: SsooPageHeaderProps) {
  const renderActionButton = (action: SsooPageHeaderAction, index: number) => {
    const variant = action.variant ?? 'ghost';
    const icon = action.loading ? iconSlots?.loading : action.icon;

    return (
      <Button variant="plain" size="plain"
        key={index}
        type="button"
        onClick={action.onClick}
        disabled={action.disabled || action.loading}
        className={getButtonClass(variant)}
      >
        <IconText icon={icon}>{action.label}</IconText>
      </Button>
    );
  };

  return (
    <div
      className={cn(
        SSOO_PAGE_CHROME_CLASSES.header,
        className
      )}
      style={{ minHeight: SSOO_PAGE_CHROME_METRICS.headerMinHeightPx }}
      data-ssoo-page-header
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {title || description ? (
          <div className="min-w-0">
            {title ? (
              <h1 className="truncate text-title-card text-ssoo-primary">{title}</h1>
            ) : null}
            {description ? (
              <p className={cn(title ? 'mt-0.5 truncate text-body-sm' : 'text-[0.8125rem]', 'ssoo-text-primary-70')}>
                {description}
              </p>
            ) : null}
          </div>
        ) : null}

        {mode === 'viewer' && onEdit ? (
          <Button variant="plain" size="plain" type="button" onClick={onEdit} className={getButtonClass('default')}>
            <IconText icon={iconSlots?.edit}>편집</IconText>
          </Button>
        ) : null}

        {(mode === 'editor' || mode === 'create') ? (
          <>
            {onBack ? (
              <Button variant="plain" size="plain" type="button" onClick={onBack} className={getButtonClass('ghost')}>
                <IconText icon={iconSlots?.back}>뒤로가기</IconText>
              </Button>
            ) : onCancel ? (
              <Button variant="plain" size="plain"
                type="button"
                onClick={onCancel}
                disabled={saving}
                className={getButtonClass('ghost')}
              >
                <IconText icon={iconSlots?.cancel}>{mode === 'create' ? '작성취소' : '편집종료'}</IconText>
              </Button>
            ) : null}
            {editorPreviewSlot}
          </>
        ) : null}

        {extraActionsPosition === 'left' ? extraActions?.map(renderActionButton) : null}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {mode === 'viewer' ? (
          <>
            {viewerRightSlot}
            {onHistory ? (
              <Button variant="plain" size="plain"
                type="button"
                onClick={onHistory}
                className={getButtonClass('ghost', true)}
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
              <Button variant="plain" size="plain"
                type="button"
                onClick={onSave}
                disabled={saving || saveDisabled}
                className={getButtonClass('default')}
              >
                <IconText icon={saving ? iconSlots?.loading : iconSlots?.save}>저장</IconText>
              </Button>
            ) : null}
            {onDelete ? (
              <Button variant="plain" size="plain"
                type="button"
                onClick={onDelete}
                disabled={saving}
                className={getButtonClass('destructive')}
              >
                <IconText icon={iconSlots?.delete}>삭제</IconText>
              </Button>
            ) : null}
          </>
        ) : null}

        {extraActionsPosition === 'right' ? extraActions?.map(renderActionButton) : null}
      </div>
    </div>
  );
}
