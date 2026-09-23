'use client';

import { useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { DocumentDiagramError, renderDocumentDiagram } from '@/lib/utils/documentDiagram';

interface DiagramState {
  code: string;
  svg?: string;
  error?: DocumentDiagramError;
}

export function DocumentDiagram({ code, sourceHtml }: { code: string; sourceHtml: string }) {
  const [state, setState] = useState<DiagramState>({ code });
  const [attempt, setAttempt] = useState(0);
  const hasSearchMatch = sourceHtml.includes('search-highlight');
  const [showSource, setShowSource] = useState(hasSearchMatch);
  const source = useMemo(() => ({ __html: DOMPurify.sanitize(sourceHtml, {
    ALLOWED_TAGS: ['mark'],
    ALLOWED_ATTR: ['class', 'data-search-index'],
  }) }), [sourceHtml]);

  useEffect(() => {
    let cancelled = false;
    setState({ code });
    void renderDocumentDiagram(code).then(
      (svg) => { if (!cancelled) setState({ code, svg }); },
      (error: unknown) => {
        if (!cancelled) setState({ code, error: error instanceof DocumentDiagramError ? error : new DocumentDiagramError(true) });
      },
    );
    return () => { cancelled = true; };
  }, [code, attempt]);

  const current = state.code === code ? state : { code };
  const sourceVisible = showSource || hasSearchMatch || !current.svg;
  return (
    <div className="my-3 min-w-0" data-diagram-state={current.error ? 'error' : current.svg ? 'ready' : 'loading'}>
      {current.error ? <p role="status" className="text-body-sm text-ssoo-warning">{current.error.message}</p> : null}
      {current.svg && !sourceVisible ? (
        <div role="region" aria-label="다이어그램" tabIndex={0} className="overflow-x-auto [&>svg]:mx-auto" dangerouslySetInnerHTML={{ __html: current.svg }} />
      ) : null}
      {sourceVisible ? (
        <pre className="overflow-x-auto whitespace-pre font-mono text-code-block [&_.search-highlight]:bg-ssoo-warning/20" dangerouslySetInnerHTML={source} />
      ) : null}
      {current.svg ? (
        <Button variant="ghost" size="sm" type="button" aria-expanded={sourceVisible}
          onClick={() => setShowSource((value) => !value)} disabled={hasSearchMatch}
          title={hasSearchMatch ? '검색을 지우면 도형을 볼 수 있습니다.' : undefined}>
          {sourceVisible ? '도형 보기' : '원문 보기'}
        </Button>
      ) : null}
      {current.error?.retryable ? (
        <Button variant="outline" size="sm" type="button" onClick={() => setAttempt((value) => value + 1)}>다시 시도</Button>
      ) : null}
    </div>
  );
}
