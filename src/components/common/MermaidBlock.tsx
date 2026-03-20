'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

let mermaidPromise: Promise<typeof import('mermaid')> | null = null;

function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => {
      mod.default.initialize({
        startOnLoad: false,
        theme: 'neutral',
        fontFamily: 'inherit',
        securityLevel: 'loose',
      });
      return mod;
    });
  }
  return mermaidPromise;
}

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
        <p className="mb-1 text-xs font-medium text-amber-700">다이어그램 렌더링 실패</p>
        <pre className="overflow-x-auto text-xs text-amber-900/80">{code}</pre>
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

/**
 * dangerouslySetInnerHTML로 렌더링된 컨테이너 내의 Mermaid 블록을 처리하는 훅.
 * Viewer/Content 컴포넌트에서 사용합니다.
 *
 * marked 렌더러가 ```mermaid 코드블록을 <div class="mermaid-diagram"> 으로 변환한 뒤,
 * 이 훅이 해당 요소를 찾아 mermaid.render()를 호출합니다.
 */
export function useMermaidRenderer(
  containerRef: React.RefObject<HTMLElement | null>,
  content: string,
) {
  const processedRef = useRef(new Set<Element>());

  const renderAll = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    const blocks = container.querySelectorAll('.mermaid-diagram:not([data-mermaid-rendered])');
    if (blocks.length === 0) return;

    const mermaid = await loadMermaid();

    for (const block of blocks) {
      if (processedRef.current.has(block)) continue;
      processedRef.current.add(block);

      const code = (block.textContent ?? '').trim();
      if (!code) continue;

      try {
        const id = `mermaid-viewer-${++renderCounter}`;
        const { svg } = await mermaid.default.render(id, code);
        block.innerHTML = svg;
        block.setAttribute('data-mermaid-rendered', 'true');
        block.classList.add('flex', 'justify-center', 'overflow-x-auto', 'my-3');
      } catch {
        block.classList.add(
          'rounded-md', 'border', 'border-amber-200', 'bg-amber-50',
          'p-3', 'text-xs', 'text-amber-900/80', 'whitespace-pre-wrap',
        );
      }
    }
  }, [containerRef]);

  useEffect(() => {
    processedRef.current.clear();
    void renderAll();
  }, [content, renderAll]);
}
