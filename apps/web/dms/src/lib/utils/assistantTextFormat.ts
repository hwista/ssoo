export type AssistantTextBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list-item'; text: string; ordered: boolean };

export function cleanInlineMarkdown(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/[#>*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function splitLongParagraph(text: string): string[] {
  if (text.length <= 140) return [text];

  const sentences = text
    .split(/(?<=[.!?。！？])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length <= 1) {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += 120) {
      chunks.push(text.slice(i, i + 120).trim());
    }
    return chunks.filter(Boolean);
  }

  const grouped: string[] = [];
  let current = '';
  let sentenceCount = 0;

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if ((candidate.length > 180 || sentenceCount >= 3) && current) {
      grouped.push(current);
      current = sentence;
      sentenceCount = 1;
    } else {
      current = candidate;
      sentenceCount += 1;
    }
  }

  if (current) grouped.push(current);
  return grouped;
}

export function toTextBlocks(text: string): AssistantTextBlock[] {
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd());

  const blocks: AssistantTextBlock[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^[-*]\s+/.test(line)) {
      const content = cleanInlineMarkdown(line.replace(/^[-*]\s+/, ''));
      if (content) blocks.push({ type: 'list-item', text: content, ordered: false });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const content = cleanInlineMarkdown(line.replace(/^\d+\.\s+/, ''));
      if (content) blocks.push({ type: 'list-item', text: content, ordered: true });
      continue;
    }

    const content = cleanInlineMarkdown(line);
    if (content) {
      splitLongParagraph(content).forEach((chunk) => {
        blocks.push({ type: 'paragraph', text: chunk });
      });
    }
  }

  return blocks;
}

