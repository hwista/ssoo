import { splitPostLinks } from '@/lib/utils/post-links';

export function PostContent({ content, maxLength }: { content: string; maxLength?: number }) {
  let remaining = maxLength ?? content.length;
  const parts = splitPostLinks(content).map((part, index) => {
    const text = part.text.slice(0, Math.max(0, remaining));
    remaining -= part.text.length;
    if (!text) return null;
    return part.href
      ? <a key={index} href={part.href} target="_blank" rel="noopener noreferrer" className="break-all text-ssoo-primary underline">{text}</a>
      : text;
  });
  return <>{parts}{maxLength !== undefined && content.length > maxLength ? '...' : ''}</>;
}
