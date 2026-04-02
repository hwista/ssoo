import { templateConvertService } from '@/server/services/template/TemplateConvertService';
import { templateService } from '@/server/services/template/TemplateService';
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
    return { success: false as const, error: '템플릿을 찾을 수 없습니다.' };
  }
  return { success: true as const, data: template };
}

export function handleListTemplates(headers?: Headers) {
  const userId = getUserId(headers);
  return { success: true as const, data: templateService.list(userId) };
}

export function handleListTemplatesByReferenceDocument(
  docPath: string,
  headers?: Headers,
) {
  const userId = getUserId(headers);
  return { success: true as const, data: templateService.listByReferenceDocument(docPath, userId) };
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
      summary: body.summary,
      tags: body.tags,
      createdAt: body.createdAt,
      scope: body.scope,
      kind: body.kind,
      content: body.content,
      originType: body.originType,
      referenceDocuments: body.referenceDocuments,
      generation: body.generation,
    },
    getUserId(headers),
    getUserId(headers),
  );
  return { success: true as const, data: saved };
}

export async function handleConvertToTemplate(
  body: { documentContent?: string; documentPath?: string },
  headers?: Headers,
  signal?: AbortSignal,
) {
  return templateConvertService.convertToTemplateStream(
    {
      documentContent: body.documentContent ?? '',
      documentPath: body.documentPath,
    },
    getUserId(headers),
    signal,
  );
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
