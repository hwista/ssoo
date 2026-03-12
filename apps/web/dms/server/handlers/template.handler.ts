import { templateService } from '@/server/services/template/TemplateService';
import type { TemplateItem } from '@/types/template';

function getUserId(headers?: Headers): string {
  const value = headers?.get('x-dms-user-id')?.trim();
  return value && value.length > 0 ? value : 'anonymous';
}

export function handleListTemplates(headers?: Headers) {
  const userId = getUserId(headers);
  return { success: true as const, data: templateService.list(userId) };
}

export function handleUpsertTemplate(
  body: Partial<TemplateItem>,
  headers?: Headers
) {
  if (!body.name || !body.scope || !body.kind || !body.content) {
    return { success: false as const, error: 'name/scope/kind/content는 필수입니다.' };
  }

  const saved = templateService.save(
    {
      id: body.id,
      name: body.name,
      description: body.description,
      scope: body.scope,
      kind: body.kind,
      content: body.content,
    },
    getUserId(headers)
  );
  return { success: true as const, data: saved };
}

export function handleDeleteTemplate(
  body: { id?: string; scope?: 'global' | 'personal' },
  headers?: Headers
) {
  if (!body.id || !body.scope) {
    return { success: false as const, error: 'id/scope는 필수입니다.' };
  }

  const removed = templateService.remove(body.id, body.scope, getUserId(headers));
  return removed
    ? { success: true as const, data: { id: body.id } }
    : { success: false as const, error: '삭제 대상 템플릿을 찾을 수 없습니다.' };
}
