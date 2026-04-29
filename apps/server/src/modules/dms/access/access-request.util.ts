import crypto from 'crypto';
import type { Prisma } from '@ssoo/database';
import type {
  DmsDocumentAccessRequestState,
  DmsDocumentAccessRequestStatus,
  DocumentPermissionGrant,
  SourceFileMeta,
} from '@ssoo/types/dms';
import type {
  AccessRequestGrantRecord,
  AccessRequestRecord,
} from './access-request.service.js';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeOptionalText(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function toIsoString(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString() : undefined;
}

export function buildContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function toRequestState(record: AccessRequestRecord): DmsDocumentAccessRequestState {
  return {
    requestId: record.accessRequestId.toString(),
    status: record.statusCode as DmsDocumentAccessRequestStatus,
    requestedAt: record.createdAt.toISOString(),
    requestMessage: record.requestMessage ?? undefined,
    requestedExpiresAt: toIsoString(record.requestedExpiresAt),
    respondedAt: toIsoString(record.respondedAt),
    responseMessage: record.responseMessage ?? undefined,
  };
}

export function extractVisibilityScope(metadata: Record<string, unknown> | null) {
  const visibility = metadata?.['visibility'];
  if (
    isRecord(visibility)
    && (visibility.scope === 'public' || visibility.scope === 'organization' || visibility.scope === 'self')
  ) {
    return visibility.scope;
  }

  return 'self';
}

export function extractTargetOrgId(metadata: Record<string, unknown> | null) {
  const visibility = metadata?.['visibility'];
  if (!isRecord(visibility) || typeof visibility.targetOrgId !== 'string') {
    return null;
  }

  const trimmed = visibility.targetOrgId.trim();
  return /^\d+$/.test(trimmed) ? BigInt(trimmed) : null;
}

export function extractRevisionSeq(metadata: Record<string, unknown> | null) {
  return typeof metadata?.['revisionSeq'] === 'number'
    ? metadata['revisionSeq']
    : undefined;
}

export function extractContentHash(metadata: Record<string, unknown> | null) {
  return typeof metadata?.['contentHash'] === 'string' && metadata['contentHash'].trim()
    ? metadata['contentHash'].trim()
    : undefined;
}

export function mergeCanonicalMetadataSource(
  persistedMetadataJson: Prisma.JsonValue | null | undefined,
  metadataOverride?: Record<string, unknown> | null,
): Record<string, unknown> | null {
  const persistedMetadata = isRecord(persistedMetadataJson) ? persistedMetadataJson : null;
  const merged = {
    ...(persistedMetadata ?? {}),
    ...(metadataOverride ?? {}),
  };

  return Object.keys(merged).length > 0 ? merged : null;
}

export function normalizeSourceFileOrigin(value: unknown): SourceFileMeta['origin'] | undefined {
  return value === 'manual'
    || value === 'ingest'
    || value === 'teams'
    || value === 'network_drive'
    || value === 'reference'
    || value === 'template'
    || value === 'picker'
    || value === 'assistant'
    || value === 'current-document'
    || value === 'template-selected'
    ? value
    : undefined;
}

export function normalizeSourceFileStatus(value: unknown): SourceFileMeta['status'] | undefined {
  return value === 'draft' || value === 'pending_confirm' || value === 'published'
    ? value
    : undefined;
}

export function normalizeSourceFileStorage(value: unknown): SourceFileMeta['storage'] | undefined {
  return value === 'path' || value === 'inline' ? value : undefined;
}

export function normalizeSourceFileKind(value: unknown): SourceFileMeta['kind'] | undefined {
  return value === 'document' || value === 'file' ? value : undefined;
}

export function toSourceFileProjectionJson(sourceFile: SourceFileMeta): Prisma.InputJsonValue | undefined {
  const projection = {
    ...(sourceFile.tempId ? { tempId: sourceFile.tempId } : {}),
    ...(sourceFile.textContent ? { textContent: sourceFile.textContent } : {}),
    ...(sourceFile.images ? { images: sourceFile.images } : {}),
  };

  return Object.keys(projection).length > 0
    ? JSON.parse(JSON.stringify(projection)) as Prisma.InputJsonValue
    : undefined;
}

export function toDocumentPermissionGrant(grant: AccessRequestGrantRecord): DocumentPermissionGrant | null {
  if (
    !grant.principalRef
    || (grant.principalType !== 'user'
      && grant.principalType !== 'organization'
      && grant.principalType !== 'team'
      && grant.principalType !== 'group')
    || (grant.roleCode !== 'read' && grant.roleCode !== 'write' && grant.roleCode !== 'manage')
  ) {
    return null;
  }

  return {
    grantId: grant.documentGrantId?.toString(),
    principalId: grant.principalRef,
    principalType: grant.principalType,
    role: grant.roleCode,
    expiresAt: toIsoString(grant.expiresAt),
    grantedAt: grant.grantedAt?.toISOString(),
    source: grant.grantSourceCode === 'request'
      || grant.grantSourceCode === 'share'
      || grant.grantSourceCode === 'migration'
      || grant.grantSourceCode === 'owner-default'
      ? grant.grantSourceCode
      : undefined,
  };
}
