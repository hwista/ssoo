'use client';

import * as React from 'react';
import { Send, X } from 'lucide-react';
import { Button, Textarea } from '@ssoo/web-ui';

export interface CommentInputProps {
  onAdd: (content: string, parentId?: string) => boolean | void | Promise<boolean | void>;
  replyTo?: { id: string; author: string };
  onCancelReply?: () => void;
  disabled?: boolean;
}

export function CommentInput({ onAdd, replyTo, onCancelReply, disabled = false }: CommentInputProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (replyTo) {
      textareaRef.current?.focus();
    }
  }, [replyTo]);

  const handleSubmit = async () => {
    const trimmed = inputValue.trim();
    if (trimmed && !disabled && !isSubmitting) {
      setIsSubmitting(true);
      let result: boolean | void;
      try {
        result = await onAdd(trimmed, replyTo?.id);
      } finally {
        setIsSubmitting(false);
      }
      if (result === false) {
        return;
      }
      setInputValue('');
      onCancelReply?.();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
    if (event.key === 'Escape' && replyTo) {
      onCancelReply?.();
    }
  };

  return (
    <div className="flex-shrink-0 border-t border-ssoo-content-border p-3">
      {replyTo && (
        <div className="mb-1.5 flex items-center gap-1 text-caption text-ssoo-primary/60">
          <span>@{replyTo.author}에게 답글</span>
          <Button variant="plain" size="plain"
            type="button"
            onClick={onCancelReply}
            className="ml-auto rounded p-0.5 hover:bg-ssoo-content-border"
            aria-label="답글 취소"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={replyTo ? `@${replyTo.author}에게 답글...` : '댓글 입력... (Enter 전송)'}
          rows={2}
          disabled={disabled || isSubmitting}
          className="w-full resize-none rounded border border-ssoo-content-border bg-transparent px-2 py-1.5 pr-8 text-caption text-ssoo-primary focus:border-ssoo-primary focus:outline-none"
        />
        <Button variant="plain" size="plain"
          onClick={handleSubmit}
          disabled={!inputValue.trim() || disabled || isSubmitting}
          className="absolute bottom-1.5 right-1.5 p-1 text-ssoo-primary/60 transition-colors hover:text-ssoo-primary disabled:opacity-30"
          aria-label="댓글 추가"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
