import { jest } from '@jest/globals';
import { AuthEmailOutboxWorkerService } from '../../src/modules/common/auth/auth-email-outbox-worker.service.js';

describe('AuthEmailOutboxWorkerService', () => {
  function deliveryFixture(enabled = true) {
    const message = {
      messageId: '42c76539-7bf1-4384-8a93-bd584dfe50a0', toEmail: 'fixture@example.invalid', fromEmail: null,
      templateCode: 'auth.password-reset', subject: '검증', bodyText: 'fixture-only', referenceType: 'password-reset-challenge', referenceId: 'fixture',
      statusCode: 'pending', sentAt: null, failedAt: null, failReason: null, createdAt: new Date(), updatedAt: new Date(),
    };
    const updateMany = jest.fn<() => Promise<{ count: number }>>().mockResolvedValue({ count: 1 });
    const update = jest.fn<(args: unknown) => Promise<unknown>>().mockResolvedValue(message);
    const findMany = jest.fn<(args: unknown) => Promise<unknown[]>>().mockResolvedValue([message]);
    const sendMail = jest.fn<() => Promise<unknown>>().mockResolvedValue({ messageId: 'mock-only' });
    const verify = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);
    const config = new Map<string, unknown>([
      ['AUTH_EMAIL_OUTBOX_WORKER_ENABLED', enabled], ['AUTH_EMAIL_SMTP_HOST', 'smtp.example.invalid'],
      ['AUTH_EMAIL_SMTP_USERNAME', 'fixture'], ['AUTH_EMAIL_SMTP_PASSWORD', 'fixture-only'], ['AUTH_EMAIL_FROM_ADDRESS', 'fixture@example.invalid'],
    ]);
    const challenge = { consumedAt: null as Date | null, expiresAt: new Date(Date.now() + 60_000) };
    const worker = new AuthEmailOutboxWorkerService({ client: { userPasswordResetChallenge: { findUnique: async () => challenge }, authEmailOutbox: {
      updateMany, update, findMany, findUnique: async () => message, groupBy: async () => [],
    } } } as never, { get: (key: string) => config.get(key) } as never);
    (worker as unknown as { transporter: unknown }).transporter = { sendMail, verify, close: jest.fn() };
    return { worker, message, challenge, updateMany, update, findMany, sendMail, verify };
  }

  it('preserves a failed message when a retry is requested with the worker disabled', async () => {
    const f = deliveryFixture(false);
    f.message.statusCode = 'failed';
    await expect(f.worker.retry(f.message.messageId, { reason: '복구 검증', expectedUpdatedAt: f.message.updatedAt.toISOString() }, 1n)).rejects.toThrow('발송이 꺼져');
    expect(f.updateMany).not.toHaveBeenCalled();
    expect(f.sendMail).not.toHaveBeenCalled();
  });

  it('does not deliver an expired pending password reset after a worker restart', async () => {
    const f = deliveryFixture();
    f.challenge.expiresAt = new Date(0);
    await f.worker.runOnce();
    expect(f.sendMail).not.toHaveBeenCalled();
    expect(f.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ statusCode: 'superseded' }) }));
  });

  it('rejects expired password reset retries before touching SMTP or the outbox', async () => {
    const f = deliveryFixture();
    f.message.statusCode = 'failed';
    f.challenge.expiresAt = new Date(0);
    await expect(f.worker.retry(f.message.messageId, { reason: '복구 검증', expectedUpdatedAt: f.message.updatedAt.toISOString() }, 1n)).rejects.toThrow('만료되었거나');
    expect(f.updateMany).not.toHaveBeenCalled();
    expect(f.verify).not.toHaveBeenCalled();
  });

  it('rejects stale and concurrently claimed retry requests', async () => {
    const f = deliveryFixture();
    f.message.statusCode = 'failed';
    await expect(f.worker.retry(f.message.messageId, { reason: '복구 검증', expectedUpdatedAt: new Date(0).toISOString() }, 1n)).rejects.toThrow('상태가 변경');
    expect(f.updateMany).not.toHaveBeenCalled();
    f.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(f.worker.retry(f.message.messageId, { reason: '복구 검증', expectedUpdatedAt: f.message.updatedAt.toISOString() }, 1n)).rejects.toThrow('다른 운영자');
    expect(f.sendMail).not.toHaveBeenCalled();
  });

  it('records the retry operator and reason and selects only the requested message', async () => {
    const f = deliveryFixture();
    f.message.statusCode = 'failed';
    await f.worker.retry(f.message.messageId, { reason: '복구 검증', expectedUpdatedAt: f.message.updatedAt.toISOString() }, 19n);
    expect(f.updateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({ data: expect.objectContaining({ updatedBy: 19n, lastActivity: 'retry-requested: 복구 검증' }) }));
    expect(f.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { statusCode: 'pending', messageId: f.message.messageId } }));
    expect(f.sendMail).toHaveBeenCalledTimes(1);
  });

  it('does not claim or send anything when delivery is disabled, including manual execution', async () => {
    const fixture = deliveryFixture(false);
    const result = await fixture.worker.runOnce('manual');
    expect(result.state).toBe('disabled');
    expect(fixture.updateMany).not.toHaveBeenCalled();
    expect(fixture.sendMail).not.toHaveBeenCalled();
    expect(fixture.verify).not.toHaveBeenCalled();
  });

  it('leaves messages pending when SMTP readiness verification fails', async () => {
    const fixture = deliveryFixture();
    fixture.verify.mockRejectedValueOnce(new Error('fixture transport unavailable'));
    const result = await fixture.worker.runOnce('manual');
    expect(result.state).toBe('blocked');
    expect(result.reason).toContain('fixture transport unavailable');
    expect(fixture.updateMany).not.toHaveBeenCalled();
    expect(fixture.sendMail).not.toHaveBeenCalled();
  });

  it('skips a message already claimed by another worker', async () => {
    const fixture = deliveryFixture();
    fixture.updateMany.mockResolvedValueOnce({ count: 0 });
    await fixture.worker.runOnce('manual');
    expect(fixture.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { messageId: fixture.message.messageId, statusCode: 'pending' } }));
    expect(fixture.sendMail).not.toHaveBeenCalled();
    expect(fixture.update).not.toHaveBeenCalled();
  });

  it('records transport failures as failed and releases the running state', async () => {
    const fixture = deliveryFixture();
    fixture.sendMail.mockRejectedValueOnce(new Error('fixture delivery rejected'));
    const result = await fixture.worker.runOnce('manual');
    expect(result.running).toBe(false);
    expect(result.lastFinishedAt).toBeDefined();
    expect(result.lastErrorMessage).toBe('fixture delivery rejected');
    expect(fixture.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ statusCode: 'failed', failReason: 'fixture delivery rejected', lastActivity: 'failed' }) }));
    expect(fixture.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ statusCode: 'sent' }) }));
  });

  it('claims a pending message and records successful SMTP delivery', async () => {
    const now = new Date('2026-08-14T00:00:00.000Z');
    const message = {
      messageId: '34e0798e-0790-4f98-85f7-901d6a5f85b0',
      toEmail: 'launch.user@example.com',
      fromEmail: null,
      templateCode: 'auth.password-reset',
      subject: 'Reset',
      bodyText: 'code: 123456',
      referenceType: 'password-reset-challenge',
      referenceId: 'challenge-1',
      statusCode: 'pending',
      sentAt: null,
      failedAt: null,
      failReason: null,
      createdAt: now,
      updatedAt: now,
    };
    let finalStatus = 'pending';
    const sendMail = jest.fn<() => Promise<unknown>>().mockResolvedValue({ messageId: 'smtp-1' });
    const verify = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);
    const update = jest.fn(async ({ data }: { data: { statusCode?: string } }) => {
      finalStatus = data.statusCode ?? finalStatus;
      return { ...message, statusCode: finalStatus };
    });
    const authEmailOutbox = {
      findMany: jest.fn(async ({ where }: { where?: { statusCode?: string } }) => (
        where?.statusCode === 'pending'
          ? [{ ...message, statusCode: 'pending' }]
          : [{ ...message, statusCode: finalStatus }]
      )),
      updateMany: jest.fn<() => Promise<{ count: number }>>().mockResolvedValue({ count: 1 }),
      update,
      groupBy: jest.fn<() => Promise<Array<{ statusCode: string; _count: { _all: number } }>>>()
        .mockResolvedValue([{ statusCode: 'sent', _count: { _all: 1 } }]),
    };
    const config = new Map<string, string>([
      ['AUTH_EMAIL_OUTBOX_WORKER_ENABLED', 'true'],
      ['AUTH_EMAIL_SMTP_HOST', 'smtp.example.com'],
      ['AUTH_EMAIL_SMTP_PORT', '587'],
      ['AUTH_EMAIL_SMTP_SECURE', 'false'],
      ['AUTH_EMAIL_SMTP_USERNAME', 'mailer'],
      ['AUTH_EMAIL_SMTP_PASSWORD', 'strong-mail-password'],
      ['AUTH_EMAIL_FROM_ADDRESS', 'no-reply@example.com'],
    ]);
    const worker = new AuthEmailOutboxWorkerService(
      { client: { authEmailOutbox, userPasswordResetChallenge: { findUnique: async () => ({ consumedAt: null, expiresAt: new Date(Date.now() + 60000) }) } } } as never,
      { get: (key: string) => config.get(key) } as never,
    );
    (worker as unknown as { transporter: unknown }).transporter = {
      verify,
      sendMail,
      close: jest.fn(),
    };

    const status = await worker.runOnce('test');

    expect(verify).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: 'no-reply@example.com',
      to: 'launch.user@example.com',
      subject: 'Reset',
    }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ statusCode: 'sent', lastActivity: 'sent' }),
    }));
    expect(status.state).toBe('ready');
    expect(status.recent[0]?.recipient).toBe('la*********@example.com');
  });

  it('reports disabled instead of pretending delivery readiness', async () => {
    const worker = new AuthEmailOutboxWorkerService(
      {
        client: {
          authEmailOutbox: {
            groupBy: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
            findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
          },
        },
      } as never,
      { get: () => undefined } as never,
    );

    const status = await worker.getStatus();

    expect(status.state).toBe('disabled');
    expect(status.reason).toContain('AUTH_EMAIL_OUTBOX_WORKER_ENABLED=false');
  });

  it('accepts Joi-coerced boolean and numeric configuration values', async () => {
    const authEmailOutbox = {
      groupBy: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
      findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
    };
    const config = new Map<string, unknown>([
      ['AUTH_EMAIL_OUTBOX_WORKER_ENABLED', true],
      ['AUTH_EMAIL_OUTBOX_INTERVAL_MS', 45_000],
      ['AUTH_EMAIL_OUTBOX_BATCH_LIMIT', 12],
      ['AUTH_EMAIL_SMTP_HOST', 'smtp.example.com'],
      ['AUTH_EMAIL_SMTP_PORT', 587],
      ['AUTH_EMAIL_SMTP_SECURE', false],
      ['AUTH_EMAIL_SMTP_USERNAME', 'mailer'],
      ['AUTH_EMAIL_SMTP_PASSWORD', 'strong-mail-password'],
      ['AUTH_EMAIL_FROM_ADDRESS', 'no-reply@example.com'],
    ]);
    const worker = new AuthEmailOutboxWorkerService(
      { client: { authEmailOutbox, userPasswordResetChallenge: { findUnique: async () => ({ consumedAt: null, expiresAt: new Date(Date.now() + 60000) }) } } } as never,
      { get: (key: string) => config.get(key) } as never,
    );

    const status = await worker.getStatus();

    expect(status.workerEnabled).toBe(true);
    expect(status.configured).toBe(true);
    expect(status.intervalMs).toBe(45_000);
    expect(status.batchLimit).toBe(12);
    expect(status.state).toBe('blocked');
    expect(status.reason).toContain('verification has not completed');
  });
});
