'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useAssistantPanelStore, useTabStore } from '@/stores';
import { FloatingAssistantButton } from './FloatingAssistantButton';
import { FloatingAssistantPanel } from './panel/FloatingAssistantPanel';

export function FloatingAssistant() {
  const isOpen = useAssistantPanelStore((state) => state.isOpen);
  const closePanel = useAssistantPanelStore((state) => state.closePanel);
  const togglePanel = useAssistantPanelStore((state) => state.togglePanel);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const activeTab = useTabStore((state) => state.getActiveTab());
  const activePath = activeTab?.path ?? '';

  const isDocumentActive = useMemo(() => {
    return activePath.startsWith('/doc/') || activePath === '/doc/new';
  }, [activePath]);
  const isChatPageActive = activePath === '/ai/chat';

  useEffect(() => {
    if (isChatPageActive && isOpen) {
      closePanel();
    }
  }, [closePanel, isChatPageActive, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const elementTarget = target as Element | null;
      if (elementTarget?.closest('[data-assistant-dropdown="true"]')) {
        return;
      }
      if (!wrapperRef.current?.contains(target)) {
        closePanel();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [closePanel, isOpen]);

  return (
    <div ref={wrapperRef}>
      <FloatingAssistantPanel isOpen={isOpen} />
      {!isChatPageActive && (
        <FloatingAssistantButton
          isOpen={isOpen}
          isDocumentActive={isDocumentActive}
          onClick={togglePanel}
        />
      )}
    </div>
  );
}
