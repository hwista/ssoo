// Microsoft Teams Webhook 알림 모듈
import {
  Notification,
  NotificationType,
  NOTIFICATION_ICONS,
  NOTIFICATION_LABELS
} from './types';

// Teams 설정 인터페이스
interface TeamsConfig {
  webhookUrl: string;
}

// Teams 전송 결과
interface SendTeamsResult {
  success: boolean;
  error?: string;
}

// Teams Adaptive Card 인터페이스
interface AdaptiveCard {
  type: 'AdaptiveCard';
  $schema: string;
  version: string;
  body: AdaptiveCardElement[];
  actions?: AdaptiveCardAction[];
}

interface AdaptiveCardElement {
  type: string;
  text?: string;
  size?: string;
  weight?: string;
  color?: string;
  wrap?: boolean;
  spacing?: string;
  separator?: boolean;
  columns?: AdaptiveCardColumn[];
  items?: AdaptiveCardElement[];
  facts?: Array<{ title: string; value: string }>;
}

interface AdaptiveCardColumn {
  type: 'Column';
  width: string;
  items: AdaptiveCardElement[];
}

interface AdaptiveCardAction {
  type: string;
  title: string;
  url?: string;
}

// Teams 메시지 페이로드
interface TeamsMessage {
  type: 'message';
  attachments: Array<{
    contentType: 'application/vnd.microsoft.card.adaptive';
    content: AdaptiveCard;
  }>;
}

// 환경 변수에서 Teams 설정 로드
function getDefaultTeamsConfig(): TeamsConfig | null {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;

  if (!webhookUrl) {
    return null;
  }

  return { webhookUrl };
}

// 알림 유형에 따른 색상 (Teams Accent Color)
function getNotificationColor(type: NotificationType): string {
  const colors: Record<NotificationType, string> = {
    document_changed: 'accent',   // 파란색 (기본)
    comment_added: 'good',        // 초록색
    comment_reply: 'accent',      // 파란색
    mention: 'warning',           // 노란색
    collaboration_invite: 'accent', // 파란색
    permission_changed: 'warning',  // 노란색
    system: 'default'             // 기본
  };
  return colors[type] || 'accent';
}

// 알림을 Teams Adaptive Card로 변환
function notificationToAdaptiveCard(
  notification: Notification,
  baseUrl: string = ''
): AdaptiveCard {
  const icon = NOTIFICATION_ICONS[notification.type];
  const label = NOTIFICATION_LABELS[notification.type];

  const card: AdaptiveCard = {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body: [
      // 헤더
      {
        type: 'TextBlock',
        text: `${icon} ${notification.title}`,
        size: 'Large',
        weight: 'Bolder',
        wrap: true
      },
      // 메시지 본문
      {
        type: 'TextBlock',
        text: notification.message,
        wrap: true,
        spacing: 'Medium'
      }
    ],
    actions: []
  };

  // 메타 정보 (FactSet)
  const facts: Array<{ title: string; value: string }> = [];

  if (notification.senderName) {
    facts.push({ title: '보낸 사람', value: notification.senderName });
  }

  if (notification.resourcePath) {
    facts.push({ title: '문서', value: notification.resourcePath });
  }

  facts.push({ title: '유형', value: label });
  facts.push({
    title: '시간',
    value: new Date(notification.createdAt).toLocaleString('ko-KR')
  });

  if (facts.length > 0) {
    card.body.push({
      type: 'FactSet',
      facts,
      spacing: 'Medium',
      separator: true
    });
  }

  // 액션 버튼
  if (notification.actionUrl) {
    card.actions?.push({
      type: 'Action.OpenUrl',
      title: notification.actionLabel || '확인하기',
      url: `${baseUrl}${notification.actionUrl}`
    });
  }

  return card;
}

// Teams 메시지 전송
export async function sendTeamsMessage(
  card: AdaptiveCard,
  config?: TeamsConfig
): Promise<SendTeamsResult> {
  const teamsConfig = config || getDefaultTeamsConfig();

  if (!teamsConfig) {
    console.warn('Teams 설정이 없습니다. TEAMS_WEBHOOK_URL 환경 변수를 확인해주세요.');
    return {
      success: false,
      error: 'Teams 설정이 구성되지 않았어요'
    };
  }

  try {
    const payload: TeamsMessage = {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: card
        }
      ]
    };

    const response = await fetch(teamsConfig.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Teams API 오류: ${response.status} - ${errorText}`);
    }

    console.log('Teams 메시지 전송 성공');

    return { success: true };
  } catch (error) {
    console.error('Teams 메시지 전송 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Teams 전송 중 오류가 발생했어요'
    };
  }
}

// 알림을 Teams로 전송
export async function sendNotificationToTeams(
  notification: Notification,
  config?: TeamsConfig,
  baseUrl: string = ''
): Promise<SendTeamsResult> {
  const card = notificationToAdaptiveCard(notification, baseUrl);
  return sendTeamsMessage(card, config);
}

// 여러 알림을 Teams로 전송 (다이제스트)
export async function sendDigestToTeams(
  notifications: Notification[],
  config?: TeamsConfig,
  baseUrl: string = ''
): Promise<SendTeamsResult> {
  if (notifications.length === 0) {
    return { success: true };
  }

  const card: AdaptiveCard = {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body: [
      {
        type: 'TextBlock',
        text: `📬 ${notifications.length}개의 새 알림`,
        size: 'Large',
        weight: 'Bolder'
      },
      {
        type: 'TextBlock',
        text: `LSWiki에서 ${notifications.length}개의 새 알림이 있어요.`,
        wrap: true,
        spacing: 'Small'
      }
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: '모든 알림 보기',
        url: `${baseUrl}/notifications`
      }
    ]
  };

  // 각 알림 추가 (최대 5개)
  const displayNotifications = notifications.slice(0, 5);

  for (const notification of displayNotifications) {
    const icon = NOTIFICATION_ICONS[notification.type];

    card.body.push({
      type: 'Container',
      separator: true,
      spacing: 'Medium',
      items: [
        {
          type: 'TextBlock',
          text: `${icon} **${notification.title}**`,
          wrap: true
        },
        {
          type: 'TextBlock',
          text: notification.message,
          wrap: true,
          size: 'Small',
          color: 'Default'
        }
      ]
    });
  }

  if (notifications.length > 5) {
    card.body.push({
      type: 'TextBlock',
      text: `... 외 ${notifications.length - 5}개의 알림이 더 있어요`,
      size: 'Small',
      color: 'Accent',
      spacing: 'Medium'
    });
  }

  return sendTeamsMessage(card, config);
}

// Teams 설정 검증
export function validateTeamsConfig(config?: TeamsConfig): { valid: boolean; error?: string } {
  const teamsConfig = config || getDefaultTeamsConfig();

  if (!teamsConfig) {
    return {
      valid: false,
      error: 'TEAMS_WEBHOOK_URL 환경 변수가 설정되지 않았어요'
    };
  }

  // Webhook URL 형식 검증
  try {
    const url = new URL(teamsConfig.webhookUrl);
    // Microsoft Teams Webhook URL 패턴 확인
    const validDomains = [
      'webhook.office.com',
      'outlook.office.com',
      'webhook.office365.com'
    ];

    const isValidDomain = validDomains.some(domain =>
      url.hostname.includes(domain)
    );

    if (!isValidDomain) {
      return {
        valid: false,
        error: '올바른 Teams Webhook URL이 아니에요. Microsoft Teams에서 생성한 Webhook URL을 사용해주세요.'
      };
    }
  } catch {
    return {
      valid: false,
      error: 'Webhook URL 형식이 올바르지 않아요'
    };
  }

  return { valid: true };
}

// 테스트 메시지 전송
export async function sendTestTeamsMessage(config?: TeamsConfig): Promise<SendTeamsResult> {
  const card: AdaptiveCard = {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body: [
      {
        type: 'TextBlock',
        text: '🎉 LSWiki 연결 성공!',
        size: 'Large',
        weight: 'Bolder'
      },
      {
        type: 'TextBlock',
        text: 'Microsoft Teams 알림이 정상적으로 설정되었어요.\n이제 LSWiki에서 발생하는 알림을 Teams로 받아볼 수 있어요!',
        wrap: true,
        spacing: 'Medium'
      },
      {
        type: 'FactSet',
        facts: [
          { title: '서비스', value: 'LSWiki' },
          { title: '연결 시간', value: new Date().toLocaleString('ko-KR') },
          { title: '상태', value: '✅ 정상' }
        ],
        spacing: 'Medium',
        separator: true
      }
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'LSWiki 열기',
        url: '/'
      }
    ]
  };

  return sendTeamsMessage(card, config);
}

// 커스텀 Teams 메시지 전송 (사용자 정의)
export async function sendCustomTeamsMessage(
  title: string,
  message: string,
  options?: {
    actionUrl?: string;
    actionLabel?: string;
    facts?: Array<{ title: string; value: string }>;
  },
  config?: TeamsConfig
): Promise<SendTeamsResult> {
  const card: AdaptiveCard = {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body: [
      {
        type: 'TextBlock',
        text: title,
        size: 'Large',
        weight: 'Bolder',
        wrap: true
      },
      {
        type: 'TextBlock',
        text: message,
        wrap: true,
        spacing: 'Medium'
      }
    ],
    actions: []
  };

  if (options?.facts && options.facts.length > 0) {
    card.body.push({
      type: 'FactSet',
      facts: options.facts,
      spacing: 'Medium',
      separator: true
    });
  }

  if (options?.actionUrl) {
    card.actions?.push({
      type: 'Action.OpenUrl',
      title: options.actionLabel || '열기',
      url: options.actionUrl
    });
  }

  return sendTeamsMessage(card, config);
}
