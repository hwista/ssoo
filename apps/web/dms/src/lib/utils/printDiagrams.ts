'use client';

import { DocumentDiagramError, renderDocumentDiagram } from './documentDiagram';

/** Prepare the already-open print window; opening it stays in the user's click event. */
export async function preparePrintDiagrams(printWindow: Window): Promise<void> {
  if (printWindow.closed) return;
  const blocks = Array.from(printWindow.document.querySelectorAll<HTMLElement>('.mermaid-diagram'));
  for (const block of blocks) {
    const code = block.textContent ?? '';
    try {
      const svg = await renderDocumentDiagram(code);
      if (printWindow.closed) return;
      block.innerHTML = svg;
      block.dataset.diagramState = 'ready';
      const element = block.querySelector('svg');
      if (element) {
        element.style.maxWidth = '100%';
        element.style.height = 'auto';
      }
    } catch {
      if (printWindow.closed) return;
      const message = printWindow.document.createElement('p');
      message.textContent = new DocumentDiagramError(false).message;
      const source = printWindow.document.createElement('pre');
      source.textContent = code;
      block.replaceChildren(message, source);
      block.dataset.diagramState = 'error';
    }
  }
  if (printWindow.closed) return;
  // A missing font/image must not leave the existing print action waiting forever.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const images = Array.from(printWindow.document.images, (image) => image.complete
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => resolve(), { once: true });
    }));
  await Promise.race([
    Promise.allSettled([printWindow.document.fonts.ready, ...images]),
    new Promise<void>((resolve) => { timer = setTimeout(resolve, 5000); }),
  ]);
  if (timer) clearTimeout(timer);
}
