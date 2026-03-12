'use client';

import * as React from 'react';
import { Plus, Send, X } from 'lucide-react';

export function EditableTags({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [inputValue, setInputValue] = React.useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInputValue('');
    }
  };

  const handleRemove = (tag: string) => {
    onChange(tags.filter((currentTag) => currentTag !== tag));
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-ssoo-content-border px-2 py-0.5 text-xs text-ssoo-primary"
          >
            {tag}
            <button
              onClick={() => handleRemove(tag)}
              className="transition-colors hover:text-red-500"
              aria-label={`태그 "${tag}" 삭제`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="태그 추가..."
          className="flex-1 rounded border border-ssoo-content-border bg-transparent px-2 py-1 text-xs text-ssoo-primary focus:border-ssoo-primary focus:outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          className="p-1 text-ssoo-primary/60 transition-colors hover:text-ssoo-primary disabled:opacity-30"
          aria-label="태그 추가"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function EditableSourceLinks({
  links,
  onChange,
}: {
  links: string[];
  onChange: (links: string[]) => void;
}) {
  const [inputValue, setInputValue] = React.useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !links.includes(trimmed)) {
      onChange([...links, trimmed]);
      setInputValue('');
    }
  };

  const handleRemove = (link: string) => {
    onChange(links.filter((currentLink) => currentLink !== link));
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      {links.map((link) => (
        <div key={link} className="flex items-center justify-between gap-1 text-xs">
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-blue-500 hover:underline"
          >
            {link}
          </a>
          <button
            onClick={() => handleRemove(link)}
            className="flex-shrink-0 text-ssoo-primary/60 transition-colors hover:text-red-500"
            aria-label="링크 삭제"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <div className="flex gap-1">
        <input
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="URL 추가..."
          className="flex-1 rounded border border-ssoo-content-border bg-transparent px-2 py-1 text-xs text-ssoo-primary focus:border-ssoo-primary focus:outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          className="p-1 text-ssoo-primary/60 transition-colors hover:text-ssoo-primary disabled:opacity-30"
          aria-label="링크 추가"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

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
