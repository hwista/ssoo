import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { ClientSecretCredential } from '@azure/identity';
import nodemailer from 'nodemailer';
import { MailDeliveryService } from '../../src/modules/common/auth/mail-delivery.service.js';
import type { IntegrationRuntime } from '../../src/modules/common/integrations/integration-settings.service.js';

describe('mail provider adapters', () => {
  afterEach(() => jest.restoreAllMocks());
  const runtime = (provider: 'local' | 'smtp' | 'microsoft-graph'): IntegrationRuntime<'mail'> => ({
    config: { provider, enabled: true, fromAddress: 'sender@example.invalid', host: 'smtp.example.invalid', port: 587, tls: 'starttls', username: 'sender', tenantId: 'tenant', clientId: 'client' },
    secret: 'fixture-secret', updatedAt: null, activatedAt: null,
  });
  const message = { messageId: 'fixture-id', toEmail: 'recipient@example.invalid', fromEmail: 'old@example.invalid', subject: 'fixture', bodyText: 'test body' };
  const service = () => new MailDeliveryService({} as never, new ConfigService({ LOCAL_MAIL_ENABLED: 'true' }));

  it('uses the private local SMTP endpoint without releasing mail externally', async () => {
    const sendMail = jest.fn<() => Promise<unknown>>().mockResolvedValue({ accepted: ['recipient@example.invalid'] });
    const create = jest.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail, close: jest.fn() } as never);
    await service().send(runtime('local'), message);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ host: 'mailpit', port: 1025, auth: undefined, ignoreTLS: true }));
  });

  it('requires STARTTLS and uses the active provider sender for company SMTP', async () => {
    const sendMail = jest.fn<() => Promise<unknown>>().mockResolvedValue({ accepted: ['recipient@example.invalid'] });
    const create = jest.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail, close: jest.fn() } as never);
    await service().send(runtime('smtp'), message);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ requireTLS: true, auth: { user: 'sender', pass: 'fixture-secret' } }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: 'sender@example.invalid' }));
  });

  it('sends Graph mail to the configured mailbox and rejects a non-202 response', async () => {
    jest.spyOn(ClientSecretCredential.prototype, 'getToken').mockResolvedValue({ token: 'fixture-access-token', expiresOnTimestamp: Date.now() + 60000 });
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 202 }));
    await service().send(runtime('microsoft-graph'), message);
    expect(fetchMock).toHaveBeenCalledWith('https://graph.microsoft.com/v1.0/users/sender%40example.invalid/sendMail', expect.objectContaining({ method: 'POST', redirect: 'error' }));
    fetchMock.mockResolvedValue(new Response('fixture-rejected', { status: 403 }));
    await expect(service().send(runtime('microsoft-graph'), message)).rejects.toThrow('403');
  });
});
