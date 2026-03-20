import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { FindNotificationsDto } from './dto/notification.dto.js';

@Injectable()
export class NotificationService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(recipientUserId: bigint, params: FindNotificationsDto) {
    const pageValue = Number(params.page);
    const pageSizeValue = Number(params.pageSize);
    const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
    const pageSize = Number.isFinite(pageSizeValue) && pageSizeValue > 0 ? pageSizeValue : 20;
    const skip = (page - 1) * pageSize;

    const where = {
      recipientUserId,
      ...(params.unreadOnly && { isRead: false }),
    };

    const [data, total] = await Promise.all([
      this.db.client.chNotification.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.client.chNotification.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async markAsRead(id: bigint, recipientUserId: bigint) {
    const notification = await this.db.client.chNotification.findFirst({
      where: { id, recipientUserId },
    });
    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    return this.db.client.chNotification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(recipientUserId: bigint) {
    const result = await this.db.client.chNotification.updateMany({
      where: { recipientUserId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return { count: result.count };
  }

  async getUnreadCount(recipientUserId: bigint) {
    const count = await this.db.client.chNotification.count({
      where: { recipientUserId, isRead: false },
    });

    return { count };
  }

  async createNotification(data: {
    recipientUserId: bigint;
    actorUserId: bigint;
    notificationType: string;
    referenceType: string;
    referenceId: bigint;
    message: string;
  }) {
    return this.db.client.chNotification.create({ data });
  }
}
