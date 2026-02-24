import type { StorageProvider } from '@/server/services/config/ConfigService';
import { storageAdapterService, type StorageOrigin, type StorageStatus } from '@/server/services/storage/StorageAdapterService';

export interface StorageUploadBody {
  fileName: string;
  content: string;
  provider?: StorageProvider;
  relativePath?: string;
  origin?: StorageOrigin;
  status?: StorageStatus;
}

export interface StorageOpenBody {
  storageUri?: string;
  provider?: StorageProvider;
  path?: string;
}

export function handleStorageUpload(body: StorageUploadBody) {
  if (!body?.fileName?.trim()) {
    return { success: false as const, status: 400, error: 'fileName이 필요합니다.' };
  }

  const content = body.content ?? '';
  const uploaded = storageAdapterService.upload({
    fileName: body.fileName,
    content,
    provider: body.provider,
    relativePath: body.relativePath,
    origin: body.origin,
    status: body.status,
  });

  return { success: true as const, data: uploaded };
}

export function handleStorageOpen(body: StorageOpenBody) {
  if (!body.storageUri && !body.path) {
    return { success: false as const, status: 400, error: 'storageUri 또는 path가 필요합니다.' };
  }

  const result = storageAdapterService.open({
    storageUri: body.storageUri,
    provider: body.provider,
    path: body.path,
  });

  return { success: true as const, data: result };
}
