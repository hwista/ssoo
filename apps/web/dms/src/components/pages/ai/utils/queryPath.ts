export function getQueryFromTabPath(path?: string): string {
  if (!path) return '';

  const [, queryString = ''] = path.split('?');
  const params = new URLSearchParams(queryString);
  return params.get('q')?.trim() ?? '';
}
