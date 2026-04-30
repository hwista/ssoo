import path from 'path';
import type { Prisma } from '@ssoo/database';
import type {
  BodyLink,
  DocumentAcl,
  DocumentComment,
  DocumentMetadata,
  DocumentPathHistoryEntry,
  DocumentPermissionGrant,
  FileNode,
  SourceFileMeta,
} from '@ssoo/types/dms';
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { normalizePath } from '../runtime/path-utils.js';

const DOCUMENT_CONTROL_PLANE_SELECT = {
  documentId: true,
  relativePath: true,
  documentStatusCode: true,
  isActive: true,
  visibilityScope: true,
  targetOrgId: true,
  ownerUserId: true,
  revisionSeq: true,
  contentHash: true,
  metadataJson: true,
  createdAt: true,
  updatedAt: true,
  ownerUser: {
    select: {
      id: true,
      userName: true,
      displayName: true,
      authAccount: {
        select: {
          loginId: true,
        },
      },
    },
  },
  grants: {
    where: {
      isActive: true,
      revokedAt: null,
    },
    select: {
      principalType: true,
      principalRef: true,
      roleCode: true,
      expiresAt: true,
      grantedAt: true,
      grantSourceCode: true,
    },
    orderBy: [
      { grantedAt: 'asc' as const },
      { documentGrantId: 'asc' as const },
    ],
  },
  sourceFiles: {
    where: {
      isActive: true,
    },
    select: {
      sourceName: true,
      sourcePath: true,
      mediaType: true,
      fileSize: true,
      url: true,
      storageUri: true,
      providerCode: true,
      versionId: true,
      etag: true,
      checksum: true,
      originCode: true,
      statusCode: true,
      storageMode: true,
      kindCode: true,
      sortOrder: true,
      projectionJson: true,
    },
    orderBy: [
      { sortOrder: 'asc' as const },
      { sourceFileId: 'asc' as const },
    ],
  },
  pathHistoryEntries: {
    where: {
      isActive: true,
    },
    select: {
      relativePath: true,
      changedAt: true,
      changedByUserId: true,
      reasonCode: true,
    },
    orderBy: [
      { changedAt: 'asc' as const },
      { pathHistoryId: 'asc' as const },
    ],
  },
  comments: {
    where: {
      isActive: true,
    },
    select: {
      commentKey: true,
      parentCommentKey: true,
      commentContent: true,
      authorName: true,
      authorEmail: true,
      avatarUrl: true,
      commentCreatedAt: true,
      commentDeletedAt: true,
      sortOrder: true,
    },
    orderBy: [
      { sortOrder: 'asc' as const },
      { commentId: 'asc' as const },
    ],
  },
} satisfies Prisma.DmsDocumentSelect;

export type ControlPlaneDocument = Prisma.DmsDocumentGetPayload<{
  select: typeof DOCUMENT_CONTROL_PLANE_SELECT;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function pickString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function pickStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const normalized = pickString(entry);
    return normalized ? [normalized] : [];
  });
}

function normalizeRelativePath(input: string): string {
  return normalizePath(path.normalize(input).replace(/^[/\\]+/, ''));
}

function normalizeAcl(value: unknown, ownerId?: string, ownerLoginId?: string): DocumentAcl {
  const metadataAcl = isRecord(value) ? value : {};
  const owners = Array.isArray(metadataAcl['owners'])
    ? pickStringArray(metadataAcl['owners'])
    : [];
  if (owners.length === 0) {
    if (ownerId) owners.push(ownerId);
    if (ownerLoginId) owners.push(ownerLoginId);
  }

  return {
    owners,
    editors: Array.isArray(metadataAcl['editors']) ? pickStringArray(metadataAcl['editors']) : [],
    viewers: Array.isArray(metadataAcl['viewers']) ? pickStringArray(metadataAcl['viewers']) : [],
  };
}

function normalizeBodyLinks(value: unknown): BodyLink[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }

    const url = pickString(entry['url']);
    const label = pickString(entry['label']);
    const type = entry['type'];
    if (!url || !label || (type !== 'link' && type !== 'image')) {
      return [];
    }

    return [{ url, label, type }];
  });
}

function normalizeComments(value: unknown): DocumentComment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }

    const id = pickString(entry['id']);
    const author = pickString(entry['author']);
    const content = pickString(entry['content']);
    const createdAt = pickString(entry['createdAt']);
    if (!id || !author || !content || !createdAt) {
      return [];
    }

    return [{
      id,
      author,
      content,
      createdAt,
      email: pickString(entry['email']),
      avatarUrl: pickString(entry['avatarUrl']),
      parentId: pickString(entry['parentId']),
      deletedAt: pickString(entry['deletedAt']),
    }];
  });
}

function normalizePathHistory(value: unknown): DocumentPathHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }

    const pathValue = pickString(entry['path']);
    const changedAt = pickString(entry['changedAt']);
    if (!pathValue || !changedAt) {
      return [];
    }

    const reason = entry['reason'];
    return [{
      path: pathValue,
      changedAt,
      changedBy: pickString(entry['changedBy']),
      reason: reason === 'create' || reason === 'rename' || reason === 'move' || reason === 'reconcile'
        ? reason
        : undefined,
    }];
  });
}

function normalizeMetadataGrants(value: unknown): DocumentPermissionGrant[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }

    const principalId = pickString(entry['principalId']);
    const principalType = entry['principalType'];
    const role = entry['role'];
    if (
      !principalId
      || (principalType !== 'user' && principalType !== 'organization' && principalType !== 'team' && principalType !== 'group')
      || (role !== 'read' && role !== 'write' && role !== 'manage')
    ) {
      return [];
    }

    const source = entry['source'];
    return [{
      principalId,
      principalType,
      role,
      expiresAt: pickString(entry['expiresAt']),
      grantedAt: pickString(entry['grantedAt']),
      grantedBy: pickString(entry['grantedBy']),
      source: source === 'request' || source === 'share' || source === 'migration' || source === 'owner-default'
        ? source
        : undefined,
    }];
  });
}

function mapGrantRows(grants: ControlPlaneDocument['grants']): DocumentPermissionGrant[] {
  return grants.flatMap((grant) => {
    const principalType = grant.principalType;
    const role = grant.roleCode;
    if (
      (principalType !== 'user' && principalType !== 'organization' && principalType !== 'team' && principalType !== 'group')
      || (role !== 'read' && role !== 'write' && role !== 'manage')
    ) {
      return [];
    }

    const source = grant.grantSourceCode;
    return [{
      principalId: grant.principalRef,
      principalType,
      role,
      expiresAt: grant.expiresAt?.toISOString(),
      grantedAt: grant.grantedAt.toISOString(),
      source: source === 'request' || source === 'share' || source === 'migration' || source === 'owner-default'
        ? source
        : undefined,
    }];
  });
}

function mapSourceFileRows(sourceFiles: ControlPlaneDocument['sourceFiles']): SourceFileMeta[] {
  return sourceFiles.map((sourceFile) => {
    const projection = toRecord(sourceFile.projectionJson);
    const images = Array.isArray(projection['images']) ? projection['images'] : undefined;

    return {
      name: sourceFile.sourceName,
      path: sourceFile.sourcePath,
      type: sourceFile.mediaType ?? undefined,
      size: sourceFile.fileSize ?? undefined,
      url: sourceFile.url ?? undefined,
      storageUri: sourceFile.storageUri ?? undefined,
      provider: sourceFile.providerCode ?? undefined,
      versionId: sourceFile.versionId ?? undefined,
      etag: sourceFile.etag ?? undefined,
      checksum: sourceFile.checksum ?? undefined,
      origin: pickString(sourceFile.originCode) as SourceFileMeta['origin'],
      status: pickString(sourceFile.statusCode) as SourceFileMeta['status'],
      storage: pickString(sourceFile.storageMode) as SourceFileMeta['storage'],
      kind: pickString(sourceFile.kindCode) as SourceFileMeta['kind'],
      tempId: pickString(projection['tempId']),
      textContent: pickString(projection['textContent']),
      images: Array.isArray(images) ? images as SourceFileMeta['images'] : undefined,
    };
  });
}

function mapPathHistoryRows(entries: ControlPlaneDocument['pathHistoryEntries']): DocumentPathHistoryEntry[] {
  return entries.map((entry) => ({
    path: entry.relativePath,
    changedAt: entry.changedAt.toISOString(),
    changedBy: entry.changedByUserId?.toString(),
    reason: entry.reasonCode === 'create' || entry.reasonCode === 'rename' || entry.reasonCode === 'move' || entry.reasonCode === 'reconcile'
      ? entry.reasonCode
      : undefined,
  }));
}

function mapCommentRows(entries: ControlPlaneDocument['comments']): DocumentComment[] {
  return entries.map((entry) => ({
    id: entry.commentKey,
    author: entry.authorName,
    content: entry.commentContent,
    createdAt: entry.commentCreatedAt.toISOString(),
    email: entry.authorEmail ?? undefined,
    avatarUrl: entry.avatarUrl ?? undefined,
    parentId: entry.parentCommentKey ?? undefined,
    deletedAt: entry.commentDeletedAt?.toISOString(),
  }));
}

interface MutableDirectoryNode {
  type: 'directory';
  name: string;
  path: string;
  children: Map<string, MutableDirectoryNode | FileNode>;
}

@Injectable()
export class DocumentControlPlaneService {
  private readonly metadataCache = new Map<string, DocumentMetadata>();

  constructor(private readonly db: DatabaseService) {}

  async refreshCache(): Promise<void> {
    const documents = await this.listActiveDocuments();
    this.metadataCache.clear();
    for (const document of documents) {
      this.metadataCache.set(document.relativePath, this.projectMetadata(document));
    }
  }

  getCachedMetadataByRelativePath(relativePath: string): DocumentMetadata | null {
    const normalized = normalizeRelativePath(relativePath);
    return this.metadataCache.get(normalized) ?? null;
  }

  clearCachedMetadataByRelativePath(relativePath: string): void {
    const normalized = normalizeRelativePath(relativePath);
    this.metadataCache.delete(normalized);
  }

  async listActiveDocuments(): Promise<ControlPlaneDocument[]> {
    return this.db.client.dmsDocument.findMany({
      where: {
        isActive: true,
        documentStatusCode: 'active',
      },
      select: DOCUMENT_CONTROL_PLANE_SELECT,
      orderBy: {
        relativePath: 'asc',
      },
    });
  }

  async getProjectedMetadataByRelativePath(relativePath: string): Promise<DocumentMetadata | null> {
    const normalized = normalizeRelativePath(relativePath);
    const cached = this.metadataCache.get(normalized);
    if (cached) {
      return cached;
    }

    const document = await this.db.client.dmsDocument.findFirst({
      where: {
        relativePath: normalized,
      },
      select: DOCUMENT_CONTROL_PLANE_SELECT,
    });
    if (!document || document.documentStatusCode !== 'active' || !document.isActive) {
      return null;
    }

    const projected = this.projectMetadata(document);
    this.metadataCache.set(normalized, projected);
    return projected;
  }

  async refreshProjectedMetadataByRelativePath(relativePath: string): Promise<DocumentMetadata | null> {
    const normalized = normalizeRelativePath(relativePath);
    this.metadataCache.delete(normalized);
    return this.getProjectedMetadataByRelativePath(normalized);
  }

  buildFileTree(documents: Array<Pick<DocumentMetadata, 'relativePath' | 'title'>>): FileNode[] {
    const rootChildren = new Map<string, MutableDirectoryNode | FileNode>();

    for (const document of documents) {
      const relativePath = pickString(document.relativePath);
      if (!relativePath) {
        continue;
      }

      const segments = normalizeRelativePath(relativePath).split('/').filter(Boolean);
      if (segments.length === 0) {
        continue;
      }

      let currentChildren = rootChildren;
      let currentPath = '';
      for (const segment of segments.slice(0, -1)) {
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
        const existing = currentChildren.get(segment);
        if (existing && existing.type === 'directory' && existing.children instanceof Map) {
          currentChildren = existing.children;
          continue;
        }

        const nextDirectory: MutableDirectoryNode = {
          type: 'directory',
          name: segment,
          path: currentPath,
          children: new Map(),
        };
        currentChildren.set(segment, nextDirectory);
        currentChildren = nextDirectory.children;
      }

      const fileName = segments[segments.length - 1];
      currentChildren.set(fileName, {
        type: 'file',
        name: fileName,
        path: normalizeRelativePath(relativePath),
        ...(document.title ? { title: document.title } : {}),
      });
    }

    return this.sortNodes(Array.from(rootChildren.values()).map((node) => this.materializeNode(node)));
  }

  projectMetadata(document: ControlPlaneDocument): DocumentMetadata {
    const metadata = toRecord(document.metadataJson);
    const ownerLoginId = document.ownerUser.authAccount?.loginId
      ?? pickString(metadata['ownerLoginId'])
      ?? document.ownerUser.userName;
    const author = pickString(metadata['author']) ?? ownerLoginId;
    const lastModifiedBy = pickString(metadata['lastModifiedBy']) ?? author;
    const grants = document.grants.length > 0
      ? mapGrantRows(document.grants)
      : normalizeMetadataGrants(metadata['grants']);
    const sourceFiles = document.sourceFiles.length > 0
      ? mapSourceFileRows(document.sourceFiles)
      : this.normalizeMetadataSourceFiles(metadata['sourceFiles'] ?? metadata['referenceFiles']);
    const pathHistory = document.pathHistoryEntries.length > 0
      ? mapPathHistoryRows(document.pathHistoryEntries)
      : normalizePathHistory(metadata['pathHistory']);
    const fileHashesValue = isRecord(metadata['fileHashes']) ? metadata['fileHashes'] : {};
    const fileHashesSources = isRecord(fileHashesValue['sources']) ? fileHashesValue['sources'] : {};

    return {
      documentId: document.documentId.toString(),
      title: pickString(metadata['title']) ?? path.basename(document.relativePath, '.md'),
      summary: pickString(metadata['summary']) ?? '',
      tags: pickStringArray(metadata['tags']),
      sourceLinks: pickStringArray(metadata['sourceLinks']),
      bodyLinks: normalizeBodyLinks(metadata['bodyLinks']),
      createdAt: pickString(metadata['createdAt']) ?? document.createdAt.toISOString(),
      updatedAt: pickString(metadata['updatedAt']) ?? document.updatedAt.toISOString(),
      relativePath: document.relativePath,
      pathHistory,
      visibility: document.visibilityScope === 'public' || document.visibilityScope === 'organization' || document.visibilityScope === 'self'
        ? {
            scope: document.visibilityScope,
            targetOrgId: document.targetOrgId?.toString(),
          }
        : undefined,
      grants,
      revisionSeq: document.revisionSeq,
      contentHash: document.contentHash,
      fileHashes: {
        content: document.contentHash,
        sources: Object.fromEntries(
          Object.entries(fileHashesSources)
            .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim().length > 0)
            .map(([key, value]) => [key, value.trim()]),
        ),
      },
      chunkIds: pickStringArray(metadata['chunkIds']),
      embeddingModel: pickString(metadata['embeddingModel']) ?? '',
      sourceFiles,
      acl: normalizeAcl(metadata['acl'], document.ownerUserId.toString(), ownerLoginId),
      comments: document.comments.length > 0
        ? mapCommentRows(document.comments)
        : normalizeComments(metadata['comments']),
      templateId: pickString(metadata['templateId']) ?? '',
      author,
      lastModifiedBy,
      ownerId: document.ownerUserId.toString(),
      ownerLoginId,
    };
  }

  private normalizeMetadataSourceFiles(value: unknown): SourceFileMeta[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((entry) => {
      if (!isRecord(entry)) {
        return [];
      }

      const name = pickString(entry['name']);
      const filePath = pickString(entry['path']);
      if (!name || !filePath) {
        return [];
      }

      return [{
        name,
        path: filePath,
        type: pickString(entry['type']),
        size: typeof entry['size'] === 'number' && Number.isFinite(entry['size']) ? entry['size'] : undefined,
        url: pickString(entry['url']),
        storageUri: pickString(entry['storageUri']),
        provider: pickString(entry['provider']),
        versionId: pickString(entry['versionId']),
        etag: pickString(entry['etag']),
        checksum: pickString(entry['checksum']),
        origin: pickString(entry['origin']) as SourceFileMeta['origin'],
        status: pickString(entry['status']) as SourceFileMeta['status'],
        textContent: pickString(entry['textContent']),
        storage: pickString(entry['storage']) as SourceFileMeta['storage'],
        kind: pickString(entry['kind']) as SourceFileMeta['kind'],
        tempId: pickString(entry['tempId']),
        images: Array.isArray(entry['images']) ? entry['images'] as SourceFileMeta['images'] : undefined,
      }];
    });
  }

  private materializeNode(node: MutableDirectoryNode | FileNode): FileNode {
    if (node.type === 'file') {
      return node;
    }

    if (!(node.children instanceof Map)) {
      return node as FileNode;
    }

    return {
      type: 'directory',
      name: node.name,
      path: node.path,
      children: this.sortNodes(Array.from(node.children.values()).map((child) => this.materializeNode(child))),
    };
  }

  private sortNodes(nodes: FileNode[]): FileNode[] {
    return nodes.sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === 'directory' ? -1 : 1;
      }
      return left.path.localeCompare(right.path);
    });
  }
}
