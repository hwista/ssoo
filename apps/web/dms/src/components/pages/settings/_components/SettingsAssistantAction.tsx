'use client';

import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAssistantPanelStore } from '@/stores';

export function SettingsAssistantAction() {
  const isOpen = useAssistantPanelStore((state) => state.isOpen);
  const togglePanel = useAssistantPanelStore((state) => state.togglePanel);

  return (
    <Button
      type="button"
      variant="outline"
      size="pageAction"
      className="gap-1"
      data-settings-assistant-toggle
      aria-label={isOpen ? 'AI 대화 닫기' : 'AI 대화 열기'}
      aria-expanded={isOpen}
      onClick={togglePanel}
    >
      <MessageCircle className="h-4 w-4" />
      AI 대화
    </Button>
  );
}
