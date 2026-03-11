'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { ASSISTANT_FOCUS_INPUT_EVENT } from '@/lib/constants/assistant';

interface UseFloatingAssistantPanelBehaviorOptions {
  isOpen: boolean;
  messagesLength: number;
  scrollRef: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  historyRef: RefObject<HTMLDivElement | null>;
  regenerateSuggestions: (count?: number) => void;
  setSuggestionsCollapsed: (collapsed: boolean) => void;
  setInputDraft: (value: string) => void;
}

export function useFloatingAssistantPanelBehavior({
  isOpen,
  messagesLength,
  scrollRef,
  inputRef,
  historyRef,
  regenerateSuggestions,
  setSuggestionsCollapsed,
  setInputDraft,
}: UseFloatingAssistantPanelBehaviorOptions) {
  const wasOpenRef = useRef(false);
  const hadMessagesRef = useRef(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const hasMessages = messagesLength > 0;

  useEffect(() => {
    if (!isOpen) return;
    const container = scrollRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [isOpen, messagesLength, scrollRef]);

  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    if (justOpened) {
      regenerateSuggestions(6);
      if (messagesLength === 0) {
        setSuggestionsCollapsed(false);
      }
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, messagesLength, regenerateSuggestions, setSuggestionsCollapsed]);

  useEffect(() => {
    const justStartedConversation = hasMessages && !hadMessagesRef.current;
    if (justStartedConversation) {
      setSuggestionsCollapsed(true);
    }
    hadMessagesRef.current = hasMessages;
  }, [hasMessages, setSuggestionsCollapsed]);

  useEffect(() => {
    if (!isOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setInputDraft('');
      }
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [isOpen, setInputDraft]);

  useEffect(() => {
    if (!historyOpen) return;
    const handleOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!historyRef.current?.contains(target)) {
        setHistoryOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setHistoryOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleOutside, true);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutside, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [historyOpen, historyRef]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      const value = inputRef.current?.value ?? '';
      inputRef.current?.setSelectionRange(value.length, value.length);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [inputRef, isOpen]);

  useEffect(() => {
    const handleFocusInput = () => {
      window.setTimeout(() => {
        inputRef.current?.focus();
        const value = inputRef.current?.value ?? '';
        inputRef.current?.setSelectionRange(value.length, value.length);
      }, 0);
    };
    window.addEventListener(ASSISTANT_FOCUS_INPUT_EVENT, handleFocusInput);
    return () => window.removeEventListener(ASSISTANT_FOCUS_INPUT_EVENT, handleFocusInput);
  }, [inputRef]);

  const panelClassName = useMemo(() => (
    [
      'fixed right-6 top-[calc(3.75rem+53px+0.75rem)] bottom-24 z-40',
      'w-[min(504px,calc(100vw-2rem))] rounded-xl border border-ssoo-content-border bg-white shadow-2xl',
      'flex flex-col',
      'transition-all duration-200',
      isOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
    ].join(' ')
  ), [isOpen]);

  return {
    hasMessages,
    historyOpen,
    setHistoryOpen,
    panelClassName,
  };
}
