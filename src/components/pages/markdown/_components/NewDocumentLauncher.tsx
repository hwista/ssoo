'use client';

import { useRef, useCallback, useState, useEffect, type ChangeEvent } from 'react';
import { Bot, FileText, FileCode, X, Loader2 } from 'lucide-react';
import { LoadingState } from '@/components/common/StateDisplay';
import type { InlineSummaryFileItem } from '@/components/common/assistant/reference/Picker';

interface LauncherAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface NewDocumentLauncherProps {
  onSelectNewDoc: () => void;
  onSelectTemplate: () => void;
  onSelectAiSummary: (files: InlineSummaryFileItem[]) => void;
  onClose: () => void;
}

export function NewDocumentLauncher({
  onSelectNewDoc,
  onSelectTemplate,
  onSelectAiSummary,
  onClose,
}: NewDocumentLauncherProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleAiSummaryClick = useCallback(() => {
    setIsPreparing(true);
    fileInputRef.current?.click();
  }, []);

  // 파일 피커 취소 시 isPreparing 복원
  useEffect(() => {
    const input = fileInputRef.current;
    if (!input) return;
    const handleCancel = () => setIsPreparing(false);
    input.addEventListener('cancel', handleCancel);
    return () => input.removeEventListener('cancel', handleCancel);
  }, []);

  const handleFilesSelected = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    setIsPreparing(false);
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setIsExtracting(true);
    const mapped: InlineSummaryFileItem[] = await Promise.all(
      files.map(async (file) => {
        let textContent = '';
        let images: InlineSummaryFileItem['images'];
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/file/extract-text', { method: 'POST', body: formData });
          if (res.ok) {
            const data = await res.json();
            textContent = typeof data?.textContent === 'string' ? data.textContent : '';
            images = Array.isArray(data?.images) ? data.images : undefined;
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
          images,
        };
      })
    );

    onSelectAiSummary(mapped);
    e.target.value = '';
  }, [onSelectAiSummary]);

  const actions: LauncherAction[] = [
    {
      id: 'ai-summary',
      label: isPreparing ? '파일 선택 준비 중...' : 'AI 요약',
      description: isPreparing ? '' : '파일을 선택하면 AI가 자동으로 요약합니다',
      icon: isPreparing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Bot className="w-6 h-6" />,
      onClick: handleAiSummaryClick,
    },
    {
      id: 'doc',
      label: '새 문서',
      description: '새 문서를 작성합니다',
      icon: <FileText className="w-6 h-6" />,
      onClick: onSelectNewDoc,
    },
    {
      id: 'template',
      label: '새 템플릿',
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

  if (isExtracting) {
    return (
      <div className="h-full flex items-center justify-center bg-ssoo-content-bg/30">
        <LoadingState message="선택한 파일의 내용을 읽는 중..." />
      </div>
    );
  }

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
