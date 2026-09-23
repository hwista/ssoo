'use client';

import DOMPurify from 'dompurify';

let libraryPromise: Promise<typeof import('mermaid')> | null = null;
let diagramSequence = 0;

export class DocumentDiagramError extends Error {
  constructor(public readonly retryable: boolean) {
    super('다이어그램을 표시할 수 없어 원문을 보여드립니다.');
  }
}

export function loadMermaid() {
  if (!libraryPromise) {
    libraryPromise = import('mermaid').then((mod) => {
      mod.default.initialize({
        startOnLoad: false,
        theme: 'neutral',
        fontFamily: 'inherit',
        securityLevel: 'strict',
      });
      return mod;
    }).catch((error: unknown) => {
      libraryPromise = null;
      throw error;
    });
  }
  return libraryPromise;
}

export async function renderDocumentDiagram(code: string): Promise<string> {
  // Resource-bearing syntax must not fetch while Mermaid measures its temporary DOM.
  // Keep unsupported/unsafe input available as source instead of silently rewriting it.
  if (!code.trim() || /<\s*(?:script|iframe|img|image)\b|\bimg\s*:|@import|url\s*\(|javascript\s*:/iu.test(code)) {
    throw new DocumentDiagramError(false);
  }
  let library: Awaited<ReturnType<typeof loadMermaid>>;
  try {
    library = await loadMermaid();
  } catch {
    throw new DocumentDiagramError(true);
  }
  try {
    await library.default.parse(code);
  } catch {
    throw new DocumentDiagramError(false);
  }

  const id = `document-diagram-${++diagramSequence}`;
  try {
    const { svg } = await library.default.render(id, code);
    const clean = DOMPurify.sanitize(svg, {
      USE_PROFILES: { html: true, svg: true, svgFilters: true },
      ADD_TAGS: ['foreignObject'],
      HTML_INTEGRATION_POINTS: { foreignobject: true },
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'image', 'img'],
    });
    const parsed = new DOMParser().parseFromString(clean, 'image/svg+xml');
    if (parsed.querySelector('parsererror') || parsed.documentElement.localName !== 'svg') {
      throw new DocumentDiagramError(false);
    }
    parsed.querySelectorAll('[href], [xlink\\:href]').forEach((element) => {
      for (const attr of ['href', 'xlink:href']) {
        const value = element.getAttribute(attr);
        if (value && !value.startsWith('#')) element.removeAttribute(attr);
      }
    });
    const root = parsed.documentElement;
    const width = Number(root.getAttribute('viewBox')?.split(/[ ,]+/u)[2]);
    if (Number.isFinite(width) && width > 0) {
      root.setAttribute('style', `width: ${width / 16}em; max-width: none; height: auto;`);
    }
    return new XMLSerializer().serializeToString(root);
  } catch (error) {
    if (error instanceof DocumentDiagramError) throw error;
    throw new DocumentDiagramError(true);
  } finally {
    // Mermaid can leave an error diagram behind when rendering rejects.
    document.getElementById(`d${id}`)?.remove();
  }
}
