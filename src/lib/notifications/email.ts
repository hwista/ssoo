// 이메일 알림 모듈
import { Notification, EmailTemplateData } from './types';

// 이메일 설정 인터페이스
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    address: string;
  };
}

// 이메일 전송 결과
interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// 환경 변수에서 이메일 설정 로드
function getEmailConfig(): EmailConfig | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromName = process.env.SMTP_FROM_NAME || 'LSWiki';
  const fromAddress = process.env.SMTP_FROM_ADDRESS;

  if (!host || !port || !user || !pass || !fromAddress) {
    return null;
  }

  return {
    host,
    port: parseInt(port, 10),
    secure: parseInt(port, 10) === 465,
    auth: { user, pass },
    from: { name: fromName, address: fromAddress }
  };
}

// HTML 이메일 템플릿 생성
function generateEmailHTML(data: EmailTemplateData): string {
  const {
    recipientName,
    title,
    message,
    actionUrl,
    actionLabel,
    senderName,
    resourcePath,
    unsubscribeUrl
  } = data;

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .email-wrapper {
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
      color: white;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 32px 24px;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 16px;
    }
    .message-box {
      background-color: #f8fafc;
      border-left: 4px solid #3B82F6;
      padding: 16px;
      margin: 20px 0;
      border-radius: 0 4px 4px 0;
    }
    .message-title {
      font-weight: 600;
      font-size: 18px;
      margin-bottom: 8px;
      color: #1e293b;
    }
    .message-text {
      color: #475569;
      margin: 0;
    }
    .meta-info {
      font-size: 14px;
      color: #64748b;
      margin-top: 16px;
    }
    .meta-info span {
      display: inline-block;
      margin-right: 16px;
    }
    .action-button {
      display: inline-block;
      background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
      color: white !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      margin-top: 20px;
      transition: transform 0.2s;
    }
    .action-button:hover {
      transform: translateY(-1px);
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px 24px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
    .footer a {
      color: #3B82F6;
      text-decoration: none;
    }
    .logo {
      font-size: 28px;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-wrapper">
      <div class="header">
        <div class="logo">📚</div>
        <h1>LSWiki</h1>
      </div>

      <div class="content">
        <p class="greeting">안녕하세요, <strong>${recipientName}</strong>님!</p>

        <div class="message-box">
          <div class="message-title">${title}</div>
          <p class="message-text">${message}</p>
        </div>

        <div class="meta-info">
          ${senderName ? `<span>👤 보낸 사람: ${senderName}</span>` : ''}
          ${resourcePath ? `<span>📄 문서: ${resourcePath}</span>` : ''}
        </div>

        ${actionUrl ? `
        <div style="text-align: center; margin-top: 24px;">
          <a href="${actionUrl}" class="action-button">
            ${actionLabel || '확인하기'}
          </a>
        </div>
        ` : ''}
      </div>

      <div class="footer">
        <p>이 이메일은 LSWiki에서 자동으로 발송되었어요.</p>
        ${unsubscribeUrl ? `<p><a href="${unsubscribeUrl}">알림 설정 변경하기</a></p>` : ''}
        <p style="margin-top: 12px;">© ${new Date().getFullYear()} LSWiki. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
}

// 텍스트 이메일 템플릿 생성
function generateEmailText(data: EmailTemplateData): string {
  const {
    recipientName,
    title,
    message,
    actionUrl,
    actionLabel,
    senderName,
    resourcePath
  } = data;

  let text = `안녕하세요, ${recipientName}님!\n\n`;
  text += `${title}\n`;
  text += `${'─'.repeat(40)}\n\n`;
  text += `${message}\n\n`;

  if (senderName) {
    text += `보낸 사람: ${senderName}\n`;
  }
  if (resourcePath) {
    text += `문서: ${resourcePath}\n`;
  }

  if (actionUrl) {
    text += `\n${actionLabel || '확인하기'}: ${actionUrl}\n`;
  }

  text += `\n${'─'.repeat(40)}\n`;
  text += `이 이메일은 LSWiki에서 자동으로 발송되었어요.\n`;

  return text;
}

// 이메일 전송 (Nodemailer 동적 임포트)
export async function sendEmail(
  to: string,
  subject: string,
  templateData: EmailTemplateData
): Promise<SendEmailResult> {
  const config = getEmailConfig();

  if (!config) {
    console.warn('이메일 설정이 없습니다. SMTP 환경 변수를 확인해주세요.');
    return {
      success: false,
      error: 'SMTP 설정이 구성되지 않았어요'
    };
  }

  try {
    // Nodemailer 동적 임포트 (서버사이드에서만 사용)
    const nodemailer = await import('nodemailer');

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth
    });

    const htmlContent = generateEmailHTML(templateData);
    const textContent = generateEmailText(templateData);

    const result = await transporter.sendMail({
      from: `"${config.from.name}" <${config.from.address}>`,
      to,
      subject,
      text: textContent,
      html: htmlContent
    });

    console.log('이메일 전송 성공:', result.messageId);

    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    console.error('이메일 전송 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '이메일 전송 중 오류가 발생했어요'
    };
  }
}

// 알림을 이메일로 전송
export async function sendNotificationEmail(
  notification: Notification,
  recipientEmail: string,
  recipientName: string,
  baseUrl: string = ''
): Promise<SendEmailResult> {
  const templateData: EmailTemplateData = {
    recipientName,
    title: notification.title,
    message: notification.message,
    actionUrl: notification.actionUrl
      ? `${baseUrl}${notification.actionUrl}`
      : undefined,
    actionLabel: notification.actionLabel,
    senderName: notification.senderName,
    resourcePath: notification.resourcePath,
    unsubscribeUrl: `${baseUrl}/settings/notifications`
  };

  const subject = `[LSWiki] ${notification.title}`;

  return sendEmail(recipientEmail, subject, templateData);
}

// 다이제스트 이메일 전송 (여러 알림 묶음)
export async function sendDigestEmail(
  notifications: Notification[],
  recipientEmail: string,
  recipientName: string,
  baseUrl: string = ''
): Promise<SendEmailResult> {
  if (notifications.length === 0) {
    return { success: true };
  }

  const digestItems = notifications.map(n =>
    `• ${n.title}: ${n.message}`
  ).join('\n\n');

  const templateData: EmailTemplateData = {
    recipientName,
    title: `${notifications.length}개의 새 알림이 있어요`,
    message: digestItems,
    actionUrl: `${baseUrl}/notifications`,
    actionLabel: '모든 알림 보기',
    unsubscribeUrl: `${baseUrl}/settings/notifications`
  };

  const subject = `[LSWiki] ${notifications.length}개의 새 알림`;

  return sendEmail(recipientEmail, subject, templateData);
}

// 이메일 설정 검증
export function validateEmailConfig(): { valid: boolean; missing: string[] } {
  const required = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM_ADDRESS'
  ];

  const missing = required.filter(key => !process.env[key]);

  return {
    valid: missing.length === 0,
    missing
  };
}

// 테스트 이메일 전송
export async function sendTestEmail(to: string): Promise<SendEmailResult> {
  const templateData: EmailTemplateData = {
    recipientName: '테스트 사용자',
    title: '테스트 이메일',
    message: 'LSWiki 이메일 알림이 정상적으로 설정되었어요! 🎉',
    actionUrl: '/',
    actionLabel: 'LSWiki 열기'
  };

  return sendEmail(to, '[LSWiki] 테스트 이메일', templateData);
}
