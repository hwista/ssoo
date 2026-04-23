import fs from 'fs';
import path from 'path';
import { Injectable } from '@nestjs/common';
import type { StorageProvider } from '../runtime/dms-config.service.js';
import { AccessRequestService } from '../access/access-request.service.js';
import { contentService } from '../runtime/content.service.js';
import { configService } from '../runtime/dms-config.service.js';
import { type StorageOrigin } from '../storage/storage-adapter.service.js';

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
  docPath?: string;
}

export interface SubmitIngestRequest {
  title: string;
  content: string;
  requestedBy?: string;
  submittedBy?: string;
  provider?: StorageProvider;
  relativePath?: string;
  origin?: StorageOrigin;
}

interface PersistedIngestJob extends IngestJob {
  submittedBy?: string;
}

interface IngestQueueShape {
  jobs: PersistedIngestJob[];
}

const DEFAULT_INGEST_RUNTIME_OWNER = 'admin';

function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

@Injectable()
export class IngestQueueService {
  constructor(
    private readonly accessRequestService: AccessRequestService,
  ) {}

  private getQueueRootPath(): string {
    return configService.getIngestQueueDir();
  }

  private getQueueFilePath(): string {
    return path.join(this.getQueueRootPath(), 'jobs.json');
  }

  private getPublishedDocRootPath(): string {
    return path.join(configService.getDocDir(), 'ingest');
  }

  private buildPublishedDocRelativePath(job: IngestJob): string {
    const docFileName = `${job.id}-${job.title}.md`.replace(/\s+/g, '-');
    return path.posix.join('ingest', docFileName);
  }

  private buildPublishedDocContent(job: IngestJob, confirmedAt: string): string {
    const docLines = [
      `# ${job.title}`,
      '',
      '> 자동 수집 문서',
      '',
      `- requestedBy: ${job.requestedBy}`,
      `- confirmedAt: ${confirmedAt}`,
    ];

    const sourceStorageUri = job.storageUri?.trim();
    if (sourceStorageUri) {
      docLines.push(`- sourceStorageUri: ${sourceStorageUri}`);
      docLines.push(`- sourceProvider: ${job.provider}`);
    }

    docLines.push(
      '',
      '---',
      '',
      job.content,
      '',
    );

    return docLines.join('\n');
  }

  private buildPublishedDocMetadata(job: PersistedIngestJob, confirmedAt: string): Record<string, unknown> {
    const sourceStorageUri = job.storageUri?.trim();
    const runtimeOwner = typeof job.submittedBy === 'string' && job.submittedBy.trim().length > 0
      ? job.submittedBy.trim()
      : DEFAULT_INGEST_RUNTIME_OWNER;

    return {
      title: job.title,
      summary: '자동 수집 문서',
      author: runtimeOwner,
      lastModifiedBy: runtimeOwner,
      ownerLoginId: runtimeOwner,
      createdAt: confirmedAt,
      updatedAt: confirmedAt,
      visibility: { scope: 'self' },
      sourceLinks: sourceStorageUri ? [sourceStorageUri] : [],
    };
  }

  private toPublicJob(job: PersistedIngestJob): IngestJob {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { submittedBy, ...publicJob } = job;
    return publicJob;
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

  private findJob(queue: IngestQueueShape, id: string): PersistedIngestJob {
    const job = queue.jobs.find((item) => item.id === id);
    if (!job) {
      throw new Error('수집 작업을 찾을 수 없습니다.');
    }

    return job;
  }

  private async publishJob(job: PersistedIngestJob): Promise<PersistedIngestJob> {
    const docRootDir = this.getPublishedDocRootPath();
    ensureDirectory(docRootDir);

    const confirmedAt = new Date().toISOString();
    const docPath = this.buildPublishedDocRelativePath(job);
    const docContent = this.buildPublishedDocContent(job, confirmedAt);
    const docMetadata = this.buildPublishedDocMetadata(job, confirmedAt);
    const saved = contentService.save(docPath, docContent, docMetadata);

    if (!saved.success || !saved.data) {
      throw new Error(saved.error ?? '수집 문서 게시에 실패했습니다.');
    }

    await this.accessRequestService.syncDocumentProjection(docPath, saved.data.metadata ?? docMetadata);

    return {
      ...job,
      status: 'published',
      docPath: saved.data.savedPath,
      updatedAt: confirmedAt,
      error: undefined,
    };
  }

  async submit(request: SubmitIngestRequest): Promise<IngestJob> {
    const queue = this.loadQueue();
    const now = new Date().toISOString();
    const id = `ingest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const pendingJob: PersistedIngestJob = {
      id,
      title: request.title.trim() || `Ingest ${new Date().toISOString()}`,
      content: request.content,
      provider: request.provider ?? configService.getConfig().storage.defaultProvider,
      relativePath: request.relativePath ?? 'ingest',
      requestedBy: request.requestedBy?.trim() || 'system',
      submittedBy: request.submittedBy?.trim() || DEFAULT_INGEST_RUNTIME_OWNER,
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
        nextJob = await this.publishJob(nextJob);
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
    return this.toPublicJob(nextJob);
  }

  list(): IngestJob[] {
    return this.loadQueue().jobs.map((job) => this.toPublicJob(job));
  }

  async confirm(id: string): Promise<IngestJob> {
    const queue = this.loadQueue();
    const target = this.findJob(queue, id);

    if (target.status === 'published') {
      return this.toPublicJob(target);
    }
    if (target.status === 'failed') {
      throw new Error('실패한 작업은 게시 승인할 수 없습니다.');
    }

    const published = await this.publishJob(target);
    queue.jobs = queue.jobs.map((job) => (job.id === id ? published : job));
    this.saveQueue(queue);
    return this.toPublicJob(published);
  }
}
