'use client';

import { useEffect, useRef, useState } from 'react';

import { loadMermaid } from '@/lib/utils/documentDiagram';

let renderCounter = 0;

/**
 * 단일 Mermaid 다이어그램을 렌더링하는 컴포넌트.
 * ReactMarkdown의 code 컴포넌트에서 사용합니다.
 */
export function MermaidBlock({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !code.trim()) return;

    let cancelled = false;
    const el = containerRef.current;

    void (async () => {
      try {
        const mermaid = await loadMermaid();
        if (cancelled) return;

        const id = `mermaid-${++renderCounter}`;
        const { svg } = await mermaid.default.render(id, code.trim());
        if (cancelled) return;

        el.innerHTML = svg;
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Mermaid 렌더링 실패');
        el.textContent = code;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <div className="my-2 rounded-md border border-amber-200 bg-amber-50 p-3">
        <p className="mb-1 text-label-sm text-amber-700">다이어그램 렌더링 실패</p>
        <pre className="overflow-x-auto font-mono text-code-block text-amber-900/80">{code}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-3 flex justify-center overflow-x-auto [&>svg]:max-w-full"
    />
  );
}
