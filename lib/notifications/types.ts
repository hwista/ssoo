// 알림 시스템 타입 정의

// 알림 유형
export type NotificationType =
  | 'document_changed'    // 문서 변경됨
  | 'comment_added'       // 댓글 추가됨
  | 'comment_reply'       // 댓글 답글
  | 'mention'             // 멘션됨
  | 'collaboration_invite' // 협업 초대
  | 'permission_changed'  // 권한 변경됨
  | 'system';             // 시스템 알림

// 알림 채널
export type NotificationChannel = 'in_app' | 'email' | 'teams';

// 알림 우선순위
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// 알림 상태
export type NotificationStatus = 'pending' | 'sent' | 'read' | 'failed';

// 알림 데이터
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  channels: NotificationChannel[];

  // 발신자/수신자
  senderId?: string;
  senderName?: string;
  recipientId: string;
  recipientEmail?: string;

  // 관련 리소스
  resourceType?: 'file' | 'comment' | 'user';
  resourceId?: string;
  resourcePath?: string;

  // 액션 링크
  actionUrl?: string;
  actionLabel?: string;

  // 메타데이터
  metadata?: Record<string, unknown>;

  // 타임스탬프
  createdAt: number;
  sentAt?: number;
  readAt?: number;
  expiresAt?: number;
}

// 알림 생성 입력
export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  recipientId: string;
  recipientEmail?: string;
  senderId?: string;
  senderName?: string;
  resourceType?: 'file' | 'comment' | 'user';
  resourceId?: string;
  resourcePath?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: number;
}

// 사용자 알림 설정
export interface NotificationPreferences {
  userId: string;

  // 채널별 활성화
  channels: {
    in_app: boolean;
    email: boolean;
    teams: boolean;
  };

  // 알림 유형별 설정
  types: {
    [key in NotificationType]: {
      enabled: boolean;
      channels: NotificationChannel[];
    };
  };

  // 이메일 설정
  email?: {
    address: string;
    digestFrequency: 'instant' | 'hourly' | 'daily' | 'weekly';
    quietHoursStart?: string; // "22:00"
    quietHoursEnd?: string;   // "08:00"
  };

  // Teams 설정
  teams?: {
    webhookUrl: string;
  };

  updatedAt: number;
}

// 이메일 템플릿 데이터
export interface EmailTemplateData {
  recipientName: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  senderName?: string;
  resourcePath?: string;
  unsubscribeUrl?: string;
}

// 알림 필터
export interface NotificationFilter {
  userId?: string;
  types?: NotificationType[];
  status?: NotificationStatus[];
  channels?: NotificationChannel[];
  startDate?: number;
  endDate?: number;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}

// 알림 통계
export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byChannel: Record<NotificationChannel, number>;
}

// 알림 이벤트 (훅용)
export interface NotificationEvent {
  type: 'created' | 'sent' | 'read' | 'failed';
  notification: Notification;
  timestamp: number;
}

// 알림 제공자 인터페이스
export interface NotificationProvider {
  name: string;
  channel: NotificationChannel;
  send(notification: Notification): Promise<boolean>;
  validateConfig(): boolean;
}

// 기본 알림 설정
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'userId'> = {
  channels: {
    in_app: true,
    email: false,
    teams: false
  },
  types: {
    document_changed: { enabled: true, channels: ['in_app'] },
    comment_added: { enabled: true, channels: ['in_app'] },
    comment_reply: { enabled: true, channels: ['in_app'] },
    mention: { enabled: true, channels: ['in_app', 'email'] },
    collaboration_invite: { enabled: true, channels: ['in_app', 'email'] },
    permission_changed: { enabled: true, channels: ['in_app'] },
    system: { enabled: true, channels: ['in_app'] }
  },
  updatedAt: Date.now()
};

// 알림 유형별 아이콘
export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  document_changed: '📝',
  comment_added: '💬',
  comment_reply: '↩️',
  mention: '@',
  collaboration_invite: '👥',
  permission_changed: '🔐',
  system: '⚙️'
};

// 알림 유형별 라벨
export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  document_changed: '문서 변경',
  comment_added: '새 댓글',
  comment_reply: '댓글 답글',
  mention: '멘션',
  collaboration_invite: '협업 초대',
  permission_changed: '권한 변경',
  system: '시스템'
};
