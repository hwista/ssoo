import { templateService } from '@/server/services/template/TemplateService';
import { fail, ok } from '@/server/shared/result';
import type { TemplateItem } from '@/types/template';

function getUserId(headers?: Headers): string {
  const value = headers?.get('x-dms-user-id')?.trim();
  return value && value.length > 0 ? value : 'anonymous';
}

export function handleGetTemplate(
  id: string,
  scope: 'global' | 'personal',
  headers?: Headers
) {
  const userId = getUserId(headers);
  const template = templateService.get(id, scope, userId);
  if (!template) {
    return fail('템플릿을 찾을 수 없습니다.', 404);
  }
  return ok(template);
}

export function handleListTemplates(headers?: Headers) {
  const userId = getUserId(headers);
  return ok(templateService.list(userId));
}

export function handleUpsertTemplate(
  body: Partial<TemplateItem>,
  headers?: Headers
) {
  if (!body.name || !body.scope || !body.kind || !body.content) {
    return fail('name/scope/kind/content는 필수입니다.', 400);
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
  return ok(saved);
}

export function handleDeleteTemplate(
  body: { id?: string; scope?: 'global' | 'personal' },
  headers?: Headers
) {
  if (!body.id || !body.scope) {
    return fail('id/scope는 필수입니다.', 400);
  }

  const removed = templateService.remove(body.id, body.scope, getUserId(headers));
  return removed
    ? ok({ id: body.id })
    : fail('삭제 대상 템플릿을 찾을 수 없습니다.', 404);
}
