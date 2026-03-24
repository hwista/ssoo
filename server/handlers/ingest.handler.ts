import type { StorageProvider } from '@/server/services/config/ConfigService';
import { ingestQueueService } from '@/server/services/ingest/IngestQueueService';
import { fail, ok } from '@/server/shared/result';
import type { StorageOrigin } from '@/server/services/storage/StorageAdapterService';

export interface IngestSubmitBody {
  title: string;
  content: string;
  requestedBy?: string;
  provider?: StorageProvider;
  relativePath?: string;
  origin?: StorageOrigin;
}

export function handleSubmitIngest(body: IngestSubmitBody) {
  if (!body?.title?.trim()) {
    return fail('title이 필요합니다.', 400);
  }

  if (!body?.content?.trim()) {
    return fail('content가 필요합니다.', 400);
  }

  const job = ingestQueueService.submit(body);
  return ok(job);
}

export function handleListIngestJobs() {
  return ok({
    jobs: ingestQueueService.list(),
  });
}

export function handleConfirmIngestJob(id: string) {
  if (!id.trim()) {
    return fail('job id가 필요합니다.', 400);
  }

  try {
    const job = ingestQueueService.confirm(id);
    return ok(job);
  } catch (error) {
    const message = error instanceof Error ? error.message : '수집 작업 승인 중 오류가 발생했습니다.';
    return fail(message, 500);
  }
}
