'use client';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createEmptyHighlightResult() {
  return {
    highlightedContent: null,
    searchResultCount: 0,
    hasSearched: true,
    currentResultIndex: -1,
  };
}

function highlightViewerHtmlFallback(content: string, query: string) {
  const searchRegex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  let matchCount = 0;

  const highlightedContent = content.replace(/>([^<]+)</g, (match, text) => {
    const highlighted = text.replace(searchRegex, (matched: string) => {
      matchCount += 1;
      return `<mark class="search-highlight" style="background-color: #fef08a; color: inherit; border-radius: 2px; padding: 0 2px;" data-search-index="${matchCount - 1}">${matched}</mark>`;
    });

    return `>${highlighted}<`;
  });

  if (matchCount === 0) {
    return createEmptyHighlightResult();
  }

  return {
    highlightedContent,
    searchResultCount: matchCount,
    hasSearched: true,
    currentResultIndex: 0,
  };
}

export function getNearestZoomIndex(levels: number[], value: number) {
  const exact = levels.indexOf(value);
  if (exact >= 0) return exact;

  let nearest = 0;
  let minDiff = Number.POSITIVE_INFINITY;

  levels.forEach((level, index) => {
    const diff = Math.abs(level - value);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = index;
    }
  });

  return nearest;
}

export function highlightViewerHtml(content: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return createEmptyHighlightResult();
  }

  if (typeof DOMParser === 'undefined' || typeof document === 'undefined') {
    return highlightViewerHtmlFallback(content, trimmed);
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(content, 'text/html');
  const searchRegex = new RegExp(escapeRegex(trimmed), 'gi');
  let matchCount = 0;

  const walker = parsed.createTreeWalker(
    parsed.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (['SCRIPT', 'STYLE', 'TEXTAREA', 'TITLE'].includes(parent.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (!node.textContent?.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  const textNodes: Text[] = [];
  let currentNode = walker.nextNode();
  while (currentNode) {
    textNodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }

  for (const textNode of textNodes) {
    const text = textNode.textContent ?? '';
    searchRegex.lastIndex = 0;
    const matches = Array.from(text.matchAll(searchRegex));
    if (matches.length === 0) continue;

    const fragment = parsed.createDocumentFragment();
    let lastIndex = 0;

    for (const match of matches) {
      const start = match.index ?? -1;
      if (start < 0) continue;
      const matched = match[0];
      const end = start + matched.length;

      if (start > lastIndex) {
        fragment.appendChild(parsed.createTextNode(text.slice(lastIndex, start)));
      }

      const mark = parsed.createElement('mark');
      mark.className = 'search-highlight';
      mark.setAttribute('style', 'background-color: #fef08a; color: inherit; border-radius: 2px; padding: 0 2px;');
      mark.setAttribute('data-search-index', String(matchCount));
      mark.textContent = matched;
      fragment.appendChild(mark);
      matchCount += 1;
      lastIndex = end;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(parsed.createTextNode(text.slice(lastIndex)));
    }

    textNode.parentNode?.replaceChild(fragment, textNode);
  }

  if (matchCount === 0) {
    return createEmptyHighlightResult();
  }

  return {
    highlightedContent: parsed.body.innerHTML,
    searchResultCount: matchCount,
    hasSearched: true,
    currentResultIndex: 0,
  };
}

export function focusSearchHighlight(
  container: HTMLDivElement | null,
  currentResultIndex: number,
  hasHighlightedContent: boolean
) {
  if (currentResultIndex < 0 || !hasHighlightedContent || !container) return;

  const marks = container.querySelectorAll('mark.search-highlight');
  marks.forEach((mark) => {
    (mark as HTMLElement).style.outline = 'none';
  });

  const currentMark = marks[currentResultIndex] as HTMLElement | undefined;
  if (!currentMark) return;

  currentMark.style.outline = '2px solid #fb923c';
  currentMark.style.outlineOffset = '1px';
  currentMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function findTocTarget(container: HTMLDivElement | null, id: string) {
  if (!container) return null;

  let element: Element | null = null;

  try {
    const escapedId = CSS.escape(id);
    element = container.querySelector(`#${escapedId}`);
  } catch {
    // CSS.escape 실패 시 다른 fallback을 시도한다.
  }

  if (!element) element = container.querySelector(`[data-id="${id}"]`);
  if (!element) element = container.querySelector(`[name="${id}"]`);

  if (!element) {
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (const heading of headings) {
      if (heading.id === id) {
        element = heading;
        break;
      }

      const text = heading.textContent?.trim() || '';
      const slug = text.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/(^-|-$)/g, '');
      if (slug === id || text === id) {
        element = heading;
        break;
      }
    }
  }

  if (!element) {
    element = document.getElementById(id);
  }

  return element;
}
