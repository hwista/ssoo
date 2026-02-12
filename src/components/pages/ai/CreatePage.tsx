'use client';

import { useCallback, useMemo, useState } from 'react';
import { FileUp, FileText, Plus, Trash2, Loader2 } from 'lucide-react';
import { useCompletion } from '@ai-sdk/react';
import { AiPageTemplate } from '@/components/templates';

interface TemplateOption {
  id: string;
  label: string;
  description: string;
}

interface AttachmentItem {
  id: string;
  file: File;
  templateId: string;
  summary: string;
  isLoading: boolean;
}

const TEMPLATE_OPTIONS: TemplateOption[] = [
  { id: 'default', label: '기본 템플릿', description: '요약, 핵심 포인트, 액션 아이템' },
  { id: 'doc', label: '문서 템플릿', description: '목차, 핵심 요약, 결정 사항' },
  { id: 'sheet', label: '표/데이터 템플릿', description: '지표 요약, 표 구조, 시사점' },
  { id: 'slide', label: '슬라이드 템플릿', description: '핵심 메시지, 슬라이드 요약' },
  { id: 'pdf', label: '리포트 템플릿', description: '요약, 분석, 결론' },
];

function getTemplateByExtension(fileName: string): string {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv')) {
    return 'sheet';
  }
  if (lowerName.endsWith('.pptx') || lowerName.endsWith('.ppt')) {
    return 'slide';
  }
  if (lowerName.endsWith('.pdf')) {
    return 'pdf';
  }
  if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
    return 'doc';
  }
  return 'default';
}

export function AiCreatePage() {
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const { complete, isLoading: isCompleting } = useCompletion({
    api: '/api/create',
    onFinish: (_prompt: string, completion: string) => {
      if (activeItemId) {
        setAttachments((prev) =>
          prev.map((item) =>
            item.id === activeItemId
              ? { ...item, summary: completion, isLoading: false }
              : item
          )
        );
        setActiveItemId(null);
      }
    },
    onError: (_error: Error) => {
      if (activeItemId) {
        setAttachments((prev) =>
          prev.map((item) =>
            item.id === activeItemId
              ? { ...item, summary: '요약 생성에 실패했습니다.', isLoading: false }
              : item
          )
        );
        setActiveItemId(null);
      }
    },
  });

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    if (!files || files.length === 0) return;

    const newItems = Array.from(files).map((file) => ({
      id: `${file.name}-${Date.now()}`,
      file,
      templateId: getTemplateByExtension(file.name),
      summary: '',
      isLoading: false,
    }));

    setAttachments((prev) => [...prev, ...newItems]);
    event.target.value = '';
  }, []);

  const handleTemplateChange = useCallback((id: string, templateId: string) => {
    setAttachments((prev) =>
      prev.map((item) => (item.id === id ? { ...item, templateId } : item))
    );
  }, []);

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleGenerateSummary = useCallback(async (item: AttachmentItem) => {
    if (isCompleting) return;

    // 파일 텍스트 읽기
    const text = await item.file.text();
    if (!text || text.trim().length < 10) {
      setAttachments((prev) =>
        prev.map((a) =>
          a.id === item.id
            ? { ...a, summary: '파일 내용이 너무 짧습니다.' }
            : a
        )
      );
      return;
    }

    setActiveItemId(item.id);
    setAttachments((prev) =>
      prev.map((a) =>
        a.id === item.id ? { ...a, isLoading: true, summary: '' } : a
      )
    );

    // body에 templateType 전달
    await complete(text, {
      body: { templateType: item.templateId },
    });
  }, [complete, isCompleting]);

  const hasAttachments = attachments.length > 0;
  const templateMap = useMemo(() => {
    return TEMPLATE_OPTIONS.reduce<Record<string, TemplateOption>>((acc, option) => {
      acc[option.id] = option;
      return acc;
    }, {});
  }, []);

  return (
    <AiPageTemplate
      variant="create"
      description="문서 파일을 첨부하고 템플릿 기반 요약을 생성합니다."
      toolbar={(
        <label className="flex h-control-h cursor-pointer items-center gap-3 rounded-lg border border-dashed border-ssoo-content-border px-4 text-sm text-ssoo-primary/70 hover:border-ssoo-primary">
          <FileUp className="h-4 w-4" />
          파일 첨부 (docx, xlsx, pptx, pdf 등)
          <input type="file" multiple className="hidden" onChange={handleFileChange} />
        </label>
      )}
    >
      {!hasAttachments ? (
        <div className="flex h-full items-center justify-center text-sm text-ssoo-primary/60">
          첨부 파일이 없습니다. 파일을 추가하면 요약 템플릿을 선택할 수 있습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {attachments.map((item) => (
            <article key={item.id} className="rounded-lg border border-ssoo-content-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-control-h w-control-h items-center justify-center rounded-md bg-ssoo-content-bg">
                    <FileText className="h-5 w-5 text-ssoo-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ssoo-primary">{item.file.name}</p>
                    <p className="text-xs text-ssoo-primary/60">
                      {(item.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveAttachment(item.id)}
                  className="flex h-control-h-sm w-control-h-sm items-center justify-center rounded-md border border-ssoo-content-border text-ssoo-primary/70 hover:border-ssoo-primary hover:text-ssoo-primary"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <label className="text-xs font-semibold text-ssoo-primary/70">템플릿</label>
                  <select
                    value={item.templateId}
                    onChange={(event) => handleTemplateChange(item.id, event.target.value)}
                    className="mt-1 h-control-h w-full rounded-lg border border-ssoo-content-border px-3 text-sm focus:border-ssoo-primary focus:outline-none"
                  >
                    {TEMPLATE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-ssoo-primary/60">
                    {templateMap[item.templateId]?.description}
                  </p>
                </div>
                <button
                  onClick={() => handleGenerateSummary(item)}
                  disabled={item.isLoading || isCompleting}
                  className="mt-2 flex h-control-h items-center justify-center gap-2 rounded-lg border border-ssoo-content-border px-3 text-sm text-ssoo-primary hover:border-ssoo-primary disabled:cursor-not-allowed disabled:opacity-60 md:mt-6"
                >
                  {item.isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {item.isLoading ? '생성 중...' : '요약 생성'}
                </button>
              </div>

              {item.summary && (
                <div className="mt-4 space-y-2 rounded-lg bg-ssoo-content-bg p-3 text-sm leading-relaxed text-ssoo-primary whitespace-pre-wrap">
                  {item.summary}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </AiPageTemplate>
  );
}
