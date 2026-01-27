// 알림 시스템 통합 내보내기

// 타입 내보내기
export * from './types';

// 이메일 모듈
export {
  sendEmail,
  sendNotificationEmail,
  sendDigestEmail,
  sendTestEmail,
  validateEmailConfig
} from './email';

// Teams 모듈
export {
  sendTeamsMessage,
  sendNotificationToTeams,
  sendDigestToTeams,
  sendTestTeamsMessage,
  sendCustomTeamsMessage,
  validateTeamsConfig
} from './teams';

// 알림 관리자
export {
  createNotification,
  getNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUserPreferences,
  updateUserPreferences,
  getNotificationStats,
  sendDigest,
  // 헬퍼 함수들
  notifyDocumentChanged,
  notifyCommentAdded,
  notifyMention,
  notifyCollaborationInvite,
  notifySystem,
  cleanupOldNotifications
} from './manager';
