'use client';

import * as React from 'react';
import { Send } from 'lucide-react';

export function CommentInput({ onAdd }: { onAdd: (content: string) => void }) {
  const [inputValue, setInputValue] = React.useState('');

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      onAdd(trimmed);
      setInputValue('');
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex-shrink-0 border-t border-ssoo-content-border p-3">
      <div className="relative">
        <textarea
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="댓글 입력... (Enter 전송)"
          rows={2}
          className="w-full resize-none rounded border border-ssoo-content-border bg-transparent px-2 py-1.5 pr-8 text-xs text-ssoo-primary focus:border-ssoo-primary focus:outline-none"
        />
        <button
          onClick={handleSubmit}
          disabled={!inputValue.trim()}
          className="absolute bottom-1.5 right-1.5 p-1 text-ssoo-primary/60 transition-colors hover:text-ssoo-primary disabled:opacity-30"
          aria-label="댓글 추가"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
