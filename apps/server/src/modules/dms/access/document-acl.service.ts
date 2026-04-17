import fs from 'fs';
import path from 'path';
import { ForbiddenException, Injectable } from '@nestjs/common';
import type {
  DocumentAcl,
  DocumentPermissionGrant,
  FileNode,
  SearchResultItem,
} from '@ssoo/types/dms';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { contentService } from '../runtime/content.service.js';
import { configService } from '../runtime/dms-config.service.js';
import { normalizePath } from '../runtime/path-utils.js';
import { listMarkdownFiles, resolveAbsolutePath } from '../search/search.helpers.js';

const EMPTY_DOCUMENT_ACL: DocumentAcl = {
  owners: [],
  editors: [],
  viewers: [],
};

interface DocumentAccessState {
  owner?: string;
  visibilityScope?: SearchResultItem['visibilityScope'];
  isOwner: boolean;
  isReadable: boolean;
  isWritable: boolean;
  isManageable: boolean;
  canRequestRead: boolean;
}

type DocumentAssetPermissionMode = 'read' | 'write' | 'manage';
type DocumentPrincipalType = DocumentPermissionGrant['principalType'];

@Injectable()
export class DocumentAclService {
  buildOwnerAcl(user: TokenPayload): DocumentAcl {
    const owner = user.userId.trim() || user.loginId.trim();
    return {
      owners: owner ? [owner] : [],
      editors: [],
      viewers: [],
    };
  }

  assertCanReadAbsolutePath(user: TokenPayload, absolutePath: string): void {
    if (this.isReadableAbsolutePath(user, absolutePath)) {
      return;
    }

    throw new ForbiddenException('문서를 읽을 권한이 없습니다.');
  }

  assertCanWriteAbsolutePath(user: TokenPayload, absolutePath: string): void {
    if (this.isWritableAbsolutePath(user, absolutePath)) {
      return;
    }

    throw new ForbiddenException('문서를 수정할 권한이 없습니다.');
  }

  assertCanManageAbsolutePath(user: TokenPayload, absolutePath: string): void {
    if (this.isManageableAbsolutePath(user, absolutePath)) {
      return;
    }

    throw new ForbiddenException('문서를 관리할 권한이 없습니다.');
  }

  isReadableAbsolutePath(
    user: TokenPayload,
    absolutePath: string,
    cache: Map<string, boolean> = new Map(),
  ): boolean {
    const cacheKey = normalizePath(absolutePath);
    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const readable = this.computeReadableAbsolutePath(user, absolutePath, cache);
    cache.set(cacheKey, readable);
    return readable;
  }

  isWritableAbsolutePath(user: TokenPayload, absolutePath: string): boolean {
    if (!/\.md$/i.test(absolutePath)) {
      return this.canAccessAssetPath(user, absolutePath, 'write');
    }

    const sidecar = contentService.readSidecar(absolutePath);
    return this.resolveDocumentAccessState(user, sidecar).isWritable;
  }

  isManageableAbsolutePath(user: TokenPayload, absolutePath: string): boolean {
    if (!/\.md$/i.test(absolutePath)) {
      return this.canAccessAssetPath(user, absolutePath, 'manage');
    }

    const sidecar = contentService.readSidecar(absolutePath);
    return this.resolveDocumentAccessState(user, sidecar).isManageable;
  }

  describeSearchResultAccess(user: TokenPayload, absolutePath: string): Pick<
    SearchResultItem,
    'owner' | 'visibilityScope' | 'isReadable' | 'canRequestRead'
  > {
    const state = this.resolveDocumentAccessState(user, contentService.readSidecar(absolutePath));
    return {
      owner: state.owner,
      visibilityScope: state.visibilityScope,
      isReadable: state.isReadable,
      canRequestRead: state.canRequestRead,
    };
  }

  filterFileTree(user: TokenPayload, nodes: FileNode[]): FileNode[] {
    const cache = new Map<string, boolean>();
    const rootDir = this.getRootDir();
    return this.filterNodes(user, nodes, rootDir, cache);
  }

  filterSearchResults(
    user: TokenPayload,
    results: SearchResultItem[],
    rootDir: string,
  ): SearchResultItem[] {
    const cache = new Map<string, boolean>();
    return results.filter((result) => (
      result.path.trim().length > 0
      && this.isReadableAbsolutePath(
        user,
        resolveAbsolutePath(result.path, rootDir),
        cache,
      )
    ));
  }

  private getRootDir(): string {
    return configService.getDocDir();
  }

  private filterNodes(
    user: TokenPayload,
    nodes: FileNode[],
    rootDir: string,
    cache: Map<string, boolean>,
  ): FileNode[] {
    const filteredNodes: FileNode[] = [];

    for (const node of nodes) {
      if (node.type === 'directory') {
        const children = node.children
          ? this.filterNodes(user, node.children, rootDir, cache)
          : [];

        if (children.length > 0) {
          filteredNodes.push({
            ...node,
            children,
          });
        }
        continue;
      }

      const absolutePath = resolveAbsolutePath(node.path, rootDir);
      if (this.isReadableAbsolutePath(user, absolutePath, cache)) {
        filteredNodes.push(node);
      }
    }

    return filteredNodes;
  }

  private computeReadableAbsolutePath(
    user: TokenPayload,
    absolutePath: string,
    cache: Map<string, boolean>,
  ): boolean {
    if (/\.md$/i.test(absolutePath)) {
      const sidecar = contentService.readSidecar(absolutePath);
      return this.resolveDocumentAccessState(user, sidecar).isReadable;
    }

    return this.canAccessAssetPath(user, absolutePath, 'read', cache);
  }

  private canAccessAssetPath(
    user: TokenPayload,
    absolutePath: string,
    mode: DocumentAssetPermissionMode,
    cache: Map<string, boolean> = new Map(),
  ): boolean {
    const rootDir = this.getRootDir();
    const relativePath = normalizePath(path.relative(rootDir, absolutePath));
    if (relativePath.startsWith('..')) {
      return false;
    }

    const markdownFiles = listMarkdownFiles(rootDir);
    for (const markdownFile of markdownFiles) {
      if (!this.documentReferencesAsset(markdownFile, relativePath)) {
        continue;
      }

      if (this.isAccessibleDocumentForAsset(user, markdownFile, mode, cache)) {
        return true;
      }
    }

    return false;
  }

  private isAccessibleDocumentForAsset(
    user: TokenPayload,
    markdownFilePath: string,
    mode: DocumentAssetPermissionMode,
    cache: Map<string, boolean>,
  ): boolean {
    if (mode === 'write') {
      return this.isWritableAbsolutePath(user, markdownFilePath);
    }

    if (mode === 'manage') {
      return this.isManageableAbsolutePath(user, markdownFilePath);
    }

    return this.isReadableAbsolutePath(user, markdownFilePath, cache);
  }

  private documentReferencesAsset(markdownFilePath: string, assetRelativePath: string): boolean {
    const normalizedAssetPath = this.normalizeAssetReference(assetRelativePath);
    if (!normalizedAssetPath) {
      return false;
    }

    try {
      const sidecar = contentService.readSidecar(markdownFilePath);
      const structuredReferences = new Set(
        [
          ...this.collectSourceFilePaths(sidecar),
          ...this.collectBodyLinkUrls(sidecar),
        ]
          .map((candidate) => this.normalizeAssetReference(candidate))
          .filter((candidate) => candidate.length > 0),
      );
      if (structuredReferences.has(normalizedAssetPath)) {
        return true;
      }

      const content = normalizePath(fs.readFileSync(markdownFilePath, 'utf-8'));
      return content.includes(normalizedAssetPath);
    } catch {
      return false;
    }
  }

  private collectSourceFilePaths(sidecarValue: unknown): string[] {
    if (!sidecarValue || typeof sidecarValue !== 'object') {
      return [];
    }

    const sourceFiles = (sidecarValue as { sourceFiles?: unknown }).sourceFiles;
    if (!Array.isArray(sourceFiles)) {
      return [];
    }

    return sourceFiles.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') {
        return [];
      }

      const filePath = (entry as { path?: unknown }).path;
      return typeof filePath === 'string' && filePath.trim().length > 0
        ? [filePath.trim()]
        : [];
    });
  }

  private collectBodyLinkUrls(sidecarValue: unknown): string[] {
    if (!sidecarValue || typeof sidecarValue !== 'object') {
      return [];
    }

    const bodyLinks = (sidecarValue as { bodyLinks?: unknown }).bodyLinks;
    if (!Array.isArray(bodyLinks)) {
      return [];
    }

    return bodyLinks.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') {
        return [];
      }

      const url = (entry as { url?: unknown }).url;
      return typeof url === 'string' && url.trim().length > 0
        ? [url.trim()]
        : [];
    });
  }

  private normalizeAssetReference(value: string): string {
    return normalizePath(
      value
        .trim()
        .replace(/^(\.\/)+/, '')
        .replace(/^\/+/, ''),
    );
  }

  private resolveDocumentAccessState(user: TokenPayload, sidecarValue: unknown): DocumentAccessState {
    const sidecar = this.normalizeSidecar(sidecarValue);
    const acl = sidecar.acl;
    const legacyAclRead = this.hasAclEntries(acl)
      ? this.matchesAcl(user, [...acl.owners, ...acl.editors, ...acl.viewers])
      : false;
    const legacyAclWrite = this.hasAclEntries(acl)
      ? this.matchesAcl(user, [...acl.owners, ...acl.editors])
      : false;
    const legacyAclManage = this.hasAclEntries(acl)
      ? this.matchesAcl(user, acl.owners)
      : false;
    const isOwner = this.matchesAcl(user, [
      ...acl.owners,
      ...(sidecar.ownerId ? [sidecar.ownerId] : []),
      ...(sidecar.ownerLoginId ? [sidecar.ownerLoginId] : []),
    ]);
    const activePrincipalGrants = sidecar.grants.filter((grant) => this.matchesGrant(user, grant));
    const hasReadGrant = activePrincipalGrants.some((grant) => (
      grant.role === 'read' || grant.role === 'write' || grant.role === 'manage'
    ));
    const hasWriteGrant = activePrincipalGrants.some((grant) => (
      grant.role === 'write' || grant.role === 'manage'
    ));
    const hasManageGrant = activePrincipalGrants.some((grant) => grant.role === 'manage');
    const hasModernAccessConfig = Boolean(
      sidecar.ownerId
      || sidecar.ownerLoginId
      || sidecar.visibilityScope
      || sidecar.grants.length > 0,
    );
    const isLegacyOpen = !hasModernAccessConfig && !this.hasAclEntries(acl);
    const visibilityReadable = this.isVisibilityReadable(
      user,
      sidecar.visibilityScope,
      sidecar.visibilityTargetOrgId,
    );

    const isReadable = isOwner || hasReadGrant || legacyAclRead || visibilityReadable || isLegacyOpen;
    const isWritable = isOwner || hasWriteGrant || legacyAclWrite || isLegacyOpen;
    const isManageable = isOwner || hasManageGrant || legacyAclManage || isLegacyOpen;

    return {
      owner: sidecar.author || sidecar.ownerLoginId,
      visibilityScope: sidecar.visibilityScope ?? 'legacy',
      isOwner,
      isReadable,
      isWritable,
      isManageable,
      canRequestRead: !isReadable && !isOwner,
    };
  }

  private normalizeSidecar(value: unknown): {
    acl: DocumentAcl;
    author?: string;
    ownerId?: string;
    ownerLoginId?: string;
    visibilityScope?: SearchResultItem['visibilityScope'];
    visibilityTargetOrgId?: string;
    grants: DocumentPermissionGrant[];
  } {
    if (!value || typeof value !== 'object') {
      return {
        acl: EMPTY_DOCUMENT_ACL,
        grants: [],
      };
    }

    const sidecar = value as Record<string, unknown>;
    const visibility = sidecar['visibility'];
    const visibilityTargetOrgId = (
      visibility
      && typeof visibility === 'object'
      && visibility !== null
      && typeof (visibility as Record<string, unknown>)['targetOrgId'] === 'string'
    )
      ? ((visibility as Record<string, unknown>)['targetOrgId'] as string).trim()
      : '';

    return {
      acl: this.normalizeAcl(sidecar['acl']),
      author: typeof sidecar['author'] === 'string' && sidecar['author'].trim().length > 0
        ? sidecar['author'].trim()
        : undefined,
      ownerId: typeof sidecar['ownerId'] === 'string' && sidecar['ownerId'].trim().length > 0
        ? sidecar['ownerId'].trim()
        : undefined,
      ownerLoginId: typeof sidecar['ownerLoginId'] === 'string' && sidecar['ownerLoginId'].trim().length > 0
        ? sidecar['ownerLoginId'].trim()
        : undefined,
      visibilityTargetOrgId: visibilityTargetOrgId.length > 0 ? visibilityTargetOrgId : undefined,
      visibilityScope: (
        visibility
        && typeof visibility === 'object'
        && visibility !== null
        && (visibility as Record<string, unknown>)['scope'] === 'public'
      ) ? 'public' : (
        visibility
        && typeof visibility === 'object'
        && visibility !== null
        && (visibility as Record<string, unknown>)['scope'] === 'organization'
      ) ? 'organization' : (
        visibility
        && typeof visibility === 'object'
        && visibility !== null
        && (visibility as Record<string, unknown>)['scope'] === 'self'
      ) ? 'self' : undefined,
      grants: this.normalizePermissionGrants(sidecar['grants']),
    };
  }

  private normalizeAcl(value: unknown): DocumentAcl {
    if (!value || typeof value !== 'object') {
      return EMPTY_DOCUMENT_ACL;
    }

    const aclValue = value as {
      owners?: unknown;
      editors?: unknown;
      viewers?: unknown;
    };

    return {
      owners: this.normalizeAclEntries(aclValue.owners),
      editors: this.normalizeAclEntries(aclValue.editors),
      viewers: this.normalizeAclEntries(aclValue.viewers),
    };
  }

  private normalizeAclEntries(entries: unknown): string[] {
    if (!Array.isArray(entries)) {
      return [];
    }

    return Array.from(
      new Set(
        entries
          .filter((entry): entry is string => typeof entry === 'string')
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0),
      ),
    );
  }

  private hasAclEntries(acl: DocumentAcl): boolean {
    return acl.owners.length > 0 || acl.editors.length > 0 || acl.viewers.length > 0;
  }

  private matchesAcl(user: TokenPayload, subjects: string[]): boolean {
    const principals = this.collectAllPrincipalIds(user);

    return this.normalizePrincipalIds(subjects).some((subject) => principals.has(subject));
  }

  private normalizePermissionGrants(value: unknown): DocumentPermissionGrant[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') {
        return [];
      }

      const grant = entry as Record<string, unknown>;
      const principalId = typeof grant['principalId'] === 'string' ? grant['principalId'].trim() : '';
      const principalType = grant['principalType'];
      const role = grant['role'];
      if (
        principalId.length === 0
        || (principalType !== 'user' && principalType !== 'organization' && principalType !== 'team' && principalType !== 'group')
        || (role !== 'read' && role !== 'write' && role !== 'manage')
      ) {
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
      }];
    });
  }

  private matchesGrant(user: TokenPayload, grant: DocumentPermissionGrant): boolean {
    if (grant.expiresAt && Date.parse(grant.expiresAt) < Date.now()) {
      return false;
    }

    return this.matchesPrincipal(user, grant.principalType, grant.principalId);
  }

  private isVisibilityReadable(
    user: TokenPayload,
    visibilityScope?: SearchResultItem['visibilityScope'],
    targetOrgId?: string,
  ): boolean {
    if (visibilityScope === 'public') {
      return true;
    }

    if (visibilityScope !== 'organization') {
      return false;
    }

    const organizationIds = this.collectPrincipalIdsByType(user, 'organization');
    if (organizationIds.size === 0) {
      return false;
    }

    const normalizedTargetOrgId = targetOrgId?.trim();
    return !normalizedTargetOrgId || organizationIds.has(normalizedTargetOrgId);
  }

  private matchesPrincipal(
    user: TokenPayload,
    principalType: DocumentPrincipalType,
    principalId: string,
  ): boolean {
    return this.collectPrincipalIdsByType(user, principalType).has(principalId.trim());
  }

  private collectAllPrincipalIds(user: TokenPayload): Set<string> {
    return new Set(this.normalizePrincipalIds([
      user.userId,
      user.loginId,
      ...(user.organizationIds ?? []),
      ...(user.teamIds ?? []),
      ...(user.groupIds ?? []),
    ]));
  }

  private collectPrincipalIdsByType(
    user: TokenPayload,
    principalType: DocumentPrincipalType,
  ): Set<string> {
    switch (principalType) {
      case 'organization':
        return new Set(this.normalizePrincipalIds(user.organizationIds ?? []));
      case 'team':
        return new Set(this.normalizePrincipalIds(user.teamIds ?? []));
      case 'group':
        return new Set(this.normalizePrincipalIds(user.groupIds ?? []));
      case 'user':
      default:
        return new Set(this.normalizePrincipalIds([user.userId, user.loginId]));
    }
  }

  private normalizePrincipalIds(values: readonly string[]): string[] {
    return Array.from(
      new Set(
        values
          .map((value) => value?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    );
  }
}
