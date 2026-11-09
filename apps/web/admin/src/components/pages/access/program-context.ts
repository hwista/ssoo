export interface ProgramContextValue {
  userId?: string;
  organizationId?: string;
  serviceCode?: string;
}

export function readProgramContext(path: string): ProgramContextValue {
  const params = new URLSearchParams(path.split('?')[1]);
  const id = (key: string) => /^\d+$/.test(params.get(key) ?? '') ? params.get(key)! : undefined;
  const service = params.get('serviceCode') ?? '';
  return { userId: id('userId'), organizationId: id('organizationId'), serviceCode: ['crm', 'pms', 'dms', 'sns'].includes(service) ? service : undefined };
}

export function programPath(path: string, context: Record<string, string | number | undefined | null>) {
  const [base, query] = path.split('?');
  const params = new URLSearchParams(query);
  for (const [key, value] of Object.entries(context)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  return `${base}${params.size ? `?${params.toString()}` : ''}`;
}

export function periodIssue(from: string, to: string, futureEnd = false, now = Date.now()): string | null {
  const start = from ? new Date(from).getTime() : null;
  const end = to ? new Date(to).getTime() : null;
  if ((start !== null && !Number.isFinite(start)) || (end !== null && !Number.isFinite(end))) return '올바른 날짜와 시간을 입력해 주세요.';
  if (start !== null && end !== null && start >= end) return '종료일시는 시작일시보다 뒤여야 합니다.';
  if (futureEnd && end !== null && end <= now) return '종료일시가 지났습니다. 새 종료일시를 지정하거나 기한 없음을 선택해 주세요.';
  return null;
}
