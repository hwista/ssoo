import crypto from 'crypto';
import path from 'path';
import type { Prisma } from '@ssoo/database';
import type {
  DmsDocumentAccessRequestState,
  DmsDocumentAccessRequestStatus,
  DmsManagedDocumentSummary,
  DocumentComment,
  DocumentPermissionGrant,
  SourceFileMeta,
} from '@ssoo/types/dms';
import { resolveDocumentPresentation } from '../search/search.helpers.js';
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

export function normalizeCanonicalMetadata(
  metadata: Record<string, unknown> | null,
  owner: { userId: bigint; loginId: string; repaired: boolean; repairReason?: string },
): Record<string, unknown> {
  const next = {
    ...(metadata ?? {}),
    ownerId: owner.userId.toString(),
    ownerLoginId: owner.loginId,
    author: owner.loginId,
    lastModifiedBy: typeof metadata?.['lastModifiedBy'] === 'string' && metadata['lastModifiedBy'].trim()
      ? metadata['lastModifiedBy'].trim()
      : owner.loginId,
    visibility: isRecord(metadata?.['visibility'])
      ? metadata?.['visibility']
      : { scope: 'self' },
    grants: Array.isArray(metadata?.['grants']) ? metadata['grants'] : [],
    controlPlaneRepair: owner.repaired
      ? {
          needed: true,
          reason: owner.repairReason ?? 'owner/author normalized during control-plane sync',
          repairedAt: new Date().toISOString(),
        }
      : undefined,
  } as Record<string, unknown>;

  if (!owner.repaired) {
    delete next.controlPlaneRepair;
  }

  return next;
}

export function extractGrants(metadata: Record<string, unknown> | null): DocumentPermissionGrant[] {
  if (!Array.isArray(metadata?.['grants'])) {
    return [];
  }

  return metadata['grants'].flatMap((grant) => {
    if (!isRecord(grant)) {
      return [];
    }

    const principalId = typeof grant['principalId'] === 'string' ? grant['principalId'].trim() : '';
    const principalType = grant['principalType'];
    const role = grant['role'];
    if (!principalId || (principalType !== 'user' && principalType !== 'organization' && principalType !== 'team' && principalType !== 'group')) {
      return [];
    }
    if (role !== 'read' && role !== 'write' && role !== 'manage') {
      return [];
    }

    return [{
      principalId,
      principalType,
      role,
      expiresAt: typeof grant['expiresAt'] === 'string' ? grant['expiresAt'] : undefined,
      grantedAt: typeof grant['grantedAt'] === 'string' ? grant['grantedAt'] : undefined,
      grantedBy: typeof grant['grantedBy'] === 'string' ? grant['grantedBy'] : undefined,
      source: grant['source'] === 'request'
        || grant['source'] === 'share'
        || grant['source'] === 'migration'
        || grant['source'] === 'owner-default'
        ? grant['source']
        : undefined,
    } satisfies DocumentPermissionGrant];
  });
}

export function buildGrantSummary(grants: DocumentPermissionGrant[]) {
  const summary = {
    total: grants.length,
    read: 0,
    write: 0,
    manage: 0,
    expired: 0,
  };

  for (const grant of grants) {
    if (grant.role === 'read') summary.read += 1;
    if (grant.role === 'write') summary.write += 1;
    if (grant.role === 'manage') summary.manage += 1;
    if (grant.expiresAt && Date.parse(grant.expiresAt) < Date.now()) summary.expired += 1;
  }

  return summary;
}

export function buildRequestSummary(requests: Array<{ statusCode: string }>) {
  const summary = {
    total: requests.length,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  for (const request of requests) {
    if (request.statusCode === 'pending') summary.pending += 1;
    if (request.statusCode === 'approved') summary.approved += 1;
    if (request.statusCode === 'rejected') summary.rejected += 1;
  }

  return summary;
}

export function buildFallbackManagedDocumentSummary(
  absolutePath: string,
  relativePath: string,
  rootDir: string,
): DmsManagedDocumentSummary {
  const presentation = resolveDocumentPresentation(
    absolutePath,
    rootDir,
    path.basename(relativePath, '.md'),
  );
  return {
    documentId: `fallback:${relativePath}`,
    path: relativePath,
    documentTitle: presentation.title,
    owner: {
      userId: `unknown:${relativePath}`,
      loginId: 'unknown',
    },
    visibilityScope: 'legacy',
    syncStatusCode: 'repair_needed',
    repairReason: 'control-plane metadata sync failed',
    grants: [],
    grantSummary: buildGrantSummary([]),
    requestSummary: buildRequestSummary([]),
  };
}

export function normalizeSourceFiles(metadata: Record<string, unknown> | null): SourceFileMeta[] {
  const value = metadata?.['sourceFiles'] ?? metadata?.['referenceFiles'];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }

    const name = typeof entry['name'] === 'string' ? entry['name'].trim() : '';
    const sourcePath = typeof entry['path'] === 'string' ? entry['path'].trim() : '';
    if (!name || !sourcePath) {
      return [];
    }

    const normalizedImages = Array.isArray(entry['images'])
      ? entry['images'].flatMap((image) => {
          if (
            !isRecord(image)
            || typeof image['base64'] !== 'string'
            || typeof image['mimeType'] !== 'string'
            || typeof image['name'] !== 'string'
            || typeof image['size'] !== 'number'
          ) {
            return [];
          }

          return [{
            base64: image['base64'],
            mimeType: image['mimeType'],
            name: image['name'],
            size: image['size'],
          }];
        })
      : undefined;

    return [{
      name,
      path: sourcePath,
      type: typeof entry['type'] === 'string' ? entry['type'] : undefined,
      size: typeof entry['size'] === 'number' && Number.isFinite(entry['size']) ? entry['size'] : undefined,
      url: typeof entry['url'] === 'string' ? entry['url'] : undefined,
      storageUri: typeof entry['storageUri'] === 'string' ? entry['storageUri'] : undefined,
      provider: typeof entry['provider'] === 'string' ? entry['provider'] : undefined,
      versionId: typeof entry['versionId'] === 'string' ? entry['versionId'] : undefined,
      etag: typeof entry['etag'] === 'string' ? entry['etag'] : undefined,
      checksum: typeof entry['checksum'] === 'string' ? entry['checksum'] : undefined,
      origin: normalizeSourceFileOrigin(entry['origin']),
      status: normalizeSourceFileStatus(entry['status']),
      textContent: typeof entry['textContent'] === 'string' ? entry['textContent'] : undefined,
      storage: normalizeSourceFileStorage(entry['storage']),
      kind: normalizeSourceFileKind(entry['kind']),
      tempId: typeof entry['tempId'] === 'string' ? entry['tempId'] : undefined,
      images: normalizedImages,
    }];
  });
}

export function normalizePathHistory(
  relativePath: string,
  metadata: Record<string, unknown> | null,
): Array<{
  path: string;
  previousRelativePath?: string;
  changedAt: Date;
  reasonCode: 'create' | 'rename' | 'move' | 'reconcile';
}> {
  const rawEntries = Array.isArray(metadata?.['pathHistory']) ? metadata['pathHistory'] : [];
  const normalized = rawEntries.flatMap((entry) => {
    if (
      !isRecord(entry)
      || typeof entry['path'] !== 'string'
      || typeof entry['changedAt'] !== 'string'
    ) {
      return [];
    }

    const pathValue = entry['path'].trim();
    const changedAt = new Date(entry['changedAt']);
    if (!pathValue || Number.isNaN(changedAt.getTime())) {
      return [];
    }

    const reason = entry['reason'];
    const reasonCode: 'create' | 'rename' | 'move' | 'reconcile' = (
      reason === 'rename' || reason === 'move' || reason === 'reconcile'
        ? reason
        : 'create'
    );
    return [{
      path: pathValue,
      previousRelativePath: typeof entry['previousRelativePath'] === 'string'
        ? entry['previousRelativePath'].trim()
        : undefined,
      changedAt,
      reasonCode,
    }];
  });

  if (normalized.length > 0) {
    return normalized;
  }

  return [{
    path: relativePath,
    changedAt: new Date(),
    reasonCode: 'create',
  }];
}

export function normalizeComments(metadata: Record<string, unknown> | null): DocumentComment[] {
  const rawEntries = Array.isArray(metadata?.['comments']) ? metadata['comments'] : [];
  const seen = new Set<string>();

  return rawEntries.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }

    const id = typeof entry['id'] === 'string' ? entry['id'].trim() : '';
    const author = typeof entry['author'] === 'string' ? entry['author'].trim() : '';
    const content = typeof entry['content'] === 'string' ? entry['content'].trim() : '';
    const createdAtValue = typeof entry['createdAt'] === 'string' ? entry['createdAt'].trim() : '';
    const createdAt = new Date(createdAtValue);
    if (!id || seen.has(id) || !author || !content || Number.isNaN(createdAt.getTime())) {
      return [];
    }

    seen.add(id);

    const parentId = typeof entry['parentId'] === 'string' && entry['parentId'].trim().length > 0
      ? entry['parentId'].trim()
      : undefined;
    const deletedAtValue = typeof entry['deletedAt'] === 'string' ? entry['deletedAt'].trim() : '';
    const deletedAt = deletedAtValue ? new Date(deletedAtValue) : null;

    return [{
      id,
      author,
      content,
      createdAt: createdAt.toISOString(),
      email: typeof entry['email'] === 'string' ? entry['email'].trim() || undefined : undefined,
      avatarUrl: typeof entry['avatarUrl'] === 'string' ? entry['avatarUrl'].trim() || undefined : undefined,
      parentId,
      deletedAt: deletedAt && !Number.isNaN(deletedAt.getTime()) ? deletedAt.toISOString() : undefined,
    }];
  });
}
