'use client';

import { useRef, useCallback, type ChangeEvent } from 'react';
import { Bot, FileText, FileCode, X } from 'lucide-react';
import type { InlineSummaryFileItem } from '@/components/common/assistant/reference/Picker';

interface LauncherAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface NewDocumentLauncherProps {
  onSelectWiki: () => void;
  onSelectTemplate: () => void;
  onSelectAiSummary: (files: InlineSummaryFileItem[]) => void;
  onClose: () => void;
}

export function NewDocumentLauncher({
  onSelectWiki,
  onSelectTemplate,
  onSelectAiSummary,
  onClose,
}: NewDocumentLauncherProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAiSummaryClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFilesSelected = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const mapped: InlineSummaryFileItem[] = await Promise.all(
      files.map(async (file) => {
        let textContent = '';
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/file/extract-text', { method: 'POST', body: formData });
          if (res.ok) {
            const data = await res.json();
            textContent = typeof data?.textContent === 'string' ? data.textContent : '';
          }
        } catch {
          textContent = '';
        }
        return {
          id: `${file.name}-${file.lastModified}-${file.size}`,
          name: file.name,
          type: file.type,
          size: file.size,
          textContent,
        };
      })
    );

    onSelectAiSummary(mapped);
    e.target.value = '';
  }, [onSelectAiSummary]);

  const actions: LauncherAction[] = [
    {
      id: 'ai-summary',
      label: 'AI 요약',
      description: '파일을 선택하면 AI가 자동으로 요약합니다',
      icon: <Bot className="w-6 h-6" />,
      onClick: handleAiSummaryClick,
    },
    {
      id: 'wiki',
      label: '위키 문서',
      description: '새 위키 문서를 작성합니다',
      icon: <FileText className="w-6 h-6" />,
      onClick: onSelectWiki,
    },
    {
      id: 'template',
      label: '템플릿 문서',
      description: '새 템플릿을 작성합니다',
      icon: <FileCode className="w-6 h-6" />,
      onClick: onSelectTemplate,
    },
    {
      id: 'close',
      label: '닫기',
      description: '이 탭을 닫습니다',
      icon: <X className="w-6 h-6" />,
      onClick: onClose,
    },
  ];

  return (
    <div className="h-full flex items-center justify-center bg-ssoo-content-bg/30">
      <div className="flex flex-col items-center gap-2 -mt-16">
        <div className="flex flex-col gap-1 w-64">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={action.onClick}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left transition-colors text-ssoo-primary/80 hover:bg-ssoo-primary/5"
            >
              <span className="text-ssoo-primary/50">
                {action.icon}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-sm">{action.label}</span>
                {action.description && (
                  <span className="text-[11px] text-ssoo-primary/40 truncate">{action.description}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".md,.txt,.json,.csv,.pdf,.docx,.pptx,.xlsx"
        className="hidden"
        onChange={handleFilesSelected}
      />
    </div>
  );
}
