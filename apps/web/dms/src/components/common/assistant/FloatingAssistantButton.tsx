'use client';

import { MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingAssistantButtonProps {
  isOpen: boolean;
  onClick: () => void;
  isDocumentActive?: boolean;
}

export function FloatingAssistantButton({ isOpen, onClick, isDocumentActive = false }: FloatingAssistantButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? 'AI 어시스턴트 닫기' : 'AI 어시스턴트 열기'}
      className={cn(
        'fixed bottom-12 right-6 z-50 h-14 w-14 rounded-full shadow-lg transition-all',
        'flex items-center justify-center',
        'bg-ssoo-primary text-white hover:bg-ssoo-primary/90',
        isDocumentActive && 'opacity-45 hover:opacity-100'
      )}
    >
      {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
    </button>
  );
}
