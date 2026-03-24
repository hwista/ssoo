import type { StorageProvider } from '@/server/services/config/ConfigService';
import { ingestQueueService } from '@/server/services/ingest/IngestQueueService';
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
    return { success: false as const, status: 400, error: 'title이 필요합니다.' };
  }

  if (!body?.content?.trim()) {
    return { success: false as const, status: 400, error: 'content가 필요합니다.' };
  }

  const job = ingestQueueService.submit(body);
  return { success: true as const, data: job };
}

export function handleListIngestJobs() {
  return {
    success: true as const,
    data: {
      jobs: ingestQueueService.list(),
    },
  };
}

export function handleConfirmIngestJob(id: string) {
  if (!id.trim()) {
    return { success: false as const, status: 400, error: 'job id가 필요합니다.' };
  }

  const job = ingestQueueService.confirm(id);
  return { success: true as const, data: job };
}
