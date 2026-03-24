'use client';

import * as React from 'react';
import { Check, FileText, Plus, Sparkles, X } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/StateDisplay';
import { TextSection } from '@/components/templates/page-frame/sidecar';
import { docAssistApi } from '@/lib/api';

function WandButton({ loading, onClick, label }: { loading: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="rounded p-1 text-ssoo-primary/50 transition-all hover:bg-black/5 hover:text-ssoo-primary disabled:opacity-40"
      aria-label={label}
      title={label}
    >
      {loading ? <LoadingSpinner className="h-3.5 w-3.5 text-current" /> : <Sparkles className="h-3.5 w-3.5" />}
    </button>
  );
}

export function SummarySection({
  editable,
  summary,
  onChange,
  onSummaryReplace,
  getEditorContent,
  originalSummary,
  externalAiSuggestion,
  externalLoading = false,
  onExternalAiSuggestionConsumed,
}: {
  editable: boolean;
  summary: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSummaryReplace?: (text: string) => void;
  getEditorContent?: () => string;
  originalSummary?: string;
  externalAiSuggestion?: string | null;
  externalLoading?: boolean;
  onExternalAiSuggestionConsumed?: () => void;
}) {
  const [aiSuggestion, setAiSuggestion] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (externalAiSuggestion && externalAiSuggestion.trim()) {
      setAiSuggestion(externalAiSuggestion);
      onExternalAiSuggestionConsumed?.();
    }
  }, [externalAiSuggestion, onExternalAiSuggestionConsumed]);

  const handleWand = async () => {
    if (externalLoading) return;
    const content = getEditorContent?.() ?? '';
    if (!content.trim()) return;

    setIsLoading(true);
    setAiSuggestion(null);
    try {
      const res = await docAssistApi.compose({
        instruction: '다음 문서의 핵심 내용을 2~3문장으로 요약하세요. 요약문만 출력하세요.',
        currentContent: content,
      });
      if (res.data?.text) {
        setAiSuggestion(res.data.text.trim());
      }
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
    }
  };

  const isWandLoading = isLoading || externalLoading;
  const isChanged = editable && originalSummary !== undefined && summary !== originalSummary;

  if (editable) {
    return (
      <TextSection
        title="요약"
        icon={<FileText className="mr-1.5 h-4 w-4 shrink-0" />}
        headerRight={getEditorContent ? <WandButton loading={isWandLoading} onClick={handleWand} label="AI 요약 생성" /> : undefined}
        content={(
          <div className="space-y-2">
            <textarea
              value={summary}
              onChange={onChange}
              placeholder="문서 요약을 입력하세요..."
              rows={3}
              className={[
                'w-full resize-y rounded border px-2 py-1.5 text-xs leading-relaxed text-ssoo-primary focus:outline-none',
                isChanged
                  ? 'border-destructive/30 bg-destructive/5 focus:border-destructive/40'
                  : 'border-ssoo-content-border bg-transparent focus:border-ssoo-primary',
              ].join(' ')}
            />
            {aiSuggestion && (
              <div className="rounded border border-dashed border-ssoo-primary/30 bg-ssoo-primary/5 p-2">
                <p className="mb-2 whitespace-pre-wrap text-xs leading-relaxed text-ssoo-primary/80">{aiSuggestion}</p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const nextSummary = summary ? `${summary}\n${aiSuggestion}` : aiSuggestion;
                      onSummaryReplace?.(nextSummary);
                      setAiSuggestion(null);
                    }}
                    className="inline-flex items-center gap-1 rounded bg-ssoo-primary/10 px-2 py-0.5 text-xs text-ssoo-primary transition-colors hover:bg-ssoo-primary/20"
                  >
                    <Plus className="h-3 w-3" />
                    덧붙이기
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSummaryReplace?.(aiSuggestion);
                      setAiSuggestion(null);
                    }}
                    className="inline-flex items-center gap-1 rounded bg-ssoo-primary/10 px-2 py-0.5 text-xs text-ssoo-primary transition-colors hover:bg-ssoo-primary/20"
                  >
                    <Check className="h-3 w-3" />
                    변경
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiSuggestion(null)}
                    className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-ssoo-primary/60 transition-colors hover:text-ssoo-primary"
                  >
                    <X className="h-3 w-3" />
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      />
    );
  }

  return (
    <TextSection
      title="요약"
      icon={<FileText className="mr-1.5 h-4 w-4 shrink-0" />}
      text={summary}
      emptyText="요약없음"
    />
  );
}
