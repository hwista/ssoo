'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useAssistantStore, useTabStore } from '@/stores';
import { FloatingAssistantButton } from './FloatingAssistantButton';
import { FloatingAssistantPanel } from './panel/FloatingAssistantPanel';

export function FloatingAssistant() {
  const isOpen = useAssistantStore((state) => state.isOpen);
  const closePanel = useAssistantStore((state) => state.closePanel);
  const togglePanel = useAssistantStore((state) => state.togglePanel);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const activeTab = useTabStore((state) => state.getActiveTab());
  const activePath = activeTab?.path ?? '';

  const isDocumentActive = useMemo(() => {
    return activePath.startsWith('/doc/') || activePath === '/wiki/new';
  }, [activePath]);
  const isAskPageActive = activePath === '/ai/ask';

  useEffect(() => {
    if (isAskPageActive && isOpen) {
      closePanel();
    }
  }, [closePanel, isAskPageActive, isOpen]);

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
      {!isAskPageActive && (
        <FloatingAssistantButton
          isOpen={isOpen}
          isDocumentActive={isDocumentActive}
          onClick={togglePanel}
        />
      )}
    </div>
  );
}
