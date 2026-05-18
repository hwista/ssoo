import { Injectable } from '@nestjs/common';
import type { CommonNotificationItem } from '@ssoo/types/common';
import type { Notification } from '@ssoo/types/cms';
import { DatabaseService } from '../../../database/database.service.js';
import { CommonNotificationService } from '../../common/notification/notification.service.js';
import type { FindNotificationsDto } from './dto/notification.dto.js';

@Injectable()
export class NotificationService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notificationService: CommonNotificationService,
  ) {}

  async findAll(recipientUserId: bigint, params: FindNotificationsDto) {
    await this.migrateLegacyNotifications(recipientUserId);

    const result = await this.notificationService.findAll(recipientUserId, {
      page: params.page,
      pageSize: params.pageSize,
      unreadOnly: params.unreadOnly,
      sourceApp: 'cms',
    });

    return {
      data: result.items.map((item) => this.toCmsNotification(item)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  async markAsRead(id: bigint, recipientUserId: bigint) {
    const notification = await this.notificationService.markAsRead(id, recipientUserId, 'cms');
    await this.markLegacyNotificationRead(notification, recipientUserId);
    return this.toCmsNotification(notification);
  }

  async markAllAsRead(recipientUserId: bigint) {
    await this.migrateLegacyNotifications(recipientUserId);
    await this.db.client.cmsNotification.updateMany({
      where: { recipientUserId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return this.notificationService.markAllAsRead(recipientUserId, 'cms');
  }

  async getUnreadCount(recipientUserId: bigint) {
    await this.migrateLegacyNotifications(recipientUserId);
    return this.notificationService.getUnreadCount(recipientUserId, 'cms');
  }

  async createNotification(data: {
    recipientUserId: bigint;
    actorUserId: bigint;
    notificationType: string;
    referenceType: string;
    referenceId: bigint;
    message: string;
  }) {
    const notification = await this.notificationService.notifyUser({
      recipientUserId: data.recipientUserId,
      actorUserId: data.actorUserId,
      sourceApp: 'cms',
      notificationType: data.notificationType,
      severity: 'info',
      title: data.message,
      message: data.message,
      reference: {
        type: data.referenceType,
        id: data.referenceId.toString(),
      },
      action: {
        type: 'open-cms-reference',
        label: '열기',
        payload: {
          referenceType: data.referenceType,
          referenceId: data.referenceId.toString(),
        },
      },
    });

    return this.toCmsNotification(notification);
  }

  private async migrateLegacyNotifications(recipientUserId: bigint): Promise<void> {
    const legacyNotifications = await this.db.client.cmsNotification.findMany({
      where: { recipientUserId },
      orderBy: { createdAt: 'asc' },
    });

    for (const legacy of legacyNotifications) {
      await this.notificationService.notifyUser({
        recipientUserId: legacy.recipientUserId,
        actorUserId: legacy.actorUserId,
        sourceApp: 'cms',
        notificationType: legacy.notificationType,
        severity: 'info',
        title: legacy.message,
        message: legacy.message,
        reference: {
          type: legacy.referenceType,
          id: legacy.referenceId.toString(),
        },
        action: {
          type: 'open-cms-reference',
          label: '열기',
          payload: {
            referenceType: legacy.referenceType,
            referenceId: legacy.referenceId.toString(),
          },
        },
        dedupeKey: `cms:legacy:${legacy.id.toString()}`,
        isRead: legacy.isRead,
        readAt: legacy.readAt,
        createdAt: legacy.createdAt,
      });
    }
  }

  private async markLegacyNotificationRead(
    notification: CommonNotificationItem,
    recipientUserId: bigint,
  ): Promise<void> {
    const legacyId = this.getLegacyNotificationId(notification);
    if (!legacyId) {
      return;
    }

    await this.db.client.cmsNotification.updateMany({
      where: {
        id: legacyId,
        recipientUserId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  private getLegacyNotificationId(notification: CommonNotificationItem): bigint | null {
    const legacyKey = notification.dedupeKey?.startsWith('cms:legacy:')
      ? notification.dedupeKey.slice('cms:legacy:'.length)
      : null;

    if (!legacyKey || !/^\d+$/.test(legacyKey)) {
      return null;
    }

    return BigInt(legacyKey);
  }

  private toCmsNotification(notification: CommonNotificationItem): Notification {
    return {
      id: notification.id,
      recipientUserId: notification.recipientUserId,
      actorUserId: notification.actorUserId ?? '',
      notificationType: notification.notificationType as Notification['notificationType'],
      referenceType: notification.reference?.type ?? '',
      referenceId: notification.reference?.id ?? '',
      message: notification.message ?? notification.title,
      isRead: notification.isRead,
      readAt: notification.readAt ?? null,
      createdAt: notification.createdAt,
    };
  }
}
