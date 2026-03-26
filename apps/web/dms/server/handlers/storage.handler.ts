import fs from 'fs';
import path from 'path';
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

function mapStorageError(error: unknown) {
  const message = error instanceof Error ? error.message : '저장소 처리 중 오류가 발생했습니다.';

  if (message === '허용되지 않은 경로입니다.') {
    return { success: false as const, status: 403, error: message };
  }

  if (message === '대상 파일을 찾을 수 없습니다.') {
    return { success: false as const, status: 404, error: message };
  }

  throw error;
}

export function handleStorageUpload(body: StorageUploadBody) {
  if (!body?.fileName?.trim()) {
    return { success: false as const, status: 400, error: 'fileName이 필요합니다.' };
  }

  const content = body.content ?? '';
  try {
    const uploaded = storageAdapterService.upload({
      fileName: body.fileName,
      content,
      provider: body.provider,
      relativePath: body.relativePath,
      origin: body.origin,
      status: body.status,
    });

    return { success: true as const, data: uploaded };
  } catch (error) {
    return mapStorageError(error);
  }
}

export function handleStorageOpen(body: StorageOpenBody) {
  if (!body.storageUri && !body.path) {
    return { success: false as const, status: 400, error: 'storageUri 또는 path가 필요합니다.' };
  }

  try {
    const result = storageAdapterService.open({
      storageUri: body.storageUri,
      provider: body.provider,
      path: body.path,
    });

    return { success: true as const, data: result };
  } catch (error) {
    return mapStorageError(error);
  }
}

export function handleLocalFileDownload({ targetPath }: { targetPath: string }) {
  try {
    const resolved = storageAdapterService.resolveContainedPath('local', targetPath);

    if (!fs.existsSync(resolved.fullPath)) {
      return { success: false as const, status: 404, error: '대상 파일을 찾을 수 없습니다.' };
    }

    return {
      success: true as const,
      data: {
        fileBuffer: fs.readFileSync(resolved.fullPath),
        fileName: path.basename(resolved.fullPath) || 'download.bin',
      },
    };
  } catch (error) {
    return mapStorageError(error);
  }
}
