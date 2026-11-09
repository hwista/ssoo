import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit, Optional, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthEmailDeliveryStatus } from '@ssoo/types/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { DatabaseService } from '../../../database/database.service.js';

import { MailDeliveryService } from './mail-delivery.service.js';

import type { EmailDeliveryListQuery, RetryEmailDeliveryDto } from './dto/email-delivery-operations.dto.js';

const DEFAULT_INTERVAL_MS = 30_000;
const MIN_INTERVAL_MS = 5_000;
const MAX_INTERVAL_MS = 60 * 60_000;
const DEFAULT_BATCH_LIMIT = 20;
const MAX_BATCH_LIMIT = 100;
const PROCESSING_RECOVERY_MS = 10 * 60_000;

function readBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function readInteger(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = typeof value === 'string' || typeof value === 'number'
    ? Number(value)
    : Number.NaN;
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(Math.floor(numeric), max));
}

function maskEmail(value: string): string {
  const [local = '', domain = ''] = value.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

@Injectable()
export class AuthEmailOutboxWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuthEmailOutboxWorkerService.name);
  private timer: ReturnType<typeof setInterval> | undefined;
  private transporter: Transporter | undefined;
  private running = false;
  private transportVerified = false;
  private verifiedRevision: string | null = null;
  private lastStartedAt: string | undefined;
  private lastFinishedAt: string | undefined;
  private lastErrorMessage: string | undefined;

  constructor(
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
    @Optional() private readonly mailDelivery?: MailDeliveryService,
  ) {}

  async onModuleInit(): Promise<void> {
    const config = await this.readConfig();
    if (config.enabled) {
      await this.recoverStaleClaims();
      await this.verifyTransport(config);
    }
    // Keep the lightweight timer alive so an Admin change takes effect without restarting.
    this.timer = setInterval(() => { this.scheduleRun('interval'); }, config.intervalMs);
    if (config.enabled && config.runOnStart) this.scheduleRun('startup');
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.transporter?.close();
    this.transporter = undefined;
  }

  async refreshTransport(): Promise<void> { await this.verifyTransport(await this.readConfig()); }

  async getStatus(): Promise<AuthEmailDeliveryStatus> {
    const config = await this.readConfig();
    const grouped = await this.db.client.authEmailOutbox.groupBy({
      by: ['statusCode'],
      _count: { _all: true },
    });
    const recent = await this.db.client.authEmailOutbox.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const counts = Object.fromEntries(grouped.map((entry) => [entry.statusCode, entry._count._all]));

    if (config.runtime && this.verifiedRevision !== config.runtime.updatedAt) this.transportVerified = false;
    const state = !config.enabled
      ? 'disabled'
      : !config.configured || !this.transportVerified ? 'blocked' : 'ready';
    const reason = state === 'ready'
      ? config.runtime?.config.provider === 'local' ? '로컬 수신함으로 전달합니다. 외부 이메일에는 발송되지 않습니다.' : '발송 서버 연결을 확인했습니다. 최종 수신은 수신함에서 확인하세요.'
      : !config.enabled
        ? 'AUTH_EMAIL_OUTBOX_WORKER_ENABLED=false'
        : !config.configured
          ? 'SMTP host, port, from address, username, or password is missing.'
          : this.lastErrorMessage ?? 'SMTP transport verification has not completed.';

    return {
      state,
      reason,
      workerEnabled: config.enabled,
      configured: config.configured,
      transportVerified: this.transportVerified,
      running: this.running,
      intervalMs: config.intervalMs,
      batchLimit: config.batchLimit,
      lastStartedAt: this.lastStartedAt,
      lastFinishedAt: this.lastFinishedAt,
      lastErrorMessage: this.lastErrorMessage,
      counts,
      recent: recent.map((message) => ({
        messageId: message.messageId,
        deliveryTarget: message.lastActivity === 'captured-local' ? 'local' : 'external',
        recipient: maskEmail(message.toEmail),
        templateCode: message.templateCode,
        statusCode: message.statusCode,
        createdAt: message.createdAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
        sentAt: message.sentAt?.toISOString() ?? null,
        failedAt: message.failedAt?.toISOString() ?? null,
        failReason: message.failReason,
      })),
    };
  }

  async listMessages(query: EmailDeliveryListQuery) {
    const where = query.status ? { statusCode: query.status } : {};
    const [messages, total] = await Promise.all([
      this.db.client.authEmailOutbox.findMany({ where, orderBy: [{ createdAt: 'desc' }, { messageId: 'desc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.db.client.authEmailOutbox.count({ where }),
    ]);
    return { items: messages.map(message => ({
      deliveryTarget: message.lastActivity === 'captured-local' ? 'local' as const : 'external' as const,
      messageId: message.messageId, recipient: maskEmail(message.toEmail), templateCode: message.templateCode,
      statusCode: message.statusCode, createdAt: message.createdAt.toISOString(), updatedAt: message.updatedAt.toISOString(),
      sentAt: message.sentAt?.toISOString() ?? null, failedAt: message.failedAt?.toISOString() ?? null, failReason: message.failReason,
    })), total, page: query.page, pageSize: query.pageSize };
  }

  async runOnce(trigger = 'manual', messageId?: string): Promise<AuthEmailDeliveryStatus> {
    if (this.running) return this.getStatus();

    const config = await this.readConfig();
    this.lastStartedAt = new Date().toISOString();
    this.lastFinishedAt = undefined;
    this.lastErrorMessage = undefined;

    if (!config.enabled || !config.configured) {
      this.lastErrorMessage = 'Auth email delivery is disabled or incompletely configured.';
      this.lastFinishedAt = new Date().toISOString();
      return this.getStatus();
    }

    this.running = true;
    try {
      await this.verifyTransport(config);
      if (!this.transportVerified) {
        return this.getStatus();
      }

      const candidates = await this.db.client.authEmailOutbox.findMany({
        where: { statusCode: 'pending', ...(messageId ? { messageId } : {}), ...(!trigger.startsWith('admin') && config.runtime?.activatedAt ? { createdAt: { gte: new Date(config.runtime.activatedAt) } } : {}) },
        orderBy: { createdAt: 'asc' },
        take: config.batchLimit,
      });

      for (const message of candidates) {
        if (message.referenceType === 'password-reset-challenge' && message.referenceId) {
          const challenge = await this.db.client.userPasswordResetChallenge.findUnique({ where: { challengeId: message.referenceId } });
          if (!challenge || challenge.consumedAt || challenge.expiresAt <= new Date()) {
            await this.db.client.authEmailOutbox.updateMany({ where: { messageId: message.messageId, statusCode: 'pending' }, data: { statusCode: 'superseded', lastSource: 'auth-email-worker', lastActivity: 'expired-reset-skipped' } });
            continue;
          }
        }
        const claimed = await this.db.client.authEmailOutbox.updateMany({
          where: { messageId: message.messageId, statusCode: 'pending' },
          data: {
            statusCode: 'processing',
            failedAt: null,
            failReason: null,
            lastSource: `auth-email-worker:${trigger}`,
            lastActivity: 'claim',
          },
        });
        if (claimed.count !== 1) continue;

        try {
          if (this.mailDelivery && config.runtime) await this.mailDelivery.send(config.runtime, message);
          else await this.getTransporter().sendMail({
            from: message.fromEmail || config.fromAddress,
            to: message.toEmail,
            subject: message.subject,
            text: message.bodyText,
          });
          await this.db.client.authEmailOutbox.update({
            where: { messageId: message.messageId },
            data: {
              statusCode: 'sent',
              sentAt: new Date(),
              failedAt: null,
              failReason: null,
              lastSource: `auth-email-worker:${trigger}`,
              lastActivity: config.runtime?.config.provider === 'local' ? 'captured-local' : 'sent',
            },
          });
        } catch (error) {
          const reason = this.mailDelivery ? '메일 전달에 실패했습니다. 연결 설정과 발신 권한을 확인하세요.' : error instanceof Error ? error.message : String(error);
          this.lastErrorMessage = reason;
          await this.db.client.authEmailOutbox.update({
            where: { messageId: message.messageId },
            data: {
              statusCode: 'failed',
              failedAt: new Date(),
              failReason: reason.slice(0, 1000),
              lastSource: `auth-email-worker:${trigger}`,
              lastActivity: 'failed',
            },
          });
          this.logger.error(`Auth email delivery failed for message ${message.messageId}: ${reason}`);
        }
      }
    } finally {
      this.running = false;
      this.lastFinishedAt = new Date().toISOString();
    }

    return this.getStatus();
  }

  async retry(messageId: string, dto: RetryEmailDeliveryDto, actor: bigint): Promise<AuthEmailDeliveryStatus> {
    if (!dto.reason.trim()) throw new BadRequestException('재시도 사유를 입력해 주세요.');
    const message = await this.db.client.authEmailOutbox.findUnique({ where: { messageId } });
    if (!message) throw new NotFoundException('메일 기록을 찾을 수 없습니다.');
    if (message.statusCode !== 'failed' || message.updatedAt.getTime() !== new Date(dto.expectedUpdatedAt).getTime()) throw new ConflictException('메일 상태가 변경됐거나 재시도할 실패 기록이 아닙니다. 다시 조회해 주세요.');
    if (message.referenceType === 'password-reset-challenge' && message.referenceId) {
      const challenge = await this.db.client.userPasswordResetChallenge.findUnique({ where: { challengeId: message.referenceId } });
      if (!challenge || challenge.consumedAt || challenge.expiresAt <= new Date()) throw new BadRequestException('만료되었거나 사용된 복구 요청입니다. 사용자 관리에서 비밀번호 복구를 새로 요청해 주세요.');
    }
    const config = await this.readConfig();
    if (!config.enabled || !config.configured) throw new ServiceUnavailableException('메일 발송이 꺼져 있거나 SMTP 설정이 준비되지 않았습니다. 실패 기록을 유지합니다.');
    if (!this.transportVerified) await this.verifyTransport(config);
    if (!this.transportVerified) throw new ServiceUnavailableException('SMTP 연결을 확인하지 못했습니다. 실패 기록을 유지합니다.');
    const changed = await this.db.client.authEmailOutbox.updateMany({
      where: { messageId, statusCode: 'failed', updatedAt: message.updatedAt },
      data: { statusCode: 'pending', failedAt: null, failReason: null, updatedBy: actor, lastSource: 'auth-email-worker:admin', lastActivity: `retry-requested: ${dto.reason.trim()}` },
    });
    if (changed.count !== 1) throw new ConflictException('다른 운영자가 메일 상태를 변경했습니다. 다시 조회해 주세요.');
    return this.runOnce('admin-retry', messageId);
  }

  triggerRun(trigger: string): void {
    this.scheduleRun(trigger);
  }

  private scheduleRun(trigger: string): void {
    void this.runOnce(trigger).catch((error) => {
      const reason = error instanceof Error ? error.message : String(error);
      this.lastErrorMessage = reason;
      this.lastFinishedAt = new Date().toISOString();
      this.logger.error(`Auth email worker run failed (${trigger}): ${reason}`);
    });
  }

  private async recoverStaleClaims(): Promise<void> {
    await this.db.client.authEmailOutbox.updateMany({
      where: {
        statusCode: 'processing',
        updatedAt: { lt: new Date(Date.now() - PROCESSING_RECOVERY_MS) },
      },
      data: {
        statusCode: 'pending',
        failReason: 'Recovered a stale processing claim after worker restart.',
        lastSource: 'auth-email-worker:startup',
        lastActivity: 'stale-claim-recovered',
      },
    });
  }

  private async verifyTransport(config: Awaited<ReturnType<AuthEmailOutboxWorkerService['readConfig']>>): Promise<void> {
    if (!config.enabled || !config.configured) {
      this.transportVerified = false;
      return;
    }

    try {
      if (this.mailDelivery && config.runtime) await this.mailDelivery.verify(config.runtime);
      else await this.getTransporter().verify();
      this.verifiedRevision = config.runtime?.updatedAt ?? null;
      this.transportVerified = true;
      this.lastErrorMessage = undefined;
      this.logger.log(`Auth email SMTP transport verified: ${config.host}:${config.port}`);
    } catch (error) {
      this.transportVerified = false;
      this.lastErrorMessage = this.mailDelivery ? '메일 서버 연결 검증에 실패했습니다.' : error instanceof Error ? error.message : String(error);
      this.logger.error(`Auth email SMTP verification failed: ${this.lastErrorMessage}`);
    }
  }

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;

    const config = this.readEnvironmentConfig();
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    });
    return this.transporter;
  }

  private async readConfig() {
    const fallback = this.readEnvironmentConfig();
    const runtime = await this.mailDelivery?.runtime();
    return { ...fallback, ...(runtime ? {
      enabled: runtime.config.enabled,
      configured: this.mailDelivery!.configured(runtime),
      host: runtime.config.provider, fromAddress: runtime.config.fromAddress,
    } : {}), runtime };
  }

  private readEnvironmentConfig() {
    const host = this.configService.get<string>('AUTH_EMAIL_SMTP_HOST')?.trim() ?? '';
    const port = readInteger(
      this.configService.get<string>('AUTH_EMAIL_SMTP_PORT'),
      587,
      1,
      65_535,
    );
    const username = this.configService.get<string>('AUTH_EMAIL_SMTP_USERNAME')?.trim() ?? '';
    const password = this.configService.get<string>('AUTH_EMAIL_SMTP_PASSWORD') ?? '';
    const fromAddress = this.configService.get<string>('AUTH_EMAIL_FROM_ADDRESS')?.trim() ?? '';
    return {
      enabled: readBoolean(this.configService.get<string>('AUTH_EMAIL_OUTBOX_WORKER_ENABLED'), false),
      host,
      port,
      secure: readBoolean(this.configService.get<string>('AUTH_EMAIL_SMTP_SECURE'), port === 465),
      username,
      password,
      fromAddress,
      configured: Boolean(host && port && username && password && fromAddress),
      intervalMs: readInteger(
        this.configService.get<string>('AUTH_EMAIL_OUTBOX_INTERVAL_MS'),
        DEFAULT_INTERVAL_MS,
        MIN_INTERVAL_MS,
        MAX_INTERVAL_MS,
      ),
      batchLimit: readInteger(
        this.configService.get<string>('AUTH_EMAIL_OUTBOX_BATCH_LIMIT'),
        DEFAULT_BATCH_LIMIT,
        1,
        MAX_BATCH_LIMIT,
      ),
      runOnStart: readBoolean(this.configService.get<string>('AUTH_EMAIL_OUTBOX_RUN_ON_START'), true),
    };
  }
}
