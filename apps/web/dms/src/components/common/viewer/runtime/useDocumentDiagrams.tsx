'use client';

import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { DocumentDiagram } from '../DocumentDiagram';

interface DiagramHost {
  element: Element;
  code: string;
  sourceHtml: string;
}

export function useDocumentDiagrams(containerRef: RefObject<HTMLElement | null>, content: string) {
  // React 19 reapplies innerHTML when this object changes, even for identical text.
  // Keep both the rendered hosts and their React portals alive across unrelated updates.
  const html = useMemo(() => ({ __html: content }), [content]);
  const sources = useRef(new WeakMap<Element, DiagramHost>());
  const [hosts, setHosts] = useState<DiagramHost[]>([]);

  useLayoutEffect(() => {
    const elements = containerRef.current?.querySelectorAll('.mermaid-diagram') ?? [];
    const next = Array.from(elements, (element) => {
      const cached = sources.current.get(element);
      if (cached) return cached;
      const host = { element, code: element.textContent ?? '', sourceHtml: element.innerHTML };
      sources.current.set(element, host);
      element.replaceChildren();
      return host;
    });
    setHosts(next);
  }, [containerRef, content]);

  const diagrams = hosts.map(({ element, code, sourceHtml }, index) => createPortal(
    <DocumentDiagram code={code} sourceHtml={sourceHtml} />, element, String(index),
  ));
  return { html, diagrams };
}
