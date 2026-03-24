import fs from 'fs';
import path from 'path';
import type { StorageProvider } from '@/server/services/config/ConfigService';
import { fail, ok } from '@/server/shared/result';
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
    return fail(message, 403);
  }

  if (message === '대상 파일을 찾을 수 없습니다.') {
    return fail(message, 404);
  }

  return fail(message, 500);
}

export function handleStorageUpload(body: StorageUploadBody) {
  if (!body?.fileName?.trim()) {
    return fail('fileName이 필요합니다.', 400);
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

    return ok(uploaded);
  } catch (error) {
    return mapStorageError(error);
  }
}

export function handleStorageOpen(body: StorageOpenBody) {
  if (!body.storageUri && !body.path) {
    return fail('storageUri 또는 path가 필요합니다.', 400);
  }

  try {
    const result = storageAdapterService.open({
      storageUri: body.storageUri,
      provider: body.provider,
      path: body.path,
    });

    return ok(result);
  } catch (error) {
    return mapStorageError(error);
  }
}

export function handleLocalFileDownload({ targetPath }: { targetPath: string }) {
  try {
    const resolved = storageAdapterService.resolveContainedPath('local', targetPath);

    if (!fs.existsSync(resolved.fullPath)) {
      return fail('대상 파일을 찾을 수 없습니다.', 404);
    }

    return ok({
        fileBuffer: fs.readFileSync(resolved.fullPath),
        fileName: path.basename(resolved.fullPath) || 'download.bin',
      });
  } catch (error) {
    return mapStorageError(error);
  }
}
