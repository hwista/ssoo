import { Injectable } from '@nestjs/common';
import type { CommonNotificationDomainEvent, CommonNotificationItem, CommonNotificationSourceApp, CommonNotificationStreamEvent } from '@ssoo/types/common';

export interface NotificationObjectPolicy {
  canReadNotification(item: CommonNotificationItem): Promise<boolean>;
  canReadDomainEvent(userId: bigint, event: CommonNotificationDomainEvent): Promise<boolean>;
}

const STATUS_TITLES: Record<string, string> = {
  'dms.document-access-request.created': '문서 권한 요청',
  'dms.document-access-request.approved': '문서 권한 요청 승인',
  'dms.document-access-request.rejected': '문서 권한 요청 거절',
  'dms.document-access-grant.created': '문서 권한 부여',
  'dms.document-access-grant.updated': '문서 권한 변경',
  'dms.document-access-grant.revoked': '문서 권한 회수',
  'dms.document-ownership.transferred-in': '문서 소유권 이전',
  'dms.document-ownership.transferred-out': '문서 소유권 이전',
};

@Injectable()
export class NotificationObjectPolicyService {
  private readonly policies = new Map<CommonNotificationSourceApp, NotificationObjectPolicy>();

  register(source: 'dms' | 'sns', policy: NotificationObjectPolicy): void {
    this.policies.set(source, policy);
  }

  async protectItem(item: CommonNotificationItem): Promise<CommonNotificationItem> {
    if (item.sourceApp !== 'dms' && item.sourceApp !== 'sns') return item;
    const policy = this.policies.get(item.sourceApp);
    if (policy && await policy.canReadNotification(item)) return item;
    // Keep the recipient's status/read history, but whitelist every returned field.
    // Paths may also occur in action payloads, actor data and dedupe keys.
    return {
      id: item.id, recipientUserId: item.recipientUserId, sourceApp: item.sourceApp,
      notificationType: item.notificationType, severity: item.severity,
      title: STATUS_TITLES[item.notificationType] ?? (item.sourceApp === 'dms' ? '문서 알림' : '게시물 알림'),
      message: '현재 열람 권한이 없어 원문 정보를 표시하지 않습니다.',
      isRead: item.isRead, readAt: item.readAt, archivedAt: item.archivedAt, createdAt: item.createdAt,
      // This legacy migration key contains only the notification ID, not an object reference.
      dedupeKey: item.dedupeKey && /^sns:legacy:[1-9]\d*$/.test(item.dedupeKey) ? item.dedupeKey : undefined,
      ...(item.sourceApp === 'dms' && STATUS_TITLES[item.notificationType] ? {
        action: { type: 'open-dms-settings-section', label: '상태 보기', payload: { section: 'access-requests' } },
      } : {}),
    };
  }

  async protectEvent(userId: bigint, event: CommonNotificationStreamEvent): Promise<CommonNotificationStreamEvent> {
    if (event.notification) return { ...event, notification: await this.protectItem(event.notification) };
    if (!event.domainEvent || (event.sourceApp !== 'dms' && event.sourceApp !== 'sns')) return event;
    const policy = this.policies.get(event.sourceApp);
    if (policy && await policy.canReadDomainEvent(userId, event.domainEvent)) return event;
    // Preserve the refresh event so revoked readers can invalidate old UI data.
    return { ...event, domainEvent: { type: event.domainEvent.type, payload: {} } };
  }
}
