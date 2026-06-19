import { Injectable, NotFoundException } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import type { Prisma } from '@ssoo/database';
import type {
  CommonNotificationAction,
  CommonNotificationItem,
  CommonNotificationArchiveResult,
  CommonNotificationJsonValue,
  CommonNotificationListQuery,
  CommonNotificationListResult,
  CommonNotificationSeverity,
  CommonNotificationSourceApp,
  CommonNotificationStreamEvent,
} from '@ssoo/types/common';
import { Observable } from 'rxjs';
import { DatabaseService } from '../../../database/database.service.js';

type CommonNotificationRecord = Awaited<ReturnType<DatabaseService['client']['commonNotification']['findFirstOrThrow']>>;
type NotificationStreamListener = (event: CommonNotificationStreamEvent) => void;

interface NotifyUserInput {
  recipientUserId: bigint;
  actorUserId?: bigint | null;
  sourceApp: CommonNotificationSourceApp;
  notificationType: string;
  severity?: CommonNotificationSeverity;
  title: string;
  message?: string;
  reference?: {
    type?: string;
    id?: string;
    path?: string;
  };
  action?: CommonNotificationAction;
  dedupeKey?: string;
  memo?: string;
  isRead?: boolean;
  readAt?: Date | null;
  createdAt?: Date;
}

function normalizePage(params: CommonNotificationListQuery): { page: number; pageSize: number; skip: number } {
  const pageValue = Number(params.page);
  const pageSizeValue = Number(params.pageSize);
  const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
  const pageSize = Number.isFinite(pageSizeValue) && pageSizeValue > 0 ? Math.min(pageSizeValue, 100) : 20;

  return { page, pageSize, skip: (page - 1) * pageSize };
}

function toJsonObject(value: Prisma.JsonValue | null): Record<string, CommonNotificationJsonValue> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, CommonNotificationJsonValue>;
}

function toInputJson(value: Record<string, CommonNotificationJsonValue> | undefined): Prisma.InputJsonValue | undefined {
  return value
    ? JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
    : undefined;
}

@Injectable()
export class CommonNotificationService {
  private readonly streamListeners = new Map<string, Set<NotificationStreamListener>>();
  private readonly sourceAppStreamListeners = new Map<CommonNotificationSourceApp, Set<NotificationStreamListener>>();
  private readonly globalDomainStreamListeners = new Set<NotificationStreamListener>();

  constructor(private readonly db: DatabaseService) {}

  streamForUser(
    recipientUserId: bigint,
    sourceApp?: CommonNotificationSourceApp,
  ): Observable<MessageEvent> {
    const recipientKey = recipientUserId.toString();

    return new Observable<MessageEvent>((subscriber) => {
      const listener: NotificationStreamListener = (event) => {
        if (sourceApp && event.sourceApp && event.sourceApp !== sourceApp) {
          return;
        }
        subscriber.next({ type: event.type, data: event });
      };

      this.addStreamListener(recipientKey, listener);
      if (sourceApp) {
        this.addSourceAppStreamListener(sourceApp, listener);
      } else {
        this.globalDomainStreamListeners.add(listener);
      }
      subscriber.next({
        type: 'connected',
        data: {
          type: 'connected',
          sourceApp,
          emittedAt: new Date().toISOString(),
        } satisfies CommonNotificationStreamEvent,
      });

      const heartbeatId = setInterval(() => {
        subscriber.next({
          type: 'heartbeat',
          data: {
            type: 'heartbeat',
            sourceApp,
            emittedAt: new Date().toISOString(),
          } satisfies CommonNotificationStreamEvent,
        });
      }, 25000);

      return () => {
        clearInterval(heartbeatId);
        this.removeStreamListener(recipientKey, listener);
        if (sourceApp) {
          this.removeSourceAppStreamListener(sourceApp, listener);
        } else {
          this.globalDomainStreamListeners.delete(listener);
        }
      };
    });
  }

  async findAll(
    recipientUserId: bigint,
    params: CommonNotificationListQuery = {},
  ): Promise<CommonNotificationListResult> {
    const { page, pageSize, skip } = normalizePage(params);
    const where = {
      recipientUserId,
      isActive: true,
      archivedAt: null,
      ...(params.unreadOnly ? { isRead: false } : params.readOnly ? { isRead: true } : {}),
      ...(params.sourceApp ? { sourceAppCode: params.sourceApp } : {}),
      ...(params.notificationType ? { notificationType: params.notificationType } : {}),
    };

    const [items, total] = await Promise.all([
      this.db.client.commonNotification.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.client.commonNotification.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toItem(item)),
      total,
      page,
      pageSize,
    };
  }

  async getUnreadCount(recipientUserId: bigint, sourceApp?: CommonNotificationSourceApp) {
    const count = await this.db.client.commonNotification.count({
      where: {
        recipientUserId,
        isRead: false,
        archivedAt: null,
        isActive: true,
        ...(sourceApp ? { sourceAppCode: sourceApp } : {}),
      },
    });

    return { count };
  }

  async markAsRead(
    notificationId: bigint,
    recipientUserId: bigint,
    sourceApp?: CommonNotificationSourceApp,
  ): Promise<CommonNotificationItem> {
    const notification = await this.db.client.commonNotification.findFirst({
      where: {
        id: notificationId,
        recipientUserId,
        isActive: true,
        ...(sourceApp ? { sourceAppCode: sourceApp } : {}),
      },
    });
    if (!notification) {
      throw new NotFoundException(`Notification ${notificationId.toString()} not found`);
    }

    const updated = await this.db.client.commonNotification.update({
      where: { id: notification.id },
      data: notification.isRead
        ? {}
        : { isRead: true, readAt: new Date() },
    });

    const item = this.toItem(updated);
    this.publishToUser(recipientUserId, {
      type: 'notification-read',
      sourceApp: item.sourceApp,
      notificationId: item.id,
      notification: item,
      emittedAt: new Date().toISOString(),
    });

    return item;
  }

  async markAsUnread(
    notificationId: bigint,
    recipientUserId: bigint,
    sourceApp?: CommonNotificationSourceApp,
  ): Promise<CommonNotificationItem> {
    const notification = await this.db.client.commonNotification.findFirst({
      where: {
        id: notificationId,
        recipientUserId,
        isActive: true,
        archivedAt: null,
        ...(sourceApp ? { sourceAppCode: sourceApp } : {}),
      },
    });
    if (!notification) {
      throw new NotFoundException(`Notification ${notificationId.toString()} not found`);
    }

    const updated = await this.db.client.commonNotification.update({
      where: { id: notification.id },
      data: notification.isRead
        ? { isRead: false, readAt: null }
        : {},
    });

    const item = this.toItem(updated);
    this.publishToUser(recipientUserId, {
      type: 'notification-unread',
      sourceApp: item.sourceApp,
      notificationId: item.id,
      notification: item,
      emittedAt: new Date().toISOString(),
    });

    return item;
  }

  async markAllAsRead(recipientUserId: bigint, sourceApp?: CommonNotificationSourceApp) {
    const result = await this.db.client.commonNotification.updateMany({
      where: {
        recipientUserId,
        isRead: false,
        archivedAt: null,
        isActive: true,
        ...(sourceApp ? { sourceAppCode: sourceApp } : {}),
      },
      data: { isRead: true, readAt: new Date() },
    });

    this.publishToUser(recipientUserId, {
      type: 'notifications-read-all',
      sourceApp,
      readCount: result.count,
      emittedAt: new Date().toISOString(),
    });

    return { count: result.count };
  }

  async markByReferencePathAsRead(
    recipientUserId: bigint,
    referencePath: string,
    sourceApp?: CommonNotificationSourceApp,
  ) {
    const normalizedPath = referencePath.trim();
    if (!normalizedPath) {
      return { count: 0 };
    }

    const notifications = await this.db.client.commonNotification.findMany({
      where: {
        recipientUserId,
        referencePath: normalizedPath,
        isRead: false,
        archivedAt: null,
        isActive: true,
        ...(sourceApp ? { sourceAppCode: sourceApp } : {}),
      },
      select: {
        id: true,
        sourceAppCode: true,
      },
    });

    if (notifications.length === 0) {
      return { count: 0 };
    }

    await this.db.client.commonNotification.updateMany({
      where: {
        id: { in: notifications.map((notification) => notification.id) },
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    const emittedAt = new Date().toISOString();
    for (const notification of notifications) {
      this.publishToUser(recipientUserId, {
        type: 'notification-read',
        sourceApp: notification.sourceAppCode as CommonNotificationSourceApp,
        notificationId: notification.id.toString(),
        emittedAt,
      });
    }

    return { count: notifications.length };
  }

  async archiveByDedupeKey(
    recipientUserId: bigint,
    sourceApp: CommonNotificationSourceApp,
    dedupeKey: string,
  ): Promise<CommonNotificationArchiveResult> {
    const normalizedDedupeKey = dedupeKey.trim();
    if (!normalizedDedupeKey) {
      return { count: 0 };
    }

    const notifications = await this.db.client.commonNotification.findMany({
      where: {
        recipientUserId,
        sourceAppCode: sourceApp,
        dedupeKey: normalizedDedupeKey,
        archivedAt: null,
        isActive: true,
      },
      select: { id: true },
    });

    if (notifications.length === 0) {
      return { count: 0 };
    }

    const archivedAt = new Date();
    await this.db.client.commonNotification.updateMany({
      where: {
        id: { in: notifications.map((notification) => notification.id) },
      },
      data: {
        isRead: true,
        readAt: archivedAt,
        archivedAt,
      },
    });

    for (const notification of notifications) {
      this.publishToUser(recipientUserId, {
        type: 'notification-archived',
        sourceApp,
        notificationId: notification.id.toString(),
        archivedCount: notifications.length,
        emittedAt: new Date().toISOString(),
      });
    }

    return { count: notifications.length };
  }

  async archiveByReferencePathPrefixes(
    sourceApp: CommonNotificationSourceApp,
    pathPrefixes: string[],
  ): Promise<CommonNotificationArchiveResult> {
    const prefixes = Array.from(new Set(
      pathPrefixes
        .map((prefix) => prefix.trim().replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '').replace(/\/+$/, ''))
        .filter(Boolean)
        .map((prefix) => `${prefix}/`),
    ));
    if (prefixes.length === 0) {
      return { count: 0 };
    }

    const notifications = await this.db.client.commonNotification.findMany({
      where: {
        sourceAppCode: sourceApp,
        archivedAt: null,
        isActive: true,
        OR: prefixes.map((prefix) => ({
          referencePath: {
            startsWith: prefix,
          },
        })),
      },
      select: {
        id: true,
        recipientUserId: true,
      },
    });

    if (notifications.length === 0) {
      return { count: 0 };
    }

    const archivedAt = new Date();
    await this.db.client.commonNotification.updateMany({
      where: {
        id: { in: notifications.map((notification) => notification.id) },
      },
      data: {
        isRead: true,
        readAt: archivedAt,
        archivedAt,
      },
    });

    for (const notification of notifications) {
      this.publishToUser(notification.recipientUserId, {
        type: 'notification-archived',
        sourceApp,
        notificationId: notification.id.toString(),
        archivedCount: notifications.length,
        emittedAt: new Date().toISOString(),
      });
    }

    return { count: notifications.length };
  }

  async notifyUser(input: NotifyUserInput): Promise<CommonNotificationItem> {
    const data = this.toCreateData(input);
    const dedupeKey = input.dedupeKey?.trim();

    if (dedupeKey) {
      const notification = await this.db.client.commonNotification.upsert({
        where: {
          ux_cm_notification_m_recipient_dedupe: {
            recipientUserId: input.recipientUserId,
            dedupeKey,
          },
        },
        update: {
          ...data,
          isRead: input.isRead ?? false,
          readAt: input.isRead ? input.readAt ?? new Date() : null,
          archivedAt: null,
        },
        create: data,
      });

      const item = this.toItem(notification);
      this.publishNotification(item);
      return item;
    }

    const notification = await this.db.client.commonNotification.create({ data });
    const item = this.toItem(notification);
    this.publishNotification(item);
    return item;
  }

  async notifyMany(inputs: NotifyUserInput[]): Promise<CommonNotificationItem[]> {
    const notifications: CommonNotificationItem[] = [];
    for (const input of inputs) {
      notifications.push(await this.notifyUser(input));
    }
    return notifications;
  }

  async notifyAllActiveUsers(input: Omit<NotifyUserInput, 'recipientUserId'>): Promise<CommonNotificationItem[]> {
    const users = await this.db.client.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    return this.notifyMany(users.map((user) => ({
      ...input,
      recipientUserId: user.id,
    })));
  }

  publishDomainEvent(
    sourceApp: CommonNotificationSourceApp,
    type: string,
    payload?: Record<string, CommonNotificationJsonValue>,
  ): void {
    this.publishToSourceApp(sourceApp, {
      type: 'domain-event',
      sourceApp,
      domainEvent: {
        type,
        payload,
      },
      emittedAt: new Date().toISOString(),
    });
  }

  private toCreateData(input: NotifyUserInput): Prisma.CommonNotificationCreateInput {
    return {
      recipientUserId: input.recipientUserId,
      actorUserId: input.actorUserId ?? null,
      sourceAppCode: input.sourceApp,
      notificationType: input.notificationType,
      severityCode: input.severity ?? 'info',
      title: input.title,
      message: input.message,
      referenceType: input.reference?.type,
      referenceId: input.reference?.id,
      referencePath: input.reference?.path,
      actionType: input.action?.type,
      actionPayload: toInputJson(input.action?.payload),
      dedupeKey: input.dedupeKey?.trim() || undefined,
      isRead: input.isRead ?? false,
      readAt: input.isRead ? input.readAt ?? new Date() : null,
      createdAt: input.createdAt,
      memo: input.memo,
    };
  }

  private addStreamListener(recipientKey: string, listener: NotificationStreamListener): void {
    const listeners = this.streamListeners.get(recipientKey) ?? new Set<NotificationStreamListener>();
    listeners.add(listener);
    this.streamListeners.set(recipientKey, listeners);
  }

  private removeStreamListener(recipientKey: string, listener: NotificationStreamListener): void {
    const listeners = this.streamListeners.get(recipientKey);
    if (!listeners) {
      return;
    }

    listeners.delete(listener);
    if (listeners.size === 0) {
      this.streamListeners.delete(recipientKey);
    }
  }

  private addSourceAppStreamListener(
    sourceApp: CommonNotificationSourceApp,
    listener: NotificationStreamListener,
  ): void {
    const listeners = this.sourceAppStreamListeners.get(sourceApp) ?? new Set<NotificationStreamListener>();
    listeners.add(listener);
    this.sourceAppStreamListeners.set(sourceApp, listeners);
  }

  private removeSourceAppStreamListener(
    sourceApp: CommonNotificationSourceApp,
    listener: NotificationStreamListener,
  ): void {
    const listeners = this.sourceAppStreamListeners.get(sourceApp);
    if (!listeners) {
      return;
    }

    listeners.delete(listener);
    if (listeners.size === 0) {
      this.sourceAppStreamListeners.delete(sourceApp);
    }
  }

  private publishNotification(notification: CommonNotificationItem): void {
    this.publishToUser(BigInt(notification.recipientUserId), {
      type: 'notification',
      sourceApp: notification.sourceApp,
      notification,
      emittedAt: new Date().toISOString(),
    });
  }

  private publishToUser(recipientUserId: bigint, event: CommonNotificationStreamEvent): void {
    const listeners = this.streamListeners.get(recipientUserId.toString());
    if (!listeners) {
      return;
    }

    for (const listener of listeners) {
      listener(event);
    }
  }

  private publishToSourceApp(sourceApp: CommonNotificationSourceApp, event: CommonNotificationStreamEvent): void {
    const listeners = this.sourceAppStreamListeners.get(sourceApp);
    if (listeners) {
      for (const listener of listeners) {
        listener(event);
      }
    }

    for (const listener of this.globalDomainStreamListeners) {
      listener(event);
    }
  }

  private toItem(notification: CommonNotificationRecord): CommonNotificationItem {
    const actionPayload = toJsonObject(notification.actionPayload);

    return {
      id: notification.id.toString(),
      recipientUserId: notification.recipientUserId.toString(),
      actorUserId: notification.actorUserId?.toString(),
      sourceApp: notification.sourceAppCode as CommonNotificationSourceApp,
      notificationType: notification.notificationType,
      severity: notification.severityCode as CommonNotificationSeverity,
      title: notification.title,
      message: notification.message ?? undefined,
      reference: notification.referenceType || notification.referenceId || notification.referencePath
        ? {
            type: notification.referenceType ?? undefined,
            id: notification.referenceId ?? undefined,
            path: notification.referencePath ?? undefined,
          }
        : undefined,
      action: notification.actionType
        ? {
            type: notification.actionType as CommonNotificationAction['type'],
            payload: actionPayload,
          }
        : undefined,
      dedupeKey: notification.dedupeKey ?? undefined,
      isRead: notification.isRead,
      readAt: notification.readAt?.toISOString(),
      archivedAt: notification.archivedAt?.toISOString(),
      createdAt: notification.createdAt.toISOString(),
    };
  }
}
