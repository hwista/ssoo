import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { configService, type StorageProvider } from '@/server/services/config/ConfigService';

export type StorageOrigin = 'manual' | 'ingest' | 'teams' | 'network_drive';
export type StorageStatus = 'draft' | 'pending_confirm' | 'published';

export interface StorageReference {
  storageUri: string;
  provider: StorageProvider;
  path: string;
  name: string;
  size: number;
  versionId: string;
  etag: string;
  checksum: string;
  origin: StorageOrigin;
  status: StorageStatus;
  webUrl?: string;
}

export interface StorageUploadRequest {
  fileName: string;
  content: string | Buffer;
  provider?: StorageProvider;
  relativePath?: string;
  origin?: StorageOrigin;
  status?: StorageStatus;
}

export interface StorageOpenRequest {
  storageUri?: string;
  provider?: StorageProvider;
  path?: string;
}

export interface StorageOpenResult {
  provider: StorageProvider;
  path: string;
  storageUri: string;
  openUrl: string;
  webUrl?: string;
}

function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function hashValue(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function normalizeRelativePath(input?: string): string {
  if (!input) return '';
  return path.normalize(input).replace(/^\/+/, '').replace(/^\.\.[/\\]/, '');
}

class StorageAdapterService {
  private resolveProvider(provider?: StorageProvider): StorageProvider {
    return provider ?? configService.getConfig().storage.defaultProvider;
  }

  private getProviderConfig(provider: StorageProvider) {
    return configService.getConfig().storage[provider];
  }

  private parseStorageUri(storageUri: string): { provider: StorageProvider; path: string } {
    const match = storageUri.match(/^(local|sharepoint|nas):\/\/(.+)$/);
    if (!match) {
      throw new Error('유효하지 않은 storageUri 형식입니다.');
    }
    return {
      provider: match[1] as StorageProvider,
      path: decodeURIComponent(match[2]),
    };
  }

  private toStorageUri(provider: StorageProvider, targetPath: string): string {
    return `${provider}://${encodeURIComponent(targetPath.replace(/\\/g, '/'))}`;
  }

  private buildOpenUrl(provider: StorageProvider, targetPath: string, webBaseUrl?: string): string {
    const encodedPath = encodeURIComponent(targetPath.replace(/\\/g, '/'));
    if (provider === 'local') {
      return `/api/storage/open?provider=${provider}&path=${encodedPath}`;
    }
    if (webBaseUrl) {
      const normalized = webBaseUrl.replace(/\/$/, '');
      return `${normalized}/${targetPath.replace(/^\/+/, '')}`;
    }
    return `/api/storage/open?provider=${provider}&path=${encodedPath}`;
  }

  private resolveDestination(provider: StorageProvider, relativePath: string, fileName: string): { fullPath: string; relativePath: string } {
    const normalizedRelative = normalizeRelativePath(relativePath);
    const safeName = fileName.replace(/[<>:"|?*]/g, '_');
    const providerConfig = this.getProviderConfig(provider);
    const configuredBase = providerConfig.basePath;
    const storageRoot = provider === 'local'
      ? configuredBase
      : path.join(process.cwd(), 'data', 'storage', 'providers', provider);
    const absoluteRoot = path.isAbsolute(storageRoot) ? storageRoot : path.join(process.cwd(), storageRoot);

    const relativeTarget = normalizedRelative ? `${normalizedRelative}/${safeName}` : safeName;
    const fullPath = path.join(absoluteRoot, relativeTarget);
    return { fullPath, relativePath: relativeTarget.replace(/\\/g, '/') };
  }

  upload(request: StorageUploadRequest): StorageReference {
    const provider = this.resolveProvider(request.provider);
    const providerConfig = this.getProviderConfig(provider);

    if (!providerConfig.enabled) {
      throw new Error(`${provider} 저장소가 비활성화되어 있습니다.`);
    }

    const destination = this.resolveDestination(provider, request.relativePath ?? '', request.fileName);
    ensureDirectory(path.dirname(destination.fullPath));

    fs.writeFileSync(destination.fullPath, request.content);

    const stats = fs.statSync(destination.fullPath);
    const checksum = hashValue(request.content);
    const versionId = String(stats.mtimeMs);
    const etag = hashValue(`${destination.relativePath}:${stats.size}:${versionId}`).slice(0, 16);

    return {
      storageUri: this.toStorageUri(provider, destination.relativePath),
      provider,
      path: destination.relativePath,
      name: request.fileName,
      size: stats.size,
      versionId,
      etag,
      checksum,
      origin: request.origin ?? 'manual',
      status: request.status ?? 'published',
      webUrl: providerConfig.webBaseUrl
        ? `${providerConfig.webBaseUrl.replace(/\/$/, '')}/${destination.relativePath}`
        : undefined,
    };
  }

  open(request: StorageOpenRequest): StorageOpenResult {
    const parsed = request.storageUri ? this.parseStorageUri(request.storageUri) : null;
    const provider = parsed?.provider ?? this.resolveProvider(request.provider);
    const targetPath = parsed?.path ?? normalizeRelativePath(request.path);

    if (!targetPath) {
      throw new Error('열기 대상 경로가 필요합니다.');
    }

    const providerConfig = this.getProviderConfig(provider);
    const configuredBase = providerConfig.basePath;
    const storageRoot = provider === 'local'
      ? configuredBase
      : path.join(process.cwd(), 'data', 'storage', 'providers', provider);
    const absoluteRoot = path.isAbsolute(storageRoot) ? storageRoot : path.join(process.cwd(), storageRoot);
    const fullPath = path.join(absoluteRoot, targetPath);

    if (provider === 'local' && !fs.existsSync(fullPath)) {
      throw new Error('대상 파일을 찾을 수 없습니다.');
    }

    return {
      provider,
      path: targetPath,
      storageUri: this.toStorageUri(provider, targetPath),
      openUrl: this.buildOpenUrl(provider, targetPath, providerConfig.webBaseUrl),
      webUrl: providerConfig.webBaseUrl
        ? `${providerConfig.webBaseUrl.replace(/\/$/, '')}/${targetPath}`
        : undefined,
    };
  }
}

export const storageAdapterService = new StorageAdapterService();
