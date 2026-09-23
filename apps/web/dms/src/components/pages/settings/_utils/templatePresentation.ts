export function formatTemplateUpdatedAt(value: string | null | undefined): string {
  if (!value) return '수정일 정보 없음';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp === 0) return '수정일 정보 없음';
  return value.slice(0, 10);
}
