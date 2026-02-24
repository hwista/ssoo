import fs from 'fs';
import path from 'path';
import { configService, type StorageProvider } from '@/server/services/config/ConfigService';
import { storageAdapterService, type StorageOrigin, type StorageStatus } from '@/server/services/storage/StorageAdapterService';

export type IngestJobStatus = 'draft' | 'pending_confirm' | 'published' | 'failed';

export interface IngestJob {
  id: string;
  title: string;
  content: string;
  provider: StorageProvider;
  relativePath: string;
  requestedBy: string;
  origin: StorageOrigin;
  createdAt: string;
  updatedAt: string;
  status: IngestJobStatus;
  error?: string;
  storageUri?: string;
  wikiPath?: string;
}

export interface SubmitIngestRequest {
  title: string;
  content: string;
  requestedBy?: string;
  provider?: StorageProvider;
  relativePath?: string;
  origin?: StorageOrigin;
}

interface IngestQueueShape {
  jobs: IngestJob[];
}

function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

class IngestQueueService {
  private getQueueRootPath(): string {
    const configured = configService.getConfig().ingest.queuePath || path.join(process.cwd(), 'data', 'ingest');
    return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
  }

  private getQueueFilePath(): string {
    return path.join(this.getQueueRootPath(), 'jobs.json');
  }

  private getPublishedWikiRootPath(): string {
    return path.join(configService.getWikiDir(), 'ingest');
  }

  private loadQueue(): IngestQueueShape {
    const root = this.getQueueRootPath();
    ensureDirectory(root);

    const queueFile = this.getQueueFilePath();
    if (!fs.existsSync(queueFile)) {
      return { jobs: [] };
    }

    try {
      const raw = fs.readFileSync(queueFile, 'utf-8');
      const parsed = JSON.parse(raw) as IngestQueueShape;
      return { jobs: parsed.jobs ?? [] };
    } catch {
      return { jobs: [] };
    }
  }

  private saveQueue(queue: IngestQueueShape): void {
    const root = this.getQueueRootPath();
    ensureDirectory(root);
    fs.writeFileSync(this.getQueueFilePath(), JSON.stringify(queue, null, 2) + '\n', 'utf-8');
  }

  private findJob(queue: IngestQueueShape, id: string): IngestJob {
    const job = queue.jobs.find((item) => item.id === id);
    if (!job) {
      throw new Error('수집 작업을 찾을 수 없습니다.');
    }
    return job;
  }

  private publishJob(job: IngestJob): IngestJob {
    const storageStatus: StorageStatus = 'published';
    const storageRef = storageAdapterService.upload({
      fileName: `${job.title}.md`,
      content: job.content,
      provider: job.provider,
      relativePath: job.relativePath,
      origin: job.origin,
      status: storageStatus,
    });

    const wikiDir = this.getPublishedWikiRootPath();
    ensureDirectory(wikiDir);
    const wikiFileName = `${job.id}-${job.title}.md`.replace(/\s+/g, '-');
    const wikiPath = path.join(wikiDir, wikiFileName);
    const wikiContent = [
      `# ${job.title}`,
      '',
      '> 자동 수집 문서',
      '',
      `- storageUri: ${storageRef.storageUri}`,
      `- provider: ${storageRef.provider}`,
      `- requestedBy: ${job.requestedBy}`,
      `- confirmedAt: ${new Date().toISOString()}`,
      '',
      '---',
      '',
      job.content,
      '',
    ].join('\n');
    fs.writeFileSync(wikiPath, wikiContent, 'utf-8');

    return {
      ...job,
      status: 'published',
      storageUri: storageRef.storageUri,
      wikiPath: path.relative(configService.getWikiDir(), wikiPath).replace(/\\/g, '/'),
      updatedAt: new Date().toISOString(),
      error: undefined,
    };
  }

  submit(request: SubmitIngestRequest): IngestJob {
    const queue = this.loadQueue();
    const now = new Date().toISOString();
    const id = `ingest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const pendingJob: IngestJob = {
      id,
      title: request.title.trim() || `Ingest ${new Date().toISOString()}`,
      content: request.content,
      provider: request.provider ?? configService.getConfig().storage.defaultProvider,
      relativePath: request.relativePath ?? 'ingest',
      requestedBy: request.requestedBy?.trim() || 'system',
      origin: request.origin ?? 'ingest',
      createdAt: now,
      updatedAt: now,
      status: 'draft',
    };

    let nextJob = pendingJob;
    try {
      nextJob = {
        ...pendingJob,
        status: 'pending_confirm',
        updatedAt: new Date().toISOString(),
      };

      if (configService.getConfig().ingest.autoPublish) {
        nextJob = this.publishJob(nextJob);
      }
    } catch (error) {
      nextJob = {
        ...pendingJob,
        status: 'failed',
        error: error instanceof Error ? error.message : '수집 처리 실패',
        updatedAt: new Date().toISOString(),
      };
    }

    queue.jobs.unshift(nextJob);
    this.saveQueue(queue);

    return nextJob;
  }

  list(): IngestJob[] {
    return this.loadQueue().jobs;
  }

  confirm(id: string): IngestJob {
    const queue = this.loadQueue();
    const target = this.findJob(queue, id);

    if (target.status === 'published') {
      return target;
    }

    if (target.status === 'failed') {
      throw new Error('실패한 작업은 게시 승인할 수 없습니다.');
    }

    const published = this.publishJob(target);
    queue.jobs = queue.jobs.map((job) => (job.id === id ? published : job));
    this.saveQueue(queue);

    return published;
  }
}

export const ingestQueueService = new IngestQueueService();
