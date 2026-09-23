export function parsePostUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed) || /[\s\u0000-\u001f\u007f]/.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    return url.hostname && !url.username && !url.password ? trimmed : null;
  } catch {
    return null;
  }
}

export function splitPostLinks(content: string) {
  return content.split(/(https?:\/\/[^\s<>"']+)/gi).flatMap((text) => {
    const address = text.replace(/[.,!?;:，。！？)\]}]+$/, '');
    const href = parsePostUrl(address);
    return href
      ? [{ text: address, href }, { text: text.slice(address.length), href: null }]
      : [{ text, href: null }];
  });
}
