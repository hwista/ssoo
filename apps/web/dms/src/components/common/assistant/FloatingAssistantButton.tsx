'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingAssistantButtonProps {
  isOpen: boolean;
  onClick: () => void;
  isDocumentActive?: boolean;
  dragStyle?: CSSProperties;
  isDragging?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  consumeDrag?: () => boolean;
}

export function FloatingAssistantButton({
  isOpen,
  onClick,
  isDocumentActive = false,
  dragStyle,
  isDragging = false,
  onPointerDown,
  consumeDrag,
}: FloatingAssistantButtonProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDocumentActiveAfterMount = mounted && isDocumentActive;

  const handleClick = useCallback(() => {
    if (consumeDrag?.()) return;
    onClick();
  }, [consumeDrag, onClick]);

  return (
    <button
      type="button"
      onClick={handleClick}
      onPointerDown={onPointerDown}
      aria-label={isOpen ? 'AI 대화 닫기' : 'AI 대화 열기'}
      className={cn(
        'z-50 h-14 w-14 rounded-full shadow-lg',
        'flex items-center justify-center',
        'bg-ssoo-primary text-white hover:bg-ssoo-primary/90',
        isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab',
        isDocumentActiveAfterMount && !isDragging && 'opacity-45 hover:opacity-100',
      )}
      style={dragStyle}
    >
      {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
    </button>
  );
}
