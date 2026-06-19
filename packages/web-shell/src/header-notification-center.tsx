import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  SsooHeaderNotificationButton,
  type SsooHeaderNotificationBadge,
  type SsooHeaderNotificationButtonProps,
} from './header';
import {
  SsooNotificationPanel,
  type SsooNotificationPanelItem,
  type SsooNotificationPanelProps,
} from './notification-center';
import { SSOO_SHELL_METRICS } from './shell-metrics';

export interface SsooHeaderNotificationCenterProps<TItem extends SsooNotificationPanelItem = SsooNotificationPanelItem>
  extends Omit<SsooNotificationPanelProps<TItem>, 'id' | 'panelRef' | 'style' | 'className' | 'onPrimaryAction'> {
  id?: string;
  buttonTitle?: string;
  buttonAriaLabel?: string;
  buttonIconSlot: ReactNode;
  buttonBadge?: SsooHeaderNotificationBadge;
  buttonTone?: SsooHeaderNotificationButtonProps['tone'];
  withBackdrop?: boolean;
  closeOnPrimaryAction?: boolean;
  closeOnSecondaryAction?: boolean;
  onPrimaryAction: SsooNotificationPanelProps<TItem>['onPrimaryAction'];
}

const DEFAULT_PANEL_STYLE = {
  top: SSOO_SHELL_METRICS.header.height,
  right: SSOO_SHELL_METRICS.overlay.inset,
  bottom: SSOO_SHELL_METRICS.overlay.inset,
  width: `min(${SSOO_SHELL_METRICS.overlay.panelWidth}px, calc(100vw - ${SSOO_SHELL_METRICS.overlay.inset * 2}px))`,
};

export function SsooHeaderNotificationCenter<TItem extends SsooNotificationPanelItem = SsooNotificationPanelItem>({
  id = 'ssoo-header-notification-center',
  buttonTitle = '알림',
  buttonAriaLabel,
  buttonIconSlot,
  buttonBadge,
  buttonTone,
  withBackdrop = false,
  closeOnPrimaryAction = true,
  closeOnSecondaryAction = true,
  onPrimaryAction,
  ...panelProps
}: SsooHeaderNotificationCenterProps<TItem>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const resolvedAriaLabel = buttonAriaLabel ?? (
    typeof buttonBadge === 'number' && buttonBadge > 0 ? `알림 ${buttonBadge}개` : buttonTitle
  );
  const { getSecondaryActions, ...resolvedPanelProps } = panelProps;
  const resolvedGetSecondaryActions = getSecondaryActions
    ? (item: TItem) => getSecondaryActions(item).map((action) => ({
      ...action,
      onSelect: () => {
        action.onSelect();
        if (closeOnSecondaryAction) {
          setOpen(false);
        }
      },
    }))
    : undefined;

  return (
    <>
      <SsooHeaderNotificationButton
        ref={triggerRef}
        type="button"
        title={buttonTitle}
        aria-label={resolvedAriaLabel}
        aria-controls={id}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        iconSlot={buttonIconSlot}
        badge={buttonBadge}
        tone={buttonTone}
      />

      {open ? (
        <>
          {withBackdrop ? <div aria-hidden="true" className="fixed inset-0 z-[55] bg-black/35" /> : null}
          <SsooNotificationPanel
            {...resolvedPanelProps}
            panelRef={panelRef}
            id={id}
            style={DEFAULT_PANEL_STYLE}
            getSecondaryActions={resolvedGetSecondaryActions}
            onPrimaryAction={(item) => {
              onPrimaryAction(item);
              if (closeOnPrimaryAction) {
                setOpen(false);
              }
            }}
          />
        </>
      ) : null}
    </>
  );
}
