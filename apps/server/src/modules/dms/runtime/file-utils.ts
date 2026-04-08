const MARKDOWN_EXTENSIONS = ['.md', '.markdown'];

export function isMarkdownFile(fileName: string): boolean {
  if (!fileName || typeof fileName !== 'string') {
    return false;
  }

  const normalizedName = fileName.toLowerCase();
  return MARKDOWN_EXTENSIONS.some((extension) => normalizedName.endsWith(extension));
}

export function removeFileExtension(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') {
    return '';
  }

  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return fileName;
  }

  return fileName.substring(0, lastDotIndex);
}

export function normalizeMarkdownFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') {
    return '';
  }

  return `${removeFileExtension(fileName).toLowerCase()}.md`;
}
