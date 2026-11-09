import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientSecretCredential } from '@azure/identity';
import nodemailer from 'nodemailer';
import type { IntegrationProbeResult, LocalMailboxMessage } from '@ssoo/types/common';
import { IntegrationSettingsService, type IntegrationRuntime } from '../integrations/integration-settings.service.js';
import type { UpdateIntegrationSettingsDto } from '../integrations/integration-settings.dto.js';

type MailRuntime = IntegrationRuntime<'mail'>;

@Injectable()
export class MailDeliveryService {
  constructor(private readonly settings: IntegrationSettingsService, private readonly env: ConfigService) {}

  async runtime(): Promise<MailRuntime> { return this.resolve(await this.settings.runtime('mail')); }

  private resolve(runtime: MailRuntime): MailRuntime {
    if (runtime.config.provider !== 'environment') return runtime;
    const port = Number(this.env.get<string>('AUTH_EMAIL_SMTP_PORT') || 587);
    return { ...runtime, secret: this.env.get<string>('AUTH_EMAIL_SMTP_PASSWORD') ?? '', config: {
      ...runtime.config,
      enabled: /^(true|1|yes|on)$/i.test(this.env.get<string>('AUTH_EMAIL_OUTBOX_WORKER_ENABLED') ?? ''),
      host: this.env.get<string>('AUTH_EMAIL_SMTP_HOST') ?? '', port,
      tls: /^(true|1)$/i.test(this.env.get<string>('AUTH_EMAIL_SMTP_SECURE') ?? String(port === 465)) ? 'tls' : 'starttls',
      username: this.env.get<string>('AUTH_EMAIL_SMTP_USERNAME') ?? '',
      fromAddress: this.env.get<string>('AUTH_EMAIL_FROM_ADDRESS') ?? '',
    } };
  }

  configured({ config, secret }: MailRuntime): boolean {
    if (config.provider === 'local') return this.env.get<string>('LOCAL_MAIL_ENABLED') === 'true';
    if (config.provider === 'microsoft-graph') return Boolean(config.tenantId && config.clientId && secret && config.fromAddress);
    return Boolean(config.host && config.fromAddress && (!config.username || secret));
  }

  private transport(runtime: MailRuntime) {
    const { config, secret } = runtime;
    const local = config.provider === 'local';
    return nodemailer.createTransport({
      host: local ? this.env.get<string>('LOCAL_MAIL_SMTP_HOST', 'mailpit') : config.host,
      port: local ? 1025 : config.port,
      secure: !local && config.tls === 'tls', requireTLS: !local && config.tls === 'starttls',
      ignoreTLS: local || config.tls === 'none',
      auth: !local && config.username ? { user: config.username, pass: secret } : undefined,
      connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 30_000,
    });
  }

  private async graphToken(runtime: MailRuntime): Promise<string> {
    const { config, secret } = runtime;
    const credential = new ClientSecretCredential(config.tenantId, config.clientId, secret, { retryOptions: { maxRetries: 0 } });
    const token = await credential.getToken('https://graph.microsoft.com/.default');
    if (!token?.token) throw new Error('Microsoft 인증 토큰 발급 실패');
    return token.token;
  }

  async verify(runtime: MailRuntime): Promise<void> {
    if (!this.configured(runtime)) throw new BadRequestException('메일 연결 설정이 완성되지 않았거나 로컬 수신함이 설치되지 않았습니다.');
    if (runtime.config.provider === 'microsoft-graph') {
      await this.graphToken(runtime);
      return;
    }
    const transport = this.transport(runtime);
    try { await transport.verify(); } finally { transport.close(); }
  }

  async probe(dto: UpdateIntegrationSettingsDto): Promise<IntegrationProbeResult> {
    const runtime = this.resolve(await this.settings.candidate('mail', dto));
    try {
      await this.verify(runtime);
      return { ok: true, checkedAt: new Date().toISOString(), message: runtime.config.provider === 'microsoft-graph' ? 'Microsoft 인증 성공. Mail.Send 권한과 실제 수신은 시험 메일로 확인하세요.' : 'SMTP 연결 확인 완료. 실제 수신은 시험 메일로 확인하세요.' };
    } catch { return { ok: false, checkedAt: new Date().toISOString(), message: '연결을 확인하지 못했습니다. 호스트·포트·TLS·인증 정보와 서버 연결 상태를 확인하세요.' }; }
  }

  async save(dto: UpdateIntegrationSettingsDto, actor: bigint) {
    const runtime = this.resolve(await this.settings.candidate('mail', dto));
    if (runtime.config.enabled) {
      try { await this.verify(runtime); }
      catch { throw new BadRequestException('연결 검증에 실패하여 활성화하지 않았습니다. 설정을 확인하거나 발송을 끈 상태로 저장하세요.'); }
    }
    return this.settings.save('mail', dto, actor);
  }

  async send(runtime: MailRuntime, message: { messageId: string; toEmail: string; subject: string; bodyText: string; fromEmail?: string | null }) {
    const { config } = runtime;
    // A previously queued message must use the newly selected provider's authorized sender.
    const from = config.fromAddress || (config.provider === 'local' ? 'ssoo@local.invalid' : message.fromEmail);
    if (config.provider === 'microsoft-graph') {
      const token = await this.graphToken(runtime);
      const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.fromAddress)}/sendMail`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000),
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: { subject: message.subject, body: { contentType: 'Text', content: message.bodyText }, toRecipients: [{ emailAddress: { address: message.toEmail } }], internetMessageHeaders: [{ name: 'x-ssoo-message-id', value: message.messageId }] } }),
      });
      if (response.status !== 202) throw new ServiceUnavailableException(`Microsoft 메일 요청 실패 (HTTP ${response.status}). 권한과 발신 사서함을 확인하세요.`);
      return;
    }
    const transport = this.transport(runtime);
    try {
      const result = await transport.sendMail({ from: from ?? undefined, to: message.toEmail, subject: message.subject, text: message.bodyText, messageId: `<${message.messageId}@ssoo.local>` });
      if (!result.accepted?.length) throw new ServiceUnavailableException('SMTP 서버가 수신자를 수락하지 않았습니다.');
    } finally { transport.close(); }
  }

  async testMail(to: string) {
    const runtime = await this.runtime();
    if (!runtime.config.enabled) throw new BadRequestException('발송을 활성화한 후 시험 메일을 보내세요.');
    await this.verify(runtime);
    await this.send(runtime, { messageId: crypto.randomUUID(), toEmail: to, subject: 'SSOO 메일 연결 확인', bodyText: '이 메일은 관리자가 요청한 연결 확인용 메일입니다. 로컬 수신함 모드에서는 외부 주소로 전달되지 않습니다.' });
    return { ok: true, checkedAt: new Date().toISOString(), message: runtime.config.provider === 'local' ? '로컬 수신함에 보관했습니다. 외부 전달은 하지 않습니다.' : '발송 서버가 요청을 수락했습니다. 수신자의 사서함에서 최종 도착을 확인하세요.' };
  }

  private async mailbox(path: string): Promise<Record<string, unknown>> {
    if (this.env.get<string>('LOCAL_MAIL_ENABLED') !== 'true') throw new BadRequestException('로컬 수신함이 설치되지 않았습니다.');
    try {
      const response = await fetch(`${this.env.get<string>('LOCAL_MAIL_HTTP_URL', 'http://mailpit:8025')}/api/v1/${path}`, { signal: AbortSignal.timeout(5000), redirect: 'error' });
      if (!response.ok) throw new Error('mailbox unavailable');
      return await response.json() as Record<string, unknown>;
    } catch { throw new ServiceUnavailableException('로컬 수신함에 연결하지 못했습니다. 서비스 상태를 확인하세요.'); }
  }

  async messages(): Promise<LocalMailboxMessage[]> {
    const result = await this.mailbox('messages?limit=50');
    const messages = result.messages as Array<{ ID: string; Subject: string; To: Array<{ Address: string }>; Created: string }>;
    return (messages ?? []).map(m => ({ id: m.ID, subject: m.Subject, to: m.To.map(to => to.Address), createdAt: m.Created }));
  }

  async message(id: string): Promise<LocalMailboxMessage> {
    const result = await this.mailbox(`message/${encodeURIComponent(id)}`) as { ID: string; Subject: string; To: Array<{ Address: string }>; Date: string; Text: string };
    return { id: result.ID, subject: result.Subject, to: result.To.map(to => to.Address), createdAt: result.Date, text: result.Text };
  }
}
