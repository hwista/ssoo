'use client';

import diff from 'fast-diff';

export type DiffChunk =
  | { kind: 'equal'; text: string }
  | { kind: 'insert'; text: string }
  | { kind: 'delete'; text: string }
  | { kind: 'replace'; deleted: string; inserted: string; block: boolean };

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function shouldRenderBlock(deleted: string, inserted: string): boolean {
  if (deleted.includes('\n') || inserted.includes('\n')) return true;
  return Math.max(countWords(deleted), countWords(inserted)) >= 2;
}

export function buildDiffChunks(original: string, current: string): DiffChunk[] {
  const rawDiffs = diff(original, current);
  const chunks: DiffChunk[] = [];
  let deletedBuffer = '';
  let insertedBuffer = '';

  const flushPending = () => {
    if (!deletedBuffer && !insertedBuffer) return;
    if (deletedBuffer && insertedBuffer) {
      chunks.push({
        kind: 'replace',
        deleted: deletedBuffer,
        inserted: insertedBuffer,
        block: shouldRenderBlock(deletedBuffer, insertedBuffer),
      });
    } else if (deletedBuffer) {
      chunks.push({ kind: 'delete', text: deletedBuffer });
    } else if (insertedBuffer) {
      chunks.push({ kind: 'insert', text: insertedBuffer });
    }
    deletedBuffer = '';
    insertedBuffer = '';
  };

  for (const [op, text] of rawDiffs) {
    if (!text) continue;
    if (op === diff.EQUAL) {
      flushPending();
      chunks.push({ kind: 'equal', text });
      continue;
    }
    if (op === diff.DELETE) {
      deletedBuffer += text;
      continue;
    }
    if (op === diff.INSERT) {
      insertedBuffer += text;
    }
  }

  flushPending();
  return chunks;
}
